import {
  flowLiquidityEmails,
  mmLiquidityEmails,
} from '@modules/market-maker/liquidity-bots.util';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveFlowBaseTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import {
  flowMatchesBothSidesFromProfile,
  flowPassesPerTickFromProfile,
  flowSweepMaxFillsFromProfile,
} from '@modules/market-maker/flow-activity.util';
import {
  pickProbePattern,
  probeFillCount,
  rollFlowQty,
  type ProbePattern,
} from '@modules/market-maker/flow-market-dynamics.util';
import { setLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import { pricePathDirection } from '@modules/market-maker/orderbook-path.util';
import { spotReachedTarget } from '@modules/market-maker/trade-price-walk.util';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
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
    private readonly mmBotRegistry: MmBotRegistryService,
    private readonly platformSettings: PlatformLiquiditySettingsService,
  ) {}

  private flowIntervalMs(): number {
    return this.platformSettings.getEffective().flowIntervalMs;
  }

  private flowQty(): number {
    return this.platformSettings.getEffective().flowQty;
  }

  sweepMaxFills(): number {
    return flowSweepMaxFillsFromProfile(
      this.platformSettings.resolveFlowProfile(),
    );
  }

  private startFlowLoop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (!this.mmControl.isFlowEnabled()) {
      this.logger.log('Flow: tắt — không chạy interval');
      return;
    }
    const ms = this.flowIntervalMs();
    this.logger.log(`Market flow (taker): interval ${ms}ms`);
    this.intervalHandle = setInterval(() => {
      void this.runTick();
    }, ms);
  }

  reconfigureLoop(): void {
    this.startFlowLoop();
  }

  private quotePair(token: TokenCrypto): string {
    const sym = token.symbol ?? 'BASE';
    const q = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    return `${sym}/${q}`;
  }

  onModuleInit(): void {
    this.platformSettings.onIntervalsChanged(() => this.reconfigureLoop());
    if (!this.mmControl.isFlowEnabled()) return;
    setTimeout(() => void this.runTick(), 600);
    this.startFlowLoop();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Khớp vài lệnh MM theo hướng path (pump → mua ask, dump → bán bid).
   * Gọi từ OrderbookPathService hoặc hook path driver.
   */
  async sweepAlongPath(
    tokenId: string,
    direction: 'up' | 'down',
    maxFills?: number,
  ): Promise<number> {
    const cap = maxFills ?? this.sweepMaxFills();
    if (!this.mmControl.isFlowEnabled() || cap < 1) return 0;

    const qtyFlow = this.flowQty();
    const mmIds = await this.resolveMmUserIds();
    const flowUser = await this.resolveFlowUserForTick();
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });

    if (mmIds.length === 0 || !flowUser || !token?.id) return 0;
    if (this.mmControl.shouldProtectSpot(tokenId)) return 0;

    const pair = this.quotePair(token);
    let fills = 0;

    for (let i = 0; i < cap; i++) {
      if (direction === 'up') {
        const bestSell = await this.prisma.order.findFirst({
          where: {
            userId: { in: mmIds },
            tokenId,
            type: 'sell',
            status: 'pending',
            quantity: { gt: 0 },
          },
          orderBy: { price: 'asc' },
        });
        if (!bestSell) break;
        const q = Math.min(rollFlowQty(qtyFlow), bestSell.quantity);
        if (q <= 0) break;
        await this.orderService.create({
          tokenId,
          type: 'buy',
          price: bestSell.price,
          quantity: q,
          pair,
          user: { connect: { id: flowUser.id } },
        });
        setLastFlowDirection(tokenId, 'up');
        fills++;
      } else {
        const bestBuy = await this.prisma.order.findFirst({
          where: {
            userId: { in: mmIds },
            tokenId,
            type: 'buy',
            status: 'pending',
            quantity: { gt: 0 },
          },
          orderBy: { price: 'desc' },
        });
        if (!bestBuy) break;
        const q = Math.min(rollFlowQty(qtyFlow), bestBuy.quantity);
        if (q <= 0) break;
        await this.orderService.create({
          tokenId,
          type: 'sell',
          price: bestBuy.price,
          quantity: q,
          pair,
          user: { connect: { id: flowUser.id } },
        });
        setLastFlowDirection(tokenId, 'down');
        fills++;
      }
    }

    return fills;
  }

  /**
   * Dùng trade thật để kéo giá tiến dần tới `targetPrice` (best bid/ask = market).
   */
  async sweepUntilSpotReaches(
    tokenId: string,
    direction: 'up' | 'down',
    targetPrice: number,
    opts?: { maxFills?: number; epsPct?: number },
  ): Promise<{ fills: number; reached: boolean }> {
    const maxFills = Math.max(1, Math.min(10_000, opts?.maxFills ?? 200));
    const epsPct = Math.max(1e-9, opts?.epsPct ?? 0.00001);
    if (!this.mmControl.isFlowEnabled() || targetPrice <= 0) {
      return { fills: 0, reached: false };
    }

    const mmIds = await this.resolveMmUserIds();
    const flowUser = await this.resolveFlowUserForTick();
    if (mmIds.length === 0 || !flowUser) {
      return { fills: 0, reached: false };
    }
    if (this.mmControl.shouldProtectSpot(tokenId)) {
      return { fills: 0, reached: false };
    }

    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });
    if (!token?.id || isQuoteToken(token)) {
      return { fills: 0, reached: false };
    }

    let fills = 0;
    for (let i = 0; i < maxFills; i++) {
      const row = await this.prisma.tokenCrypto.findUnique({
        where: { id: tokenId },
        select: { price: true },
      });
      const spot = Number(row?.price ?? 0);
      if (spot > 0 && spotReachedTarget(spot, targetPrice, direction, epsPct)) {
        return { fills, reached: true };
      }

      const ok = await this.tryTakerFill(
        mmIds,
        flowUser.id,
        token,
        direction === 'up' ? 'buy' : 'sell',
        rollFlowQty(this.flowQty()),
      );
      if (!ok) break;
      fills++;
    }

    const finalRow = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
      select: { price: true },
    });
    const finalSpot = Number(finalRow?.price ?? 0);
    const reached =
      finalSpot > 0 &&
      spotReachedTarget(finalSpot, targetPrice, direction, epsPct);
    return { fills, reached };
  }

  /** Sweep theo spot hiện tại → target (tự suy hướng). */
  async sweepTowardPrice(
    tokenId: string,
    targetPrice: number,
    opts?: { maxFills?: number; epsPct?: number },
  ): Promise<{ fills: number; reached: boolean }> {
    const row = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
      select: { price: true },
    });
    const spot = Number(row?.price ?? 0);
    const from = spot > 0 ? spot : targetPrice;
    const dir = pricePathDirection(from, targetPrice);
    return this.sweepUntilSpotReaches(tokenId, dir, targetPrice, opts);
  }

  private async tryTakerFill(
    mmIds: string[],
    flowUserId: string,
    token: TokenCrypto,
    side: 'buy' | 'sell',
    qtyFlow: number,
  ): Promise<boolean> {
    const pair = this.quotePair(token);
    if (side === 'buy') {
      const bestSell = await this.prisma.order.findFirst({
        where: {
          userId: { in: mmIds },
          tokenId: token.id,
          type: 'sell',
          status: 'pending',
          quantity: { gt: 0 },
        },
        orderBy: { price: 'asc' },
      });
      if (!bestSell) return false;
      const q = Math.min(qtyFlow, bestSell.quantity);
      if (q <= 0) return false;
      await this.orderService.create({
        tokenId: token.id,
        type: 'buy',
        price: bestSell.price,
        quantity: q,
        pair,
        user: { connect: { id: flowUserId } },
      });
      setLastFlowDirection(token.id, 'up');
      this.logger.debug(
        `Flow: mua từ MM sell @${bestSell.price} qty=${q} (${token.name})`,
      );
      return true;
    }

    const bestBuy = await this.prisma.order.findFirst({
      where: {
        userId: { in: mmIds },
        tokenId: token.id,
        type: 'buy',
        status: 'pending',
        quantity: { gt: 0 },
      },
      orderBy: { price: 'desc' },
    });
    if (!bestBuy) return false;
    const q = Math.min(qtyFlow, bestBuy.quantity);
    if (q <= 0) return false;
    await this.orderService.create({
      tokenId: token.id,
      type: 'sell',
      price: bestBuy.price,
      quantity: q,
      pair,
      user: { connect: { id: flowUserId } },
    });
    setLastFlowDirection(token.id, 'down');
    this.logger.debug(
      `Flow: bán vào MM buy @${bestBuy.price} qty=${q} (${token.name})`,
    );
    return true;
  }

  /** Probe sổ: ăn nhiều bậc một phía rồi hồi — tạo râu nến từ fill thật. */
  private async runIntraBarProbe(
    mmIds: string[],
    flowUserId: string,
    token: TokenCrypto,
    pattern: ProbePattern,
    maxSweep: number,
    baseQty: number,
  ): Promise<void> {
    const primary = probeFillCount(maxSweep);
    const retrace = Math.max(1, probeFillCount(Math.max(1, maxSweep - 1)));

    const sweepSide = async (
      side: 'buy' | 'sell',
      count: number,
      qtyScale = 1,
    ) => {
      for (let i = 0; i < count; i++) {
        const qty = rollFlowQty(baseQty) * qtyScale;
        const ok = await this.tryTakerFill(
          mmIds,
          flowUserId,
          token,
          side,
          qty,
        );
        if (!ok) break;
      }
    };

    switch (pattern) {
      case 'up_then_retrace':
        await sweepSide('buy', primary, 1);
        await sweepSide('sell', retrace, 0.55 + Math.random() * 0.35);
        break;
      case 'down_then_retrace':
        await sweepSide('sell', primary, 1);
        await sweepSide('buy', retrace, 0.55 + Math.random() * 0.35);
        break;
      case 'both_sides':
        await sweepSide('buy', Math.max(1, Math.ceil(primary / 2)), 0.85);
        await sweepSide('sell', Math.max(1, Math.ceil(retrace / 2)), 0.85);
        break;
      case 'single':
      default: {
        const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
        await sweepSide(side, primary, 1);
        break;
      }
    }
  }

  private async runTick(): Promise<void> {
    if (!this.mmControl.isFlowEnabled() || this.runInFlight) return;
    this.runInFlight = true;

    const baseQty = this.flowQty();
    const flowProfile = this.platformSettings.resolveFlowProfile();
    const bothSides = flowMatchesBothSidesFromProfile(flowProfile);
    const passes = flowPassesPerTickFromProfile(flowProfile);
    const maxSweep = flowSweepMaxFillsFromProfile(flowProfile);

    try {
      const mmIds = await this.resolveMmUserIds();
      const flowUser = await this.resolveFlowUserForTick();

      if (mmIds.length === 0) {
        this.logger.debug(
          `Flow: không có MM — ${mmLiquidityEmails().join(', ')}`,
        );
        return;
      }
      if (!flowUser) {
        this.logger.warn(
          `Flow: không có user taker — chạy node scripts/ensure-liquidity-bots.js`,
        );
        return;
      }

      this.tick++;

      const baseNames = await resolveFlowBaseTokenNames(this.prisma);
      for (let pass = 0; pass < passes; pass++) {
        for (const tokenName of baseNames) {
          const token = await this.prisma.tokenCrypto.findFirst({
            where: { name: tokenName },
          });
          if (!token?.id) continue;
          if (isQuoteToken(token)) continue;

          if (this.mmControl.shouldProtectSpot(token.id)) {
            continue;
          }

          const pattern = pickProbePattern(bothSides);
          await this.runIntraBarProbe(
            mmIds,
            flowUser.id,
            token,
            pattern,
            maxSweep,
            baseQty,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Flow tick: ${(e as Error).message}`);
    } finally {
      this.runInFlight = false;
    }
  }

  private async resolveMmUserIds(): Promise<string[]> {
    const emails = mmLiquidityEmails();
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });
    return rows
      .filter((r) => this.mmBotRegistry.isBotEnabled(r.email, 'mm'))
      .map((r) => r.id);
  }

  private async resolveFlowUserForTick() {
    const emails = flowLiquidityEmails();
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const enabled = rows.filter((u) =>
      this.mmBotRegistry.isBotEnabled(u.email, 'flow'),
    );
    if (enabled.length === 0) return null;
    return enabled[this.tick % enabled.length];
  }
}
