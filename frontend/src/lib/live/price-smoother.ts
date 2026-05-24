import type { SmoothProfile } from "@/lib/live/smooth-profiles";
import { SMOOTH_PROFILES } from "@/lib/live/smooth-profiles";
import type { TokenVolumes } from "@/types/token.type";

/** Epsilon so sánh giá float — tránh setState vô hạn */
export const SMOOTH_PRICE_EPSILON = 1e-8;

export type SmootherTickerFields = {
  tokenId: string;
  price?: number;
  marketCap?: number;
  volumes?: TokenVolumes;
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  at?: number;
};

type ProfilePrices = Record<SmoothProfile, number | undefined>;

type TokenState = {
  target: SmootherTickerFields;
  current: ProfilePrices;
};

export type SmoothFrameResult = {
  ui: Record<string, SmootherTickerFields>;
  chart: Record<string, SmootherTickerFields>;
  nav: Record<string, SmootherTickerFields>;
  priceTargetChanged: string[];
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function lerpAlpha(dtMs: number, tauMs: number): number {
  if (tauMs <= 0) return 1;
  return 1 - Math.exp(-dtMs / tauMs);
}

function priceChanged(a: number | undefined, b: number | undefined): boolean {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > SMOOTH_PRICE_EPSILON;
}

function buildPatch(
  state: TokenState,
  profile: SmoothProfile
): SmootherTickerFields {
  const { target, current } = state;
  const price = current[profile];
  return {
    ...target,
    ...(price != null ? { price } : {}),
  };
}

function snapshotsEqual(
  a: Record<string, SmootherTickerFields>,
  b: Record<string, SmootherTickerFields>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const id of keysA) {
    const pa = a[id]?.price;
    const pb = b[id]?.price;
    if (priceChanged(pa, pb)) return false;
    const ta = a[id];
    const tb = b[id];
    if (
      ta?.marketCap !== tb?.marketCap ||
      ta?.priceChange24h !== tb?.priceChange24h ||
      ta?.priceChange1h !== tb?.priceChange1h ||
      ta?.priceChange7d !== tb?.priceChange7d
    ) {
      return false;
    }
  }
  return true;
}

function anyLerpEnabled(tauMs: Record<SmoothProfile, number>): boolean {
  return SMOOTH_PROFILES.some((p) => tauMs[p] > 0);
}

function snapCurrentToTarget(state: TokenState, targetPrice?: number): void {
  if (targetPrice == null || !Number.isFinite(targetPrice)) return;
  for (const profile of SMOOTH_PROFILES) {
    state.current[profile] = targetPrice;
  }
}

export type PriceSmootherEngineOptions = {
  tauMs: Record<SmoothProfile, number>;
  onFrame: (result: SmoothFrameResult) => void;
};

/**
 * Ingest WS → display. Mặc định **snap** (nhảy thẳng tới giá mới).
 * Lerp chỉ khi `NEXT_PUBLIC_SMOOTH_TAU_*` > 0.
 */
export class PriceSmootherEngine {
  private tokens = new Map<string, TokenState>();
  private rafId: number | null = null;
  private lastFrameAt = 0;
  private lastUi: Record<string, SmootherTickerFields> = {};
  private lastChart: Record<string, SmootherTickerFields> = {};
  private lastNav: Record<string, SmootherTickerFields> = {};
  private readonly lerpEnabled: boolean;

  constructor(private readonly options: PriceSmootherEngineOptions) {
    this.lerpEnabled = anyLerpEnabled(options.tauMs);
  }

  setTarget(tokenId: string, patch: SmootherTickerFields): string[] {
    const prev = this.tokens.get(tokenId);
    const merged: SmootherTickerFields = {
      ...(prev?.target ?? { tokenId }),
      ...patch,
      tokenId,
      at: patch.at ?? Date.now(),
    };

    const prevTargetPrice = prev?.target.price;
    const targetPrice = merged.price;

    let state = prev;
    if (!state) {
      state = {
        target: merged,
        current: { ui: targetPrice, chart: targetPrice, nav: targetPrice },
      };
      this.tokens.set(tokenId, state);
    } else {
      state.target = merged;
      snapCurrentToTarget(state, targetPrice);
    }

    const changed: string[] = [];
    if (priceChanged(prevTargetPrice, targetPrice)) {
      changed.push(tokenId);
    }

    if (!this.lerpEnabled) {
      snapCurrentToTarget(state, targetPrice);
      this.publishFrame();
      return changed;
    }

    this.ensureRunning();
    return changed;
  }

  removeToken(tokenId: string): void {
    this.tokens.delete(tokenId);
    if (this.tokens.size === 0) {
      this.stop();
    }
  }

  dispose(): void {
    this.stop();
    this.tokens.clear();
  }

  private publishFrame(): void {
    const ui: Record<string, SmootherTickerFields> = {};
    const chart: Record<string, SmootherTickerFields> = {};
    const nav: Record<string, SmootherTickerFields> = {};

    for (const [id, state] of this.tokens.entries()) {
      ui[id] = buildPatch(state, "ui");
      chart[id] = buildPatch(state, "chart");
      nav[id] = buildPatch(state, "nav");
    }

    const uiChanged = !snapshotsEqual(ui, this.lastUi);
    const chartChanged = !snapshotsEqual(chart, this.lastChart);
    const navChanged = !snapshotsEqual(nav, this.lastNav);

    if (!uiChanged && !chartChanged && !navChanged) return;

    this.lastUi = ui;
    this.lastChart = chart;
    this.lastNav = nav;
    this.options.onFrame({ ui, chart, nav, priceTargetChanged: [] });
  }

  private ensureRunning(): void {
    if (!this.lerpEnabled || this.rafId != null) return;
    this.lastFrameAt = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      this.step(now);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step(now: number): void {
    const dt = Math.min(100, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;

    const reduced = prefersReducedMotion();
    let anyMoving = false;

    for (const state of this.tokens.values()) {
      const targetPrice = state.target.price;
      if (targetPrice == null || !Number.isFinite(targetPrice)) continue;

      for (const profile of SMOOTH_PROFILES) {
        const tau = this.options.tauMs[profile];
        const cur = state.current[profile] ?? targetPrice;
        if (reduced || tau <= 0) {
          state.current[profile] = targetPrice;
          continue;
        }
        const alpha = lerpAlpha(dt, tau);
        const next = cur + (targetPrice - cur) * alpha;
        state.current[profile] = next;
        if (Math.abs(next - targetPrice) > SMOOTH_PRICE_EPSILON) {
          anyMoving = true;
        } else {
          state.current[profile] = targetPrice;
        }
      }
    }

    this.publishFrame();

    if (!anyMoving) {
      this.stop();
    }
  }
}
