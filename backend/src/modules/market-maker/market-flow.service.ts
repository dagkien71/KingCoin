import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import { isQuoteToken } from '@modules/market-maker/liquidity-target-tokens.util';
import {
  flowMatchesBothSidesFromProfile,
  flowPassesPerTickFromProfile,
  flowSweepMaxFillsFromProfile,
} from '@modules/market-maker/flow-activity.util';
import { planAsymmetricFlowSteps } from '@modules/market-maker/flow-market-dynamics.util';
import { TokenDedicatedBotsCatalogService } from '@modules/market-maker/token-dedicated-bots-catalog.service';
import {
  aggregateAskLiquidityInBand,
  aggregateBidLiquidityInBand,
  orderRemainingQty,
  rollTakerChunkQty,
} from '@modules/market-maker/flow-liquidity-sweep.util';
import { setLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import { pricePathDirection } from '@modules/market-maker/orderbook-path.util';
import { spotReachedTarget } from '@modules/market-maker/trade-price-walk.util';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
import { flowTakerBaseQtyFromMarketCap } from '@modules/market-maker/token-mcap-qty.util';
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
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
  ) {}

  private flowIntervalMs(): number {
    return this.platformSettings.getEffective().flowIntervalMs;
  }

  private flowQtyKnob(): number {
    return this.platformSettings.getEffective().flowQty;
  }

  private flowQtyForToken(token: TokenCrypto): number {
    const mmParams = this.mmControl.resolveParams(token.id);
    return flowTakerBaseQtyFromMarketCap(
      token,
      mmParams.qty,
      mmParams.levels,
      this.flowQtyKnob(),
    );
  }

  private takerMaxSlipPct(): number {
    const raw = Number(process.env.MARKET_FLOW_MAX_SLIP_PCT ?? '0.0028');
    if (!Number.isFinite(raw)) return 0.0028;
    return Math.min(0.02, Math.max(0.0003, raw));
  }

  /** Slip ngẫu nhiên mỗi lệnh — fill nhiều mức giá → H/L nến khác nhau. */
  private rollTakerSlipPct(): number {
    const base = this.takerMaxSlipPct();
    return base * (0.4 + Math.random() * 1.5);
  }

  private mmBookTake(): number {
    const raw = Number(process.env.MARKET_FLOW_BOOK_LEVELS ?? '16');
    if (!Number.isFinite(raw)) return 16;
    return Math.min(40, Math.max(4, Math.floor(raw)));
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

    const mmIds = await this.resolveMmUserIds(tokenId);
    const flowUser = await this.resolveFlowUserForTick();
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });

    if (mmIds.length === 0 || !flowUser || !token?.id) return 0;
    if (this.mmControl.shouldProtectSpot(tokenId)) return 0;

    const qtyFlow = this.flowQtyForToken(token);
    let fills = 0;

    for (let i = 0; i < cap; i++) {
      const ok = await this.tryTakerFill(
        mmIds,
        flowUser.id,
        token,
        direction === 'up' ? 'buy' : 'sell',
        rollTakerChunkQty(qtyFlow),
      );
      if (!ok) break;
      fills++;
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

    const mmIds = await this.resolveMmUserIds(tokenId);
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
        rollTakerChunkQty(this.flowQtyForToken(token)),
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
    const slip = this.rollTakerSlipPct();
    const take = this.mmBookTake();

    if (side === 'buy') {
      const sells = await this.prisma.order.findMany({
        where: {
          userId: { in: mmIds },
          tokenId: token.id,
          type: 'sell',
          status: 'pending',
          quantity: { gt: 0 },
        },
        orderBy: { price: 'asc' },
        take,
      });
      const asks = sells
        .map((o) => ({
          price: Number(o.price),
          quantity: orderRemainingQty(
            Number(o.quantity),
            o.matchedQuantity,
          ),
        }))
        .filter((l) => l.price > 0 && l.quantity > 0);
      const { limitPrice, totalQty } = aggregateAskLiquidityInBand(
        asks,
        slip,
      );
      const q = Math.min(qtyFlow, totalQty);
      if (q <= 0 || limitPrice <= 0) return false;
      await this.orderService.create({
        tokenId: token.id,
        type: 'buy',
        price: limitPrice,
        quantity: q,
        pair,
        user: { connect: { id: flowUserId } },
      });
      setLastFlowDirection(token.id, 'up');
      this.logger.debug(
        `Flow: mua chunk @≤${limitPrice} qty=${q} (sổ ${totalQty.toFixed(2)}, ${token.name})`,
      );
      return true;
    }

    const buys = await this.prisma.order.findMany({
      where: {
        userId: { in: mmIds },
        tokenId: token.id,
        type: 'buy',
        status: 'pending',
        quantity: { gt: 0 },
      },
      orderBy: { price: 'desc' },
      take,
    });
    const bids = buys
      .map((o) => ({
        price: Number(o.price),
        quantity: orderRemainingQty(Number(o.quantity), o.matchedQuantity),
      }))
      .filter((l) => l.price > 0 && l.quantity > 0);
    const { limitPrice, totalQty } = aggregateBidLiquidityInBand(bids, slip);
    const q = Math.min(qtyFlow, totalQty);
    if (q <= 0 || limitPrice <= 0) return false;
    await this.orderService.create({
      tokenId: token.id,
      type: 'sell',
      price: limitPrice,
      quantity: q,
      pair,
      user: { connect: { id: flowUserId } },
    });
    setLastFlowDirection(token.id, 'down');
    this.logger.debug(
      `Flow: bán chunk @≥${limitPrice} qty=${q} (sổ ${totalQty.toFixed(2)}, ${token.name})`,
    );
    return true;
  }

  /** Taker: lệch mua/bán — tránh nến đối xứng từng tick. */
  private async runIntraBarProbe(
    mmIds: string[],
    flowUserId: string,
    token: TokenCrypto,
    bothSidesEnabled: boolean,
    baseQty: number,
  ): Promise<void> {
    const steps = planAsymmetricFlowSteps(token.id, bothSidesEnabled);
    if (steps.length === 0) return;
    for (const step of steps) {
      const qty = rollTakerChunkQty(baseQty) * step.qtyScale;
      if (qty <= 1e-8) continue;
      await this.tryTakerFill(mmIds, flowUserId, token, step.side, qty);
    }
  }

  private async runTick(): Promise<void> {
    if (!this.mmControl.isFlowEnabled() || this.runInFlight) return;
    this.runInFlight = true;

    const flowProfile = this.platformSettings.resolveFlowProfile();
    const bothSides = flowMatchesBothSidesFromProfile(flowProfile);
    const passes = flowPassesPerTickFromProfile(flowProfile);

    try {
      const flowUser = await this.resolveFlowUserForTick();
      if (!flowUser) {
        this.logger.warn(
          `Flow: không có user taker — chạy bootstrap bot trong admin`,
        );
        return;
      }

      const token = await this.botCatalog.resolveTokenForBotEmail(
        flowUser.email,
      );
      if (!token?.id || isQuoteToken(token)) return;
      if (this.mmControl.shouldProtectSpot(token.id)) return;

      const mmIds = await this.resolveMmUserIds(token.id);
      if (mmIds.length === 0) {
        this.logger.debug(`Flow: không có MM cho ${token.symbol}`);
        return;
      }

      this.tick++;

      const baseQty = this.flowQtyForToken(token);
      for (let pass = 0; pass < passes; pass++) {
        await this.runIntraBarProbe(
          mmIds,
          flowUser.id,
          token,
          bothSides,
          baseQty,
        );
      }
    } catch (e) {
      this.logger.warn(`Flow tick: ${(e as Error).message}`);
    } finally {
      this.runInFlight = false;
    }
  }

  private async resolveMmUserIds(tokenId: string): Promise<string[]> {
    const emails = this.botCatalog.usesDedicatedPool()
      ? this.botCatalog.getMmEmailsForToken(tokenId)
      : this.botCatalog.getMmEmails();
    if (emails.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });
    return rows
      .filter((r) => this.mmBotRegistry.isBotEnabled(r.email, 'mm'))
      .map((r) => r.id);
  }

  private async resolveFlowUserForTick() {
    const emails = this.botCatalog.getFlowEmails();
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
