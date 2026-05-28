import { setLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import { planAsymmetricFlowSteps } from '@modules/market-maker/flow-market-dynamics.util';
import { rollTakerChunkQty } from '@modules/market-maker/flow-liquidity-sweep.util';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
import { TokenDedicatedBotsCatalogService } from '@modules/market-maker/token-dedicated-bots-catalog.service';
import { userBotBaseQtyFromMarketCap } from '@modules/market-maker/token-mcap-qty.util';
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
    private readonly platformSettings: PlatformLiquiditySettingsService,
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
  ) {}

  private isEnabled(): boolean {
    if (this.botCatalog.usesDedicatedPool()) return false;
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

      const baseNames = await resolveFlowBaseTokenNames(this.prisma);
      if (baseNames.length === 0) return;

      this.tick++;

      const tokenName = baseNames[this.tick % baseNames.length];
      const token = await this.prisma.tokenCrypto.findFirst({
        where: { name: tokenName },
      });
      if (!token?.id || isQuoteToken(token)) return;
      if (this.mmControl.shouldProtectSpot(token.id)) return;

      const mmParams = this.mmControl.resolveParams(token.id);
      const flowKnob = this.platformSettings.getEffective().flowQty;
      const baseQty = userBotBaseQtyFromMarketCap(
        token,
        mmParams.qty,
        mmParams.levels,
        flowKnob,
      );
      const pair = this.quotePair(token.symbol);

      const steps = planAsymmetricFlowSteps(token.id, false);
      if (steps.length === 0) return;

      for (const step of steps) {
        const mkt = await this.orderService.getMarketPrice(token.id, step.side);
        const qty = rollTakerChunkQty(baseQty) * step.qtyScale;
        await this.orderService.create({
          tokenId: token.id,
          type: step.side,
          price: mkt.price,
          quantity: qty,
          pair,
          user: { connect: { id: userId } },
        });
        setLastFlowDirection(token.id, step.side === 'buy' ? 'up' : 'down');
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

