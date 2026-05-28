import { setLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import {
  pickProbePattern,
  probeFillCount,
  rollFlowQty,
} from '@modules/market-maker/flow-market-dynamics.util';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveFlowBaseTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import { OrderService } from '@modules/order/order.service';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

const DEFAULT_EMAIL = 'user-bot@kingcoin.local';

@Injectable()
export class UserBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserBotService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private tick = 0;
  private runInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly mmControl: MmControlService,
    private readonly mmBotRegistry: MmBotRegistryService,
  ) {}

  private isEnabled(): boolean {
    if (process.env.USER_BOT_ENABLED === 'false') return false;
    // dev mặc định bật nếu MM đang bật
    if (process.env.USER_BOT_ENABLED === 'true') return true;
    return this.mmControl.isMmEnabled();
  }

  private intervalMs(): number {
    const raw = Number(process.env.USER_BOT_INTERVAL_MS ?? '250');
    if (!Number.isFinite(raw)) return 250;
    return Math.min(10_000, Math.max(80, Math.floor(raw)));
  }

  private qty(): number {
    const raw = Number(process.env.USER_BOT_QTY ?? '2');
    if (!Number.isFinite(raw)) return 2;
    return Math.min(100_000, Math.max(0.0001, raw));
  }

  private async resolveUserId(): Promise<string | null> {
    const email = (process.env.USER_BOT_EMAIL ?? DEFAULT_EMAIL).trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private quotePair(symbol: string | null | undefined): string {
    const base = symbol?.trim() || 'BASE';
    const q = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    return `${base}/${q}`;
  }

  private startLoop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    if (!this.isEnabled()) {
      this.logger.log('User-bot: tắt');
      return;
    }

    const ms = this.intervalMs();
    this.logger.log(`User-bot: interval ${ms}ms`);
    this.intervalHandle = setInterval(() => void this.runTick(), ms);
    setTimeout(() => void this.runTick(), 800);
  }

  onModuleInit(): void {
    this.platformReconfigureHook();
    this.startLoop();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private platformReconfigureHook(): void {
    // dùng lại hook thay đổi interval của market-settings (MM/flow) bằng cách nghe logics bật/tắt global
    // (không cần inject PlatformLiquiditySettingsService để tránh vòng phụ thuộc; interval riêng USER_BOT_*).
    // Nếu admin tắt MM/flow, user-bot cũng dừng theo isEnabled().
    setInterval(() => {
      if (!this.intervalHandle && this.isEnabled()) {
        this.startLoop();
      }
      if (this.intervalHandle && !this.isEnabled()) {
        this.startLoop();
      }
    }, 1500);
  }

  private async runTick(): Promise<void> {
    if (this.runInFlight || !this.isEnabled()) return;
    this.runInFlight = true;

    try {
      const userId = await this.resolveUserId();
      if (!userId) {
        this.logger.warn(
          `User-bot: thiếu user (${process.env.USER_BOT_EMAIL ?? DEFAULT_EMAIL}) — chạy node scripts/ensure-user-bot.js`,
        );
        return;
      }

      // Nếu user-bot bị tắt trong dashboard bots (reuse flow kind), skip.
      const email = (process.env.USER_BOT_EMAIL ?? DEFAULT_EMAIL).trim();
      if (!this.mmBotRegistry.isBotEnabled(email, 'flow')) {
        return;
      }

      const baseQty = this.qty();
      const baseNames = await resolveFlowBaseTokenNames(this.prisma);
      if (baseNames.length === 0) return;

      this.tick++;

      const tokenName = baseNames[this.tick % baseNames.length];
      const token = await this.prisma.tokenCrypto.findFirst({
        where: { name: tokenName },
        select: { id: true, symbol: true, name: true, tokenKind: true },
      });
      if (!token?.id || isQuoteToken(token)) return;
      if (this.mmControl.shouldProtectSpot(token.id)) return;

      const pair = this.quotePair(token.symbol);

      const pattern = pickProbePattern(true);
      const primary = probeFillCount(3);

      const placeAtMarket = async (side: 'buy' | 'sell', qty: number) => {
        const mkt = await this.orderService.getMarketPrice(token.id, side);
        await this.orderService.create({
          tokenId: token.id,
          type: side,
          price: mkt.price,
          quantity: qty,
          pair,
          user: { connect: { id: userId } },
        });
        setLastFlowDirection(token.id, side === 'buy' ? 'up' : 'down');
      };

      if (pattern === 'up_then_retrace') {
        for (let i = 0; i < primary; i++) {
          await placeAtMarket('buy', rollFlowQty(baseQty));
        }
        await placeAtMarket('sell', rollFlowQty(baseQty) * 0.65);
      } else if (pattern === 'down_then_retrace') {
        for (let i = 0; i < primary; i++) {
          await placeAtMarket('sell', rollFlowQty(baseQty));
        }
        await placeAtMarket('buy', rollFlowQty(baseQty) * 0.65);
      } else if (pattern === 'both_sides') {
        await placeAtMarket('buy', rollFlowQty(baseQty));
        await placeAtMarket('sell', rollFlowQty(baseQty));
      } else {
        const side: 'buy' | 'sell' = this.tick % 2 === 1 ? 'buy' : 'sell';
        await placeAtMarket(side, rollFlowQty(baseQty));
      }
    } catch (e) {
      this.logger.debug(
        `User-bot tick: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.runInFlight = false;
    }
  }
}

