import {
  assertPositiveSpotPrice,
  floorSpotPrice,
} from '../../common/spot-price.util';
import { TokenCryptoLogService } from '@modules/token-crypto/token-log.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { TokenCrypto } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  anchorPathParamsToSpot,
  defaultParamsForModel,
  modelPriceAt,
  modelRunProgress,
  PriceModelId,
  PriceModelParams,
  PriceModelRun,
  PRICE_MODEL_CATALOG,
} from './price-path-models';
import {
  PriceSchedule,
  scheduledPriceAt,
  scheduleProgress,
} from './price-schedule.util';

export type { PriceSchedule, PriceScheduleStatus } from './price-schedule.util';
export type { PriceModelId, PriceModelRun } from './price-path-models';
export { PRICE_MODEL_CATALOG } from './price-path-models';

export type MmGlobalOverride = {
  mmEnabled?: boolean | null;
  flowEnabled?: boolean | null;
  levels?: number | null;
  spreadStep?: number | null;
  qty?: number | null;
  oscillatePct?: number | null;
  wanderPct?: number | null;
  levelJitterPct?: number | null;
};

export type MmTokenOverride = {
  paused?: boolean;
  levels?: number | null;
  spreadStep?: number | null;
  /** Cộng dồn mỗi lần refresh sổ lệnh: mid *= 1 + midBiasPct */
  midBiasPct?: number;
  /** Ép mid sổ lệnh (WS ticker mid); null = bỏ ép */
  forceMid?: number | null;
  /** Kéo mid về giá mục tiêu (blend 35% mỗi refresh) */
  targetPrice?: number | null;
};

export type MmResolvedParams = {
  levels: number;
  spreadStep: number;
  qty: number;
  oscillatePct: number;
  levelJitterPct: number;
  wanderPct: number;
};

@Injectable()
export class MmControlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MmControlService.name);
  private readonly globalOverride: MmGlobalOverride = {};
  private readonly tokenOverrides = new Map<string, MmTokenOverride>();
  private readonly midByToken = new Map<string, number>();
  private readonly schedulesByToken = new Map<string, PriceSchedule>();
  /** Phương pháp 2 — đường giá theo mô hình */
  private readonly modelRunsByToken = new Map<string, PriceModelRun>();
  /** Neo giá sau đặt/nudge thủ công — MM dao động quanh mức này, không kéo về giá cũ */
  private readonly spotAnchorByToken = new Map<string, number>();
  /** Chặn flow / lịch ghi đè giá trong vài giây sau combo ±% */
  private readonly manualLockUntilByToken = new Map<string, number>();
  private scheduleTickHandle: NodeJS.Timeout | null = null;
  private scheduleTickInFlight = false;
  /** Admin walk đang chạy — không neo spotAnchor giữa chừng */
  private readonly pathWalkActive = new Set<string>();
  private readonly lastPathBookMidByToken = new Map<string, number>();
  private readonly pathBookRefreshHooks: Array<
    (tokenId: string, target: number, spot: number) => Promise<void>
  > = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenCryptoService,
    private readonly tokenLogService: TokenCryptoLogService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private mmEmail(): string {
    return process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';
  }

  /** Hủy mọi lệnh MM pending — gọi trước khi đổi giá đột ngột (±%). */
  async cancelPendingOrdersForToken(tokenId: string): Promise<number> {
    const mmUser = await this.prisma.user.findFirst({
      where: { email: this.mmEmail() },
    });
    if (!mmUser) return 0;

    const del = await this.prisma.order.deleteMany({
      where: {
        userId: mmUser.id,
        tokenId,
        status: 'pending',
      },
    });

    if (del.count > 0) {
      this.realtimeService.broadcastOrderbook(tokenId);
    }
    return del.count;
  }

  isManualPriceLocked(tokenId: string): boolean {
    const until = this.manualLockUntilByToken.get(tokenId);
    if (until == null) return false;
    if (Date.now() > until) {
      this.manualLockUntilByToken.delete(tokenId);
      return false;
    }
    return true;
  }

  /** Flow / lịch không được kéo giá khi admin vừa neo spot. */
  shouldProtectSpot(tokenId: string): boolean {
    if (this.pathWalkActive.has(tokenId)) {
      return false;
    }
    return (
      this.spotAnchorByToken.has(tokenId) || this.isManualPriceLocked(tokenId)
    );
  }

  isPathWalkActive(tokenId: string): boolean {
    return this.pathWalkActive.has(tokenId);
  }

  beginPathWalk(tokenId: string): void {
    this.pathWalkActive.add(tokenId);
    this.cancelPriceSchedule(tokenId);
    this.cancelPriceModelRun(tokenId);
    this.spotAnchorByToken.delete(tokenId);
    this.manualLockUntilByToken.set(
      tokenId,
      Date.now() + 10 * 60 * 1000,
    );
  }

  endPathWalk(tokenId: string): void {
    this.pathWalkActive.delete(tokenId);
    this.manualLockUntilByToken.delete(tokenId);
  }

  setLastPathBookMid(tokenId: string, mid: number): void {
    if (mid > 0) {
      this.lastPathBookMidByToken.set(tokenId, mid);
    }
  }

  getLastPathBookMid(tokenId: string): number | undefined {
    return this.lastPathBookMidByToken.get(tokenId);
  }

  clearPathBookMid(tokenId: string): void {
    this.lastPathBookMidByToken.delete(tokenId);
  }

  registerPathBookRefreshHook(
    fn: (tokenId: string, target: number, spot: number) => Promise<void>,
  ): void {
    this.pathBookRefreshHooks.push(fn);
  }

  private async notifyPathBookRefresh(
    tokenId: string,
    target: number,
    spot: number,
  ): Promise<void> {
    for (const fn of this.pathBookRefreshHooks) {
      try {
        await fn(tokenId, target, spot);
      } catch (e) {
        this.logger.warn(
          `pathBookRefresh hook ${tokenId}: ${(e as Error).message}`,
        );
      }
    }
  }

  onModuleInit(): void {
    this.scheduleTickHandle = setInterval(() => {
      void this.tickSchedules();
    }, 1000);
  }

  onModuleDestroy(): void {
    if (this.scheduleTickHandle) {
      clearInterval(this.scheduleTickHandle);
      this.scheduleTickHandle = null;
    }
  }

  /** Dev: bật MM mặc định. Production: chỉ khi MARKET_MAKER_ENABLED=true. */
  envMmEnabled(): boolean {
    if (process.env.MARKET_MAKER_ENABLED === 'false') return false;
    if (process.env.MARKET_MAKER_ENABLED === 'true') return true;
    return process.env.NODE_ENV !== 'production';
  }

  isMmEnabled(): boolean {
    if (this.globalOverride.mmEnabled === false) return false;
    if (this.globalOverride.mmEnabled === true) return true;
    return this.envMmEnabled();
  }

  isFlowEnabled(): boolean {
    if (this.globalOverride.flowEnabled === false) return false;
    if (this.globalOverride.flowEnabled === true) return true;
    if (process.env.MARKET_FLOW_ENABLED === 'false') return false;
    return this.isMmEnabled();
  }

  isTokenPaused(tokenId: string): boolean {
    return this.tokenOverrides.get(tokenId)?.paused === true;
  }

  getMid(tokenId: string): number | undefined {
    return this.midByToken.get(tokenId);
  }

  setMid(tokenId: string, mid: number): void {
    this.midByToken.set(tokenId, Number(mid.toFixed(8)));
  }

  clearMid(tokenId: string): void {
    this.midByToken.delete(tokenId);
  }

  patchGlobal(patch: MmGlobalOverride): MmGlobalOverride {
    Object.assign(this.globalOverride, patch);
    return { ...this.globalOverride };
  }

  patchToken(tokenId: string, patch: MmTokenOverride): MmTokenOverride {
    const cur = this.tokenOverrides.get(tokenId) ?? {};
    const next = { ...cur, ...patch };
    if (patch.forceMid === null) {
      delete next.forceMid;
    }
    if (patch.targetPrice === null) {
      delete next.targetPrice;
    }
    this.tokenOverrides.set(tokenId, next);
    return { ...next };
  }

  resetToken(tokenId: string): void {
    this.cancelPriceSchedule(tokenId);
    this.cancelPriceModelRun(tokenId);
    this.tokenOverrides.delete(tokenId);
    this.midByToken.delete(tokenId);
    this.spotAnchorByToken.delete(tokenId);
    this.manualLockUntilByToken.delete(tokenId);
  }

  getSpotAnchor(tokenId: string): number | undefined {
    return this.spotAnchorByToken.get(tokenId);
  }

  /**
   * Sau khi admin đổi giá spot (đặt / nudge): hủy lệnh MM, lịch, neo giá — flow không ghi đè.
   */
  async commitSpotAnchor(tokenId: string, price: number): Promise<void> {
    this.spotAnchorByToken.set(tokenId, price);
    this.manualLockUntilByToken.set(tokenId, Date.now() + 6000);
    this.cancelPriceSchedule(tokenId);
    this.cancelPriceModelRun(tokenId);
    this.tokenOverrides.delete(tokenId);
    this.setMid(tokenId, price);
    const cancelled = await this.cancelPendingOrdersForToken(tokenId);
    this.logger.log(
      `Neo giá ${tokenId} = ${price} (hủy ${cancelled} lệnh MM chờ)`,
    );
  }

  resolveParams(tokenId: string): MmResolvedParams {
    const scheduleActive = this.hasActivePathDriver(tokenId);
    const tok = this.tokenOverrides.get(tokenId);
    const levels = Math.min(
      12,
      Math.max(
        1,
        tok?.levels ??
          this.globalOverride.levels ??
          (Number(process.env.MARKET_MAKER_LEVELS ?? '6') || 6),
      ),
    );
    const spreadStep =
      tok?.spreadStep ??
      this.globalOverride.spreadStep ??
      Number(process.env.MARKET_MAKER_SPREAD_STEP ?? '0.0025');
    const qty =
      this.globalOverride.qty ??
      Number(process.env.MARKET_MAKER_QTY ?? '80');
    const oscillatePct = Math.min(
      0.05,
      Math.max(
        0,
        this.globalOverride.oscillatePct ??
          (Number(process.env.MARKET_MAKER_OSCILLATE_PCT ?? '0.006') || 0.006),
      ),
    );
    const levelJitterPct = Math.min(
      0.02,
      Math.max(
        0,
        this.globalOverride.levelJitterPct ??
          (Number(process.env.MARKET_MAKER_LEVEL_JITTER_PCT ?? '0.0015') ||
            0.0015),
      ),
    );
    let wanderPct = Math.min(
      0.02,
      Math.max(
        0,
        this.globalOverride.wanderPct ??
          (Number(process.env.MARKET_MAKER_WANDER_PCT ?? '0.004') || 0.004),
      ),
    );
    let oscillatePctOut = oscillatePct;
    if (scheduleActive) {
      wanderPct = Math.min(wanderPct, 0.0008);
      oscillatePctOut = Math.min(oscillatePctOut, 0.001);
    }
    return {
      levels,
      spreadStep: Number(spreadStep),
      qty: Number(qty),
      oscillatePct: oscillatePctOut,
      levelJitterPct,
      wanderPct,
    };
  }

  hasActiveSchedule(tokenId: string, now = Date.now()): boolean {
    return this.getScheduledMid(tokenId, now) != null;
  }

  hasActiveModelRun(tokenId: string, now = Date.now()): boolean {
    return this.getModelMid(tokenId, now) != null;
  }

  /** Lịch PP1 hoặc mô hình PP2 đang điều khiển đường giá */
  hasActivePathDriver(tokenId: string, now = Date.now()): boolean {
    return (
      this.hasActiveModelRun(tokenId, now) ||
      this.hasActiveSchedule(tokenId, now)
    );
  }

  getSchedule(tokenId: string): PriceSchedule | null {
    return this.schedulesByToken.get(tokenId) ?? null;
  }

  getModelRun(tokenId: string): PriceModelRun | null {
    return this.modelRunsByToken.get(tokenId) ?? null;
  }

  getScheduledMid(tokenId: string, now = Date.now()): number | null {
    const s = this.schedulesByToken.get(tokenId);
    if (!s) return null;
    return scheduledPriceAt(s, now);
  }

  getModelMid(tokenId: string, now = Date.now()): number | null {
    const run = this.modelRunsByToken.get(tokenId);
    if (!run) return null;
    const spot = run.priceAtStart > 0 ? run.priceAtStart : 1;
    return modelPriceAt(run, now, spot);
  }

  /** Ưu tiên mô hình PP2, sau đó lịch sin PP1 */
  getPathMid(tokenId: string, now = Date.now()): number | null {
    const model = this.getModelMid(tokenId, now);
    if (model != null) return model;
    return this.getScheduledMid(tokenId, now);
  }

  createPriceSchedule(
    tokenId: string,
    input: {
      startAt: number;
      endAt: number;
      priceMin: number;
      priceMax: number;
      waveCycles?: number;
      restoreOnEnd?: boolean;
    },
    spotAtCreate: number,
  ): PriceSchedule {
    const { startAt, endAt, priceMin, priceMax } = input;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
      throw new Error('Thời gian không hợp lệ');
    }
    if (endAt <= startAt) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (endAt - startAt < 30_000) {
      throw new Error('Khoảng thời gian tối thiểu 30 giây');
    }
    if (priceMin <= 0 || priceMax <= 0 || priceMin >= priceMax) {
      throw new Error('priceMin phải nhỏ hơn priceMax và dương');
    }

    const now = Date.now();
    const schedule: PriceSchedule = {
      id: randomUUID(),
      tokenId,
      startAt,
      endAt,
      priceMin,
      priceMax,
      waveCycles: input.waveCycles ?? 4,
      restoreOnEnd: input.restoreOnEnd === true,
      status: now < startAt ? 'scheduled' : 'active',
      createdAt: now,
      priceAtStart: spotAtCreate,
    };

    this.cancelPriceModelRun(tokenId);
    this.schedulesByToken.set(tokenId, schedule);
    this.spotAnchorByToken.delete(tokenId);
    this.logger.log(
      `Lịch giá ${tokenId}: [${priceMin}, ${priceMax}] ${new Date(startAt).toISOString()} → ${new Date(endAt).toISOString()}`,
    );
    return schedule;
  }

  cancelPriceSchedule(tokenId: string): boolean {
    const s = this.schedulesByToken.get(tokenId);
    if (!s) return false;
    s.status = 'cancelled';
    this.schedulesByToken.delete(tokenId);
    this.clearScheduleOverrides(tokenId);
    return true;
  }

  createPriceModelRun(
    tokenId: string,
    input: {
      modelId: PriceModelId;
      startAt: number;
      endAt: number;
      params?: PriceModelParams;
      restoreOnEnd?: boolean;
    },
    spotAtCreate: number,
  ): PriceModelRun {
    const { startAt, endAt, modelId } = input;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
      throw new Error('Thời gian không hợp lệ');
    }
    if (endAt <= startAt) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (endAt - startAt < 30_000) {
      throw new Error('Khoảng thời gian tối thiểu 30 giây');
    }
    const catalog = PRICE_MODEL_CATALOG.find((m) => m.id === modelId);
    if (!catalog) {
      throw new Error(`Mô hình không hỗ trợ: ${modelId}`);
    }

    const durationMin = (endAt - startAt) / 60_000;
    const defaults = defaultParamsForModel(modelId, spotAtCreate, durationMin);
    const merged: PriceModelParams = {
      ...defaults,
      ...input.params,
    };
    const params = anchorPathParamsToSpot(modelId, spotAtCreate, merged);

    const now = Date.now();
    const run: PriceModelRun = {
      id: randomUUID(),
      tokenId,
      modelId,
      startAt,
      endAt,
      params,
      restoreOnEnd: input.restoreOnEnd === true,
      status: now < startAt ? 'scheduled' : 'active',
      createdAt: now,
      priceAtStart: spotAtCreate,
    };

    this.cancelPriceSchedule(tokenId);
    this.modelRunsByToken.set(tokenId, run);
    this.spotAnchorByToken.delete(tokenId);
    this.logger.log(
      `Mô hình giá ${modelId} ${tokenId}: ${new Date(startAt).toISOString()} → ${new Date(endAt).toISOString()}`,
    );
    return run;
  }

  cancelPriceModelRun(tokenId: string): boolean {
    const run = this.modelRunsByToken.get(tokenId);
    if (!run) return false;
    run.status = 'cancelled';
    this.modelRunsByToken.delete(tokenId);
    this.clearScheduleOverrides(tokenId);
    return true;
  }

  getModelRunView(tokenId: string, now = Date.now()) {
    const run = this.modelRunsByToken.get(tokenId);
    if (!run) return null;
    const target = modelPriceAt(run, now, run.priceAtStart);
    return {
      ...run,
      progress: modelRunProgress(run, now),
      currentTarget: target,
      isActive: target != null,
    };
  }

  private clearScheduleOverrides(tokenId: string): void {
    const o = this.tokenOverrides.get(tokenId);
    if (!o) return;
    delete o.forceMid;
    delete o.targetPrice;
    delete o.midBiasPct;
  }

  private async tickSchedules(): Promise<void> {
    if (this.scheduleTickInFlight) return;
    this.scheduleTickInFlight = true;
    const now = Date.now();

    try {
      for (const [tokenId, run] of [...this.modelRunsByToken.entries()]) {
        if (this.shouldProtectSpot(tokenId)) {
          this.modelRunsByToken.delete(tokenId);
          continue;
        }
        if (run.status === 'cancelled') {
          this.modelRunsByToken.delete(tokenId);
          continue;
        }
        if (now >= run.endAt) {
          await this.finishModelRun(run);
          continue;
        }
        if (now < run.startAt) {
          run.status = 'scheduled';
          continue;
        }
        if (run.status === 'scheduled') {
          run.status = 'active';
          const token = await this.tokenService.findById(tokenId);
          if (token?.price && token.price > 0) {
            run.priceAtStart = token.price;
            run.params = anchorPathParamsToSpot(
              run.modelId,
              token.price,
              run.params,
            );
          }
          this.logger.log(`Mô hình giá bắt đầu: ${run.modelId} ${tokenId}`);
        }
        const target = modelPriceAt(run, now, run.priceAtStart);
        if (target == null) continue;
        await this.applyPathTarget(tokenId, target, run);
      }

      for (const [tokenId, schedule] of [...this.schedulesByToken.entries()]) {
        if (this.shouldProtectSpot(tokenId)) {
          this.schedulesByToken.delete(tokenId);
          continue;
        }

        if (schedule.status === 'cancelled') {
          this.schedulesByToken.delete(tokenId);
          continue;
        }

        if (now >= schedule.endAt) {
          await this.finishSchedule(schedule);
          continue;
        }

        if (now < schedule.startAt) {
          schedule.status = 'scheduled';
          continue;
        }

        if (schedule.status === 'scheduled') {
          schedule.status = 'active';
          const token = await this.tokenService.findById(tokenId);
          if (token?.price && token.price > 0) {
            schedule.priceAtStart = token.price;
          }
          this.logger.log(`Lịch giá bắt đầu: ${tokenId}`);
        }

        const target = scheduledPriceAt(schedule, now);
        if (target == null) continue;

        schedule.currentTarget = target;
        await this.applyPathTarget(tokenId, target, schedule);
      }
    } catch (e) {
      this.logger.warn(`tickSchedules: ${(e as Error).message}`);
    } finally {
      this.scheduleTickInFlight = false;
    }
  }

  private async applyPathTarget(
    tokenId: string,
    target: number,
    driver: PriceSchedule | PriceModelRun,
  ): Promise<void> {
    const safeTarget = floorSpotPrice(target);
    driver.currentTarget = safeTarget;
    this.patchToken(tokenId, {
      forceMid: safeTarget,
      targetPrice: safeTarget,
      midBiasPct: 0,
    });
    this.setMid(tokenId, safeTarget);

    const token = await this.tokenService.findById(tokenId);
    if (!token) return;

    const spot = token.price && token.price > 0 ? token.price : safeTarget;
    const span = Math.max(1, driver.endAt - driver.startAt);
    const elapsed = Math.min(span, Math.max(0, Date.now() - driver.startAt));
    const progress = elapsed / span;
    const blend =
      progress >= 0.98
        ? 1
        : Math.min(0.92, 0.38 + progress * 0.54);
    const nextSpot = floorSpotPrice(
      Number((spot * (1 - blend) + safeTarget * blend).toFixed(8)),
    );
    if (Math.abs(nextSpot - spot) / spot < 1e-6) {
      await this.notifyPathBookRefresh(tokenId, safeTarget, spot);
      return;
    }

    await this.tokenService.updatePriceLive(tokenId, nextSpot, {
      volumes: token.volumes,
    });
    await this.notifyPathBookRefresh(tokenId, safeTarget, nextSpot);
  }

  private resolveFinalModelPrice(run: PriceModelRun, token: TokenCrypto): number {
    const spot =
      token.price && token.price > 0 ? token.price : run.priceAtStart || 1;
    const sampleAt = Math.max(run.startAt, run.endAt - 1000);
    const atEnd = modelPriceAt(
      { ...run, status: 'active' },
      sampleAt,
      run.priceAtStart,
    );
    return floorSpotPrice(atEnd ?? run.params.priceEnd ?? spot);
  }

  private resolveFinalSchedulePrice(
    schedule: PriceSchedule,
    token: TokenCrypto,
  ): number {
    const spot =
      token.price && token.price > 0
        ? token.price
        : schedule.priceAtStart ?? 1;
    const sampleAt = Math.max(schedule.startAt, schedule.endAt - 1000);
    const atEnd = scheduledPriceAt(
      { ...schedule, status: 'active' },
      sampleAt,
    );
    return floorSpotPrice(
      atEnd ?? (schedule.priceMin + schedule.priceMax) / 2 ?? spot,
    );
  }

  /** Hồi giá dần — tránh một cây nến đỏ/green nhảy tức thì. */
  private startGradualPriceWindDown(
    tokenId: string,
    fromPrice: number,
    toPrice: number,
    referenceSpanMs: number,
  ): void {
    const delta = Math.abs(fromPrice - toPrice) / Math.max(toPrice, 1e-12);
    if (delta < 0.003) return;

    const windMs = Math.min(
      120_000,
      Math.max(45_000, Math.round(referenceSpanMs * 0.2)),
    );
    const now = Date.now();
    this.createPriceModelRun(
      tokenId,
      {
        modelId: 'linear_ramp',
        startAt: now,
        endAt: now + windMs,
        params: {
          priceStart: fromPrice,
          priceEnd: toPrice,
        },
        restoreOnEnd: false,
      },
      fromPrice,
    );
    this.logger.log(
      `Hồi giá dần ${tokenId}: ${fromPrice} → ${toPrice} trong ${Math.round(windMs / 1000)}s`,
    );
  }

  private async finishModelRun(run: PriceModelRun): Promise<void> {
    const { tokenId } = run;
    run.status = 'ended';
    this.modelRunsByToken.delete(tokenId);
    this.clearScheduleOverrides(tokenId);
    this.clearMid(tokenId);

    const token = await this.tokenService.findById(tokenId);
    if (!token) return;

    const currentSpot =
      token.price && token.price > 0 ? token.price : run.priceAtStart;
    const finalTarget = this.resolveFinalModelPrice(run, token);

    if (run.restoreOnEnd && run.priceAtStart > 0) {
      this.startGradualPriceWindDown(
        tokenId,
        currentSpot,
        run.priceAtStart,
        run.endAt - run.startAt,
      );
      this.logger.log(
        `Mô hình ${run.modelId} kết thúc ${tokenId} — bắt đầu hồi giá về ≈ ${run.priceAtStart}`,
      );
      return;
    }

    const hold = finalTarget > 0 ? finalTarget : currentSpot;
    await this.setSpotPrice(token, hold, 0, { skipAnchor: false });
    this.logger.log(
      `Mô hình ${run.modelId} kết thúc ${tokenId} — giữ giá ≈ ${hold}`,
    );
  }

  private async finishSchedule(schedule: PriceSchedule): Promise<void> {
    const { tokenId } = schedule;
    schedule.status = 'ended';
    this.schedulesByToken.delete(tokenId);
    this.clearScheduleOverrides(tokenId);
    this.clearMid(tokenId);

    const token = await this.tokenService.findById(tokenId);
    if (!token) return;

    const currentSpot =
      token.price && token.price > 0
        ? token.price
        : schedule.priceAtStart ?? 1;
    const finalTarget = this.resolveFinalSchedulePrice(schedule, token);

    if (schedule.restoreOnEnd && schedule.priceAtStart != null) {
      this.startGradualPriceWindDown(
        tokenId,
        currentSpot,
        schedule.priceAtStart,
        schedule.endAt - schedule.startAt,
      );
      this.logger.log(
        `Lịch giá kết thúc ${tokenId} — bắt đầu hồi giá về ≈ ${schedule.priceAtStart}`,
      );
      return;
    }

    const hold = finalTarget > 0 ? finalTarget : currentSpot;
    await this.setSpotPrice(token, hold, 0, { skipAnchor: false });
    this.logger.log(
      `Lịch giá kết thúc ${tokenId} — giữ giá ≈ ${hold}`,
    );
  }

  /**
   * Sau khi MM tính mid dao động, áp bias / ép / kéo về target / lịch giá.
   */
  finalizeMid(tokenId: string, computedMid: number, baseMid: number): number {
    const scheduled = this.getPathMid(tokenId);
    if (scheduled != null) {
      const mid = Number(
        (computedMid * 0.15 + scheduled * 0.85).toFixed(8),
      );
      this.midByToken.set(tokenId, mid);
      return mid;
    }

    const anchor = this.spotAnchorByToken.get(tokenId);
    if (anchor != null && anchor > 0) {
      const mid = Number(
        (computedMid * 0.12 + anchor * 0.88).toFixed(8),
      );
      this.midByToken.set(tokenId, mid);
      return mid;
    }

    const o = this.tokenOverrides.get(tokenId);
    let mid = computedMid;

    if (o?.forceMid != null && o.forceMid > 0) {
      mid = o.forceMid;
    }

    if (o?.targetPrice != null && o.targetPrice > 0) {
      mid = mid * 0.65 + o.targetPrice * 0.35;
    }

    const bias = o?.midBiasPct ?? 0;
    if (bias !== 0) {
      mid = mid * (1 + bias);
    }

    const floor = baseMid > 0 ? baseMid * 1e-6 : 1e-8;
    mid = Number(Math.max(floor, mid).toFixed(8));
    this.midByToken.set(tokenId, mid);
    return mid;
  }

  getInitialMid(tokenId: string, baseMid: number, drift: number): number {
    if (!this.hasActivePathDriver(tokenId)) {
      const anchor = this.spotAnchorByToken.get(tokenId);
      if (anchor != null && anchor > 0) {
        return anchor * (1 + drift);
      }
    }
    return baseMid * (1 + drift);
  }

  async setSpotPrice(
    token: TokenCrypto,
    price: number,
    logVolume = 0,
    options?: { skipAnchor?: boolean },
  ): Promise<TokenCrypto> {
    assertPositiveSpotPrice(price, 'Giá spot');
    if (!options?.skipAnchor) {
      await this.commitSpotAnchor(token.id, price);
    } else {
      this.setMid(token.id, price);
    }
    const updated = await this.tokenService.updatePrice(token.id, price);
    if (logVolume > 0) {
      await this.tokenLogService.createLog(token.id, price, logVolume);
      const volumes = (await this.tokenService
        .syncVolumesFromLogs(token.id)
        .catch(() => null)) as typeof updated.volumes;
      this.realtimeService.emitTickerFast(token.id, {
        price,
        volumes: volumes ?? updated.volumes,
      });
    }
    return updated;
  }

  async nudgeSpotPrice(
    token: TokenCrypto,
    direction: 'up' | 'down',
    pct: number,
    logVolume = 0,
  ): Promise<{ price: number; previous: number }> {
    const fresh = await this.tokenService.findById(token.id);
    const prev =
      fresh?.price && fresh.price > 0
        ? fresh.price
        : token.price && token.price > 0
          ? token.price
          : 1;

    const factor = direction === 'up' ? 1 + pct : 1 - pct;
    const next = Number((prev * factor).toFixed(8));
    if (next <= 0) {
      throw new Error('Giá sau điều chỉnh không hợp lệ');
    }

    const updated = await this.setSpotPrice(
      fresh ?? token,
      next,
      logVolume,
    );
    return { price: updated.price ?? next, previous: prev };
  }

  getOverrideTokenIds(): string[] {
    const ids = new Set<string>();
    for (const id of this.tokenOverrides.keys()) ids.add(id);
    for (const id of this.midByToken.keys()) ids.add(id);
    for (const id of this.schedulesByToken.keys()) ids.add(id);
    for (const id of this.modelRunsByToken.keys()) ids.add(id);
    return [...ids];
  }

  getScheduleView(tokenId: string, now = Date.now()) {
    const s = this.schedulesByToken.get(tokenId);
    if (!s) return null;
    const target = scheduledPriceAt(s, now);
    return {
      ...s,
      progress: scheduleProgress(s, now),
      currentTarget: target,
      isActive: target != null,
    };
  }

  getSnapshot(): {
    global: MmGlobalOverride;
    envMmEnabled: boolean;
    mmEnabled: boolean;
    flowEnabled: boolean;
    schedules: Record<string, PriceSchedule>;
    modelRuns: Record<string, PriceModelRun>;
    tokens: Record<string, MmTokenOverride & { mid?: number }>;
  } {
    const tokens: Record<string, MmTokenOverride & { mid?: number }> = {};
    for (const [id, o] of this.tokenOverrides) {
      tokens[id] = { ...o, mid: this.midByToken.get(id) };
    }
    for (const [id, mid] of this.midByToken) {
      if (!tokens[id]) {
        tokens[id] = { mid };
      }
    }
    return {
      global: { ...this.globalOverride },
      envMmEnabled: this.envMmEnabled(),
      mmEnabled: this.isMmEnabled(),
      flowEnabled: this.isFlowEnabled(),
      schedules: Object.fromEntries(this.schedulesByToken),
      modelRuns: Object.fromEntries(this.modelRunsByToken),
      tokens,
    };
  }
}
