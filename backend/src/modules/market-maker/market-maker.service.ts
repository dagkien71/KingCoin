import { OrderService } from '@modules/order/order.service';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import { pathBookRefreshMinPct } from '@modules/market-maker/orderbook-path.util';
import { MarketFlowService } from '@modules/market-maker/market-flow.service';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import { TokenDedicatedBotsCatalogService } from '@modules/market-maker/token-dedicated-bots-catalog.service';
import { mmLevelQuantity } from '@modules/market-maker/mm-params.util';
import {
  mmWanderScale,
  mmWavePeriodMs,
} from '@modules/market-maker/gbm-pace.util';
import { getLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
import { mmBaseQtyFromMarketCap } from '@modules/market-maker/token-mcap-qty.util';
import {
  isQuoteToken,
  resolveMmTargetTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import { PrismaService } from '@providers/prisma';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TokenCrypto, User } from '@prisma/client';

/**
 * Market maker đơn giản: một user riêng treo nhiều lệnh giới hạn hai phía quanh giá niêm yết.
 * Engine khớp lệnh bỏ qua cặp cùng userId — MM phải là user khác trader.
 *
 * Bật:
 * - Production: MARKET_MAKER_ENABLED=true
 * - Dev local: mặc định BẬT nếu không set; tắt bằng MARKET_MAKER_ENABLED=false
 *
 * User: node scripts/ensure-market-maker-user.js
 */
@Injectable()
export class MarketMakerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketMakerService.name);
  private refreshInFlight = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly realtimeService: RealtimeService,
    private readonly mmControl: MmControlService,
    private readonly tokenCryptoService: TokenCryptoService,
    private readonly marketFlow: MarketFlowService,
    private readonly mmBotRegistry: MmBotRegistryService,
    private readonly platformSettings: PlatformLiquiditySettingsService,
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
  ) {}

  /** Gọi từ admin — refresh sổ lệnh mọi token MM. */
  async triggerRefresh(): Promise<void> {
    await this.refreshLiquidity();
  }

  /** Refresh một bot MM (admin). */
  async triggerRefreshForBot(email: string): Promise<void> {
    if (!this.mmControl.isMmEnabled()) return;
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || !this.mmBotRegistry.isBotEnabled(email, 'mm')) return;

    const assign = this.botCatalog.getAssignment(email);
    const token = assign
      ? await this.prisma.tokenCrypto.findUnique({
          where: { id: assign.tokenId },
        })
      : null;
    if (!token?.id || isQuoteToken(token)) return;
    if (this.mmControl.isTokenPaused(token.id)) return;

    const mmUsers = await this.resolveMmUsersForToken(token.id);
    const mmIndex = mmUsers.findIndex((u) => u.id === user.id);
    if (mmIndex < 0) return;
    const params = this.mmControl.resolveParams(token.id);
    try {
      await this.mmBotRegistry.cancelPendingOrdersForUser(user.id, token.id);
      await this.refreshLiquidityForToken(
        user,
        token,
        params,
        mmIndex,
        mmUsers.length,
      );
      this.mmBotRegistry.recordRefresh(user.id, true);
    } catch (e) {
      this.mmBotRegistry.recordRefresh(user.id, false, (e as Error).message);
      throw e;
    }
  }

  /** Refresh MM chỉ một token (theo id). */
  async triggerRefreshForToken(tokenId: string): Promise<void> {
    if (!this.mmControl.isMmEnabled()) {
      return;
    }
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });
    if (!token?.id || isQuoteToken(token)) {
      return;
    }
    if (this.mmControl.isTokenPaused(token.id)) {
      return;
    }
    const mmUsers = await this.resolveMmUsersForToken(token.id);
    if (mmUsers.length === 0) {
      return;
    }
    const params = this.mmControl.resolveParams(token.id);
    await this.pruneDisabledBotOrders(token.id);
    const n = mmUsers.length;
    for (let i = 0; i < n; i++) {
      const user = mmUsers[i];
      try {
        await this.mmBotRegistry.cancelPendingOrdersForUser(user.id, token.id);
        await this.refreshLiquidityForToken(user, token, params, i, n);
        this.mmBotRegistry.recordRefresh(user.id, true);
      } catch (e) {
        this.mmBotRegistry.recordRefresh(user.id, false, (e as Error).message);
      }
    }
  }

  private async resolveAllMmUsers(): Promise<User[]> {
    const emails = this.botCatalog.getMmEmails();
    if (emails.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const byEmail = new Map(rows.map((u) => [u.email, u]));
    return emails.map((e) => byEmail.get(e)).filter((u): u is User => !!u);
  }

  private async resolveMmUsersForToken(tokenId: string): Promise<User[]> {
    const emails = this.botCatalog.usesDedicatedPool()
      ? this.botCatalog.getMmEmailsForToken(tokenId)
      : this.botCatalog.getMmEmails();
    if (emails.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const byEmail = new Map(rows.map((u) => [u.email, u]));
    return emails
      .map((e) => byEmail.get(e))
      .filter((u): u is User => !!u)
      .filter((u) => this.mmBotRegistry.isBotEnabled(u.email, 'mm'));
  }

  private async resolveMmUsers(): Promise<User[]> {
    const all = await this.resolveAllMmUsers();
    return all.filter((u) => this.mmBotRegistry.isBotEnabled(u.email, 'mm'));
  }

  private async pruneDisabledBotOrders(tokenId: string): Promise<void> {
    const all = await this.resolveAllMmUsers();
    for (const user of all) {
      if (!this.mmBotRegistry.isBotEnabled(user.email, 'mm')) {
        await this.mmBotRegistry.cancelPendingOrdersForUser(user.id, tokenId);
      }
    }
  }

  private multiMidStep(): number {
    return this.platformSettings.getEffective().multiMidStep;
  }

  /** Hủy mọi lệnh MM đang treo (pending) cho một token — trước khi đổi giá đột ngột. */
  async cancelPendingOrdersForToken(tokenId: string): Promise<number> {
    const n = await this.mmControl.cancelPendingOrdersForToken(tokenId);
    if (n > 0) {
      this.logger.log(
        `MM: hủy ${n} lệnh chờ token=${tokenId} (đổi giá / combo)`,
      );
    }
    return n;
  }

  private quotePairSuffix(): string {
    return process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
  }

  private refreshIntervalMs(): number {
    return this.platformSettings.getEffective().mmIntervalMs;
  }

  private startRefreshLoop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (!this.mmControl.isMmEnabled()) {
      this.logger.log('MM: tắt — không chạy interval');
      return;
    }
    const intervalMs = this.refreshIntervalMs();
    this.logger.log(`MM: interval ${intervalMs}ms`);
    this.intervalHandle = setInterval(() => {
      void this.refreshLiquidity();
    }, intervalMs);
  }

  /** Gọi khi admin đổi cài đặt tốc độ MM. */
  reconfigureLoop(): void {
    this.startRefreshLoop();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private priceTick(referencePrice: number): number {
    if (!referencePrice || referencePrice <= 0) return 0.0001;
    const relative = referencePrice / 2000;
    return Math.max(1e-8, Math.min(relative, referencePrice / 50));
  }

  private roundToTick(price: number, tick: number): number {
    if (tick <= 0) return Number(price.toFixed(8));
    return Number((Math.round(price / tick) * tick).toFixed(8));
  }

  private clampMidStep(
    candidate: number,
    baseMid: number,
    maxStepPct: number,
  ): number {
    if (baseMid <= 0 || maxStepPct <= 0) return candidate;
    const maxDelta = baseMid * maxStepPct;
    const delta = candidate - baseMid;
    if (Math.abs(delta) <= maxDelta) return candidate;
    return Number((baseMid + Math.sign(delta) * maxDelta).toFixed(8));
  }

  private async resolveBookMid(tokenId: string, spot: number): Promise<number> {
    const [bestBuy, bestSell] = await Promise.all([
      this.prisma.order.findFirst({
        where: {
          tokenId,
          type: 'buy',
          status: 'pending',
          quantity: { gt: 0 },
        },
        orderBy: { price: 'desc' },
        select: { price: true },
      }),
      this.prisma.order.findFirst({
        where: {
          tokenId,
          type: 'sell',
          status: 'pending',
          quantity: { gt: 0 },
        },
        orderBy: { price: 'asc' },
        select: { price: true },
      }),
    ]);
    const bid = bestBuy?.price;
    const ask = bestSell?.price;
    if (bid != null && ask != null && bid > 0 && ask > 0 && bid < ask) {
      return Number(((bid + ask) / 2).toFixed(8));
    }
    return spot;
  }

  async onModuleInit(): Promise<void> {
    this.platformSettings.onIntervalsChanged(() => this.reconfigureLoop());

    this.mmControl.registerPathBookRefreshHook((tokenId, target) =>
      this.onPathTargetBookRefresh(tokenId, target),
    );

    await this.botCatalog.whenReady();

    if (!this.mmControl.isMmEnabled()) {
      this.logger.log('MM: tắt — không chạy interval');
      return;
    }

    this.logger.log('MM: enabled (cron 45s dự phòng)');
    void this.refreshLiquidity();
    this.startRefreshLoop();
  }

  /** PP1/PP2: refresh sổ + sweep khi target path lệch đủ so với lần treo sổ trước. */
  private async onPathTargetBookRefresh(
    tokenId: string,
    target: number,
  ): Promise<void> {
    if (!this.mmControl.hasActivePathDriver(tokenId)) return;

    const last =
      this.mmControl.getLastPathBookMid(tokenId) ??
      this.mmControl.getMid(tokenId) ??
      target;
    const pct = Math.abs(target - last) / Math.max(last, 1e-12);
    if (pct < pathBookRefreshMinPct()) return;

    this.mmControl.setLastPathBookMid(tokenId, target);
    await this.triggerRefreshForToken(tokenId);

    const run = this.mmControl.getModelRun(tokenId);
    const schedule = this.mmControl.getSchedule(tokenId);
    let from = last;
    if (run?.priceAtStart) from = run.priceAtStart;
    else if (schedule?.priceAtStart) from = schedule.priceAtStart;
    const direction = target >= from ? 'up' : 'down';
    await this.marketFlow.sweepAlongPath(tokenId, direction);
    await this.marketFlow.sweepUntilSpotReaches(tokenId, direction, target, {
      maxFills: 80,
      epsPct: 0.00005,
    });
  }

  /** Mặc định 45 giây / lần — @Cron phải literal. */
  @Cron('*/45 * * * * *')
  async refreshLiquidity(): Promise<void> {
    if (!this.mmControl.isMmEnabled()) {
      return;
    }

    if (this.refreshInFlight) {
      return;
    }
    this.refreshInFlight = true;

    try {
      await this.botCatalog.whenReady();
      if (
        this.botCatalog.usesDedicatedPool() &&
        this.botCatalog.getTokenGroups().length === 0
      ) {
        this.logger.warn(
          'Market maker: chưa có token base — seed token rồi bootstrap bot',
        );
        return;
      }
      if (!this.botCatalog.usesDedicatedPool()) {
        const mmUsers = await this.resolveMmUsers();
        if (mmUsers.length === 0) {
          this.logger.warn(
            'Market maker: không có user MM — chạy ensure-liquidity-bots.js',
          );
          return;
        }
      }

      let anyToken = false;

      if (this.botCatalog.usesDedicatedPool()) {
        for (const g of this.botCatalog.getTokenGroups()) {
          const token = await this.prisma.tokenCrypto.findUnique({
            where: { id: g.tokenId },
          });
          if (!token?.id || isQuoteToken(token)) continue;
          if (this.mmControl.isTokenPaused(token.id)) continue;
          anyToken = true;
          const params = this.mmControl.resolveParams(token.id);
          await this.pruneDisabledBotOrders(token.id);
          const tokenMmUsers = await this.resolveMmUsersForToken(token.id);
          const n = tokenMmUsers.length;
          for (let i = 0; i < n; i++) {
            const user = tokenMmUsers[i];
            try {
              await this.mmBotRegistry.cancelPendingOrdersForUser(
                user.id,
                token.id,
              );
              await this.refreshLiquidityForToken(user, token, params, i, n, {
                deferMatch: true,
              });
              this.mmBotRegistry.recordRefresh(user.id, true);
            } catch (e) {
              this.mmBotRegistry.recordRefresh(
                user.id,
                false,
                (e as Error).message,
              );
              this.logger.warn(
                `MM refresh lỗi ${user.email} (${token.symbol}): ${
                  (e as Error).message
                }`,
              );
            }
          }
          if (n > 0) {
            await this.orderService.matchOrders(token.id);
            this.realtimeService.broadcastOrderbook(token.id);
          }
        }
      } else {
        const mmUsers = await this.resolveMmUsers();
        const tokenNames = new Set(
          await resolveMmTargetTokenNames(this.prisma),
        );
        for (const id of this.mmControl.getOverrideTokenIds()) {
          const t = await this.prisma.tokenCrypto.findUnique({
            where: { id },
            select: { name: true, symbol: true, tokenKind: true },
          });
          if (t?.name && !isQuoteToken(t)) tokenNames.add(t.name);
        }
        for (const tokenName of tokenNames) {
          const token = await this.prisma.tokenCrypto.findFirst({
            where: { name: tokenName },
          });
          if (!token?.id) continue;
          if (isQuoteToken(token)) continue;
          if (this.mmControl.isTokenPaused(token.id)) continue;
          anyToken = true;
          const params = this.mmControl.resolveParams(token.id);
          await this.pruneDisabledBotOrders(token.id);
          const n = mmUsers.length;
          for (let i = 0; i < n; i++) {
            const user = mmUsers[i];
            try {
              await this.mmBotRegistry.cancelPendingOrdersForUser(
                user.id,
                token.id,
              );
              await this.refreshLiquidityForToken(user, token, params, i, n);
              this.mmBotRegistry.recordRefresh(user.id, true);
            } catch (e) {
              this.mmBotRegistry.recordRefresh(
                user.id,
                false,
                (e as Error).message,
              );
            }
          }
        }
      }

      if (!anyToken) {
        this.logger.warn(
          `Market maker: không có token base — seed token hoặc chạy bootstrap bot`,
        );
      }
    } catch (e) {
      this.logger.error(`Market maker lỗi: ${(e as Error).message}`);
    } finally {
      this.refreshInFlight = false;
    }
  }

  private async refreshLiquidityForToken(
    mmUser: User,
    token: TokenCrypto,
    params: {
      levels: number;
      spreadStep: number;
      qty: number;
      oscillatePct: number;
      levelJitterPct: number;
      wanderPct: number;
    },
    mmIndex = 0,
    mmTotal = 1,
    opts?: { deferMatch?: boolean },
  ): Promise<void> {
    const { levels, spreadStep, qty, oscillatePct, levelJitterPct, wanderPct } =
      params;
    const symbol = token.symbol ?? 'BASE';
    const quoteSym = this.quotePairSuffix();
    if (isQuoteToken(token)) {
      return;
    }
    const pair = `${symbol}/${quoteSym}`;

    const fresh = await this.prisma.tokenCrypto.findUnique({
      where: { id: token.id },
      select: { price: true, volumes: true },
    });
    const baseMid =
      fresh?.price && fresh.price > 0
        ? fresh.price
        : token.price && token.price > 0
        ? token.price
        : 1;
    const tick = this.priceTick(baseMid);
    const pathMid = this.mmControl.getPathMid(token.id);
    const spotAnchor = this.mmControl.getSpotAnchor(token.id);
    let mid: number;
    let modeLabel = 'thường';

    const pricing = this.platformSettings.resolvePricingProfile();
    const pathActive = this.mmControl.hasActivePathDriver(token.id);

    if (pathMid != null) {
      mid = pathMid;
      modeLabel = 'đường giá';
    } else if (pathActive) {
      const waveMs = mmWavePeriodMs(oscillatePct);
      const t = Date.now() / waveMs;
      const drift =
        oscillatePct * Math.sin(t) +
        oscillatePct * 0.35 * Math.sin(t * 2.31 + 0.7);
      mid = this.mmControl.getInitialMid(token.id, baseMid, drift);
      const wander =
        (Math.random() * 2 - 1) * wanderPct * mmWanderScale(oscillatePct);
      mid = mid * (1 + wander) * 0.65 + baseMid * (1 + drift) * 0.35;
      mid = this.mmControl.finalizeMid(token.id, mid, baseMid);
      modeLabel = 'lịch/mô hình';
    } else if (spotAnchor != null && spotAnchor > 0) {
      mid = spotAnchor;
      mid = this.mmControl.finalizeMid(token.id, mid, baseMid);
      modeLabel = 'neo giá';
    } else {
      mid = await this.resolveBookMid(token.id, baseMid);
      const flowDir = getLastFlowDirection(token.id);
      if (pricing.bookSkewPct > 0 && flowDir) {
        mid =
          flowDir === 'up'
            ? mid * (1 + pricing.bookSkewPct)
            : mid * (1 - pricing.bookSkewPct);
      }
      const microWander = (Math.random() * 2 - 1) * 0.00035;
      mid = mid * (1 + microWander);
      mid = this.clampMidStep(mid, baseMid, pricing.maxMidStepPctPerRefresh);
      mid = this.mmControl.finalizeMid(token.id, mid, baseMid);
      modeLabel = 'khớp lệnh';
    }

    if (mmTotal > 1) {
      const center = (mmTotal - 1) / 2;
      const shiftPct = (mmIndex - center) * this.multiMidStep() * spreadStep;
      mid = mid * (1 + shiftPct);
    }

    const flowKnob = this.platformSettings.getEffective().flowQty;
    const qtyBase = mmBaseQtyFromMarketCap(token, qty, levels, flowKnob);
    for (let i = 1; i <= levels; i++) {
      const offset = spreadStep * i;
      const buyJitter = (Math.random() * 2 - 1) * levelJitterPct;
      const sellJitter = (Math.random() * 2 - 1) * levelJitterPct;
      let buyPrice = this.roundToTick(mid * (1 - offset + buyJitter), tick);
      let sellPrice = this.roundToTick(mid * (1 + offset + sellJitter), tick);

      if (buyPrice <= 0 || sellPrice <= 0) continue;
      if (buyPrice >= sellPrice) {
        buyPrice = this.roundToTick(mid * (1 - offset), tick);
        sellPrice = this.roundToTick(mid * (1 + offset), tick);
      }
      if (buyPrice >= sellPrice) continue;

      const touchBoost = i === 1 ? 1.65 : 1;
      const levelQty = mmLevelQuantity(qtyBase * touchBoost);

      const createOpts = opts?.deferMatch
        ? { deferMatch: true as const }
        : undefined;
      await this.orderService.create(
        {
          tokenId: token.id,
          type: 'buy',
          price: buyPrice,
          quantity: levelQty,
          pair,
          user: { connect: { id: mmUser.id } },
        },
        createOpts,
      );

      await this.orderService.create(
        {
          tokenId: token.id,
          type: 'sell',
          price: sellPrice,
          quantity: levelQty,
          pair,
          user: { connect: { id: mmUser.id } },
        },
        createOpts,
      );
    }

    if (!opts?.deferMatch) {
      this.realtimeService.broadcastOrderbook(token.id);
    }

    const pathWalkActive = this.mmControl.isPathWalkActive(token.id);
    const volumes = fresh?.volumes ?? token.volumes;
    const tickerPrice =
      pathActive || pathWalkActive
        ? spotAnchor != null && spotAnchor > 0
          ? spotAnchor
          : mid
        : baseMid;
    this.realtimeService.emitTickerFast(token.id, {
      price: tickerPrice,
      volumes,
    });

    this.logger.log(
      `MM: ${mmUser.email} — ${token.name} — ${levels} bậc × 2 phía quanh mid=${mid} (DB ${baseMid}, ${modeLabel}) (${pair}), qty≈${qtyBase} (knob ${qty})`,
    );
  }
}
