import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveFlowBaseTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import { OrderService } from '@modules/order/order.service';
import { PrismaService } from '@providers/prisma';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TokenCrypto } from '@prisma/client';

/**
 * Bot taker: user riêng luân phiên **mua từ lệnh bán MM** và **bán vào lệnh mua MM**
 * → khớp lệnh liên tục (không dùng cùng userId với MM).
 *
 * Chuẩn bị: `node scripts/ensure-flow-trader-user.js`
 *
 * Bật: cùng logic MM (`MARKET_MAKER_ENABLED` / dev mặc định). Tắt riêng: `MARKET_FLOW_ENABLED=false`.
 */
@Injectable()
export class MarketFlowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketFlowService.name);
  private tick = 0;
  private intervalHandle: NodeJS.Timeout | null = null;
  private runInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly mmControl: MmControlService,
  ) {}

  private flowIntervalMs(): number {
    const raw = Number(process.env.MARKET_FLOW_INTERVAL_MS ?? '1500');
    return Math.max(300, Number.isFinite(raw) ? raw : 1500);
  }

  private flowQty(): number {
    const raw = Number(process.env.MARKET_FLOW_QTY ?? '8');
    return Math.max(0.0001, Number.isFinite(raw) ? raw : 8);
  }

  private quotePair(token: TokenCrypto): string {
    const sym = token.symbol ?? 'BASE';
    const q = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    return `${sym}/${q}`;
  }

  onModuleInit(): void {
    if (!this.mmControl.isFlowEnabled()) return;

    const ms = this.flowIntervalMs();
    this.logger.log(`Market flow (taker): interval ${ms}ms`);

    setTimeout(() => void this.runTick(), 600);

    this.intervalHandle = setInterval(() => {
      void this.runTick();
    }, ms);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runTick(): Promise<void> {
    if (!this.mmControl.isFlowEnabled() || this.runInFlight) return;
    this.runInFlight = true;

    const mmEmail =
      process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';
    const flowEmail = process.env.MARKET_FLOW_EMAIL ?? 'flow@kingcoin.local';
    const qtyFlow = this.flowQty();

    try {
      const [mmUser, flowUser] = await Promise.all([
        this.prisma.user.findFirst({ where: { email: mmEmail } }),
        this.prisma.user.findFirst({ where: { email: flowEmail } }),
      ]);

      if (!mmUser) {
        this.logger.debug(`Flow: không có MM ${mmEmail}`);
        return;
      }
      if (!flowUser) {
        this.logger.warn(
          `Flow: không có user ${flowEmail} — chạy node scripts/ensure-flow-trader-user.js`,
        );
        return;
      }

      this.tick++;
      const buyTurn = this.tick % 2 === 1;

      const baseNames = await resolveFlowBaseTokenNames(this.prisma);
      for (const tokenName of baseNames) {
        const token = await this.prisma.tokenCrypto.findFirst({
          where: { name: tokenName },
        });
        if (!token?.id) continue;
        if (isQuoteToken(token)) continue;

        if (this.mmControl.shouldProtectSpot(token.id)) {
          continue;
        }

        const pair = this.quotePair(token);

        if (buyTurn) {
          const bestSell = await this.prisma.order.findFirst({
            where: {
              userId: mmUser.id,
              tokenId: token.id,
              type: 'sell',
              status: 'pending',
              quantity: { gt: 0 },
            },
            orderBy: { price: 'asc' },
          });
          if (!bestSell) continue;

          const q = Math.min(qtyFlow, bestSell.quantity);
          if (q <= 0) continue;

          await this.orderService.create({
            tokenId: token.id,
            type: 'buy',
            price: bestSell.price,
            quantity: q,
            pair,
            user: { connect: { id: flowUser.id } },
          });
          this.logger.debug(
            `Flow: mua từ MM sell @${bestSell.price} qty=${q} (${token.name})`,
          );
        } else {
          const bestBuy = await this.prisma.order.findFirst({
            where: {
              userId: mmUser.id,
              tokenId: token.id,
              type: 'buy',
              status: 'pending',
              quantity: { gt: 0 },
            },
            orderBy: { price: 'desc' },
          });
          if (!bestBuy) continue;

          const q = Math.min(qtyFlow, bestBuy.quantity);
          if (q <= 0) continue;

          await this.orderService.create({
            tokenId: token.id,
            type: 'sell',
            price: bestBuy.price,
            quantity: q,
            pair,
            user: { connect: { id: flowUser.id } },
          });
          this.logger.debug(
            `Flow: bán vào MM buy @${bestBuy.price} qty=${q} (${token.name})`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Flow tick: ${(e as Error).message}`);
    } finally {
      this.runInFlight = false;
    }
  }
}
