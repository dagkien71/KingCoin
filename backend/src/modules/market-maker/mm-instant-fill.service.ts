import type { OrderService } from '@modules/order/order.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { liquidityBotEmails } from '@modules/market-maker/liquidity-bots.util';
import { PrismaService } from '@providers/prisma';

/**
 * Khi user đặt lệnh đúng giá thị trường (≈ spot / giá market API), MM đặt lệnh đối ứng
 * cùng giá để khớp ngay (không chờ flow interval).
 */
@Injectable()
export class MmInstantFillService {
  private readonly logger = new Logger(MmInstantFillService.name);

  constructor(
    @Inject(
      forwardRef(() => require('../order/order.service').OrderService),
    )
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
    private readonly tokenCryptoService: TokenCryptoService,
  ) {}

  private isEnabled(): boolean {
    if (process.env.MM_INSTANT_FILL_ENABLED === 'false') return false;
    if (process.env.MARKET_MAKER_ENABLED === 'false') return false;
    if (process.env.MARKET_MAKER_ENABLED === 'true') return true;
    return process.env.NODE_ENV !== 'production';
  }

  private tolerancePct(): number {
    const raw = Number(process.env.MM_INSTANT_FILL_TOLERANCE_PCT ?? '0.002');
    return Math.max(1e-6, Number.isFinite(raw) ? raw : 0.002);
  }

  private async isLiquidityBot(userId: string): Promise<boolean> {
    const emails = liquidityBotEmails();
    const bots = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    return bots.some((b) => b.id === userId);
  }

  private isAtMarketPrice(
    orderPrice: number,
    refs: number[],
  ): boolean {
    if (orderPrice <= 0) return false;
    const tol = this.tolerancePct();
    return refs.some((ref) => {
      if (ref <= 0) return false;
      const band = Math.max(ref * tol, 1e-8);
      return Math.abs(orderPrice - ref) <= band;
    });
  }

  /**
   * Gọi sau khi user đặt lệnh và đã chạy matchOrders lần đầu.
   */
  async tryFillUserOrderAtMarket(
    userId: string,
    userOrder: Order,
  ): Promise<void> {
    if (!this.isEnabled()) return;
    if (!userId || await this.isLiquidityBot(userId)) return;
    if (
      userOrder.status !== OrderStatus.pending ||
      Number(userOrder.quantity) <= 0
    ) {
      return;
    }

    const tokenId = userOrder.tokenId;
    const type = userOrder.type as 'buy' | 'sell';
    const orderPrice = Number(userOrder.price);
    const qty = Number(userOrder.quantity);

    const token = await this.tokenCryptoService.findOne(tokenId);
    if (!token) return;

    const spot = Number(token.price ?? 0);
    let bookPrice = spot;
    try {
      const mkt = await this.orderService.getMarketPrice(tokenId, type);
      bookPrice = mkt.price;
    } catch {
      /* dùng spot */
    }

    const refs = [...new Set([spot, bookPrice].filter((p) => p > 0))];
    if (!this.isAtMarketPrice(orderPrice, refs)) {
      return;
    }

    const mmEmail =
      process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';
    const mmUser = await this.prisma.user.findFirst({
      where: { email: mmEmail },
    });
    if (!mmUser || mmUser.id === userId) {
      return;
    }

    const symbol = token.symbol ?? 'BASE';
    const quoteSym = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    if (symbol.toUpperCase() === quoteSym.toUpperCase()) {
      return;
    }

    const pair =
      userOrder.pair ?? `${symbol}/${quoteSym}`;
    const counterType: 'buy' | 'sell' = type === 'buy' ? 'sell' : 'buy';

    const counterData: Prisma.OrderCreateInput = {
      tokenId,
      type: counterType,
      price: orderPrice,
      quantity: qty,
      pair,
      user: { connect: { id: mmUser.id } },
    };

    try {
      await this.orderService.create(counterData);
      this.logger.log(
        `MM khớp ngay: ${counterType} @${orderPrice} qty=${qty} với lệnh user ${type} (${token.name})`,
      );
    } catch (e) {
      this.logger.warn(
        `MM instant fill bỏ qua (${token.name}): ${(e as Error).message}`,
      );
    }
  }
}
