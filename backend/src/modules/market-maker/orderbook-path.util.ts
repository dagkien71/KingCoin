/**
 * Bước giá dọc đường khi admin pump/dump — tránh nhảy spot + sổ lệnh trống giữa A và B.
 * @see docs/ORDERBOOK_PRICE_PATH_SPEC.md
 */

export type PathWalkConfig = {
  /** Biến động tối thiểu (|to-from|/from) để đi bước thay vì teleport */
  minPctForWalk: number;
  /** Mỗi bước ~stepPct (tỷ lệ) */
  stepPct: number;
  minSteps: number;
  maxSteps: number;
};

export function pathWalkConfigFromEnv(): PathWalkConfig {
  const minPct = Number(process.env.PRICE_PATH_MIN_PCT_FOR_WALK ?? '0.025');
  const stepPct = Number(process.env.PRICE_PATH_STEP_PCT ?? '0.008');
  const maxSteps = Number(process.env.PRICE_PATH_MAX_STEPS ?? '24');
  const minSteps = Number(process.env.PRICE_PATH_MIN_STEPS ?? '2');
  return {
    minPctForWalk: Math.max(0.005, Number.isFinite(minPct) ? minPct : 0.025),
    stepPct: Math.max(0.002, Number.isFinite(stepPct) ? stepPct : 0.008),
    minSteps: Math.max(2, Number.isFinite(minSteps) ? Math.floor(minSteps) : 2),
    maxSteps: Math.max(3, Number.isFinite(maxSteps) ? Math.floor(maxSteps) : 24),
  };
}

export function pathStepDelayMs(): number {
  const raw = Number(process.env.PRICE_PATH_STEP_DELAY_MS ?? '100');
  return Math.max(40, Math.min(500, Number.isFinite(raw) ? raw : 100));
}

export function pathBookRefreshMinPct(): number {
  const raw = Number(process.env.PATH_BOOK_REFRESH_MIN_PCT ?? '0.004');
  return Math.max(0.001, Number.isFinite(raw) ? raw : 0.004);
}

export function relativeMovePct(from: number, to: number): number {
  const base = Math.max(from, to, 1e-12);
  return Math.abs(to - from) / base;
}

export function shouldWalkPricePath(
  from: number,
  to: number,
  cfg: PathWalkConfig = pathWalkConfigFromEnv(),
): boolean {
  if (from <= 0 || to <= 0) return false;
  return relativeMovePct(from, to) >= cfg.minPctForWalk;
}

/** Giá trung gian từ `from` → `to` (không gồm `from`, luôn kết thúc bằng `to`). */
export function computePricePathSteps(
  from: number,
  to: number,
  cfg: PathWalkConfig = pathWalkConfigFromEnv(),
): number[] {
  if (from <= 0 || to <= 0) return [to];
  if (!shouldWalkPricePath(from, to, cfg)) return [to];

  const sign = to >= from ? 1 : -1;
  const span = Math.abs(to - from);
  const stepSize = Math.max(from * cfg.stepPct, span / cfg.maxSteps);
  let n = Math.ceil(span / stepSize);
  n = Math.max(cfg.minSteps, Math.min(cfg.maxSteps, n));

  const steps: number[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = Number((from + sign * span * t).toFixed(8));
    if (p <= 0) continue;
    if (steps.length && Math.abs(p - steps[steps.length - 1]) / steps[steps.length - 1] < 1e-8) {
      continue;
    }
    steps.push(p);
  }
  const last = steps[steps.length - 1];
  if (!last || Math.abs(last - to) / Math.max(to, 1e-12) > 1e-8) {
    steps.push(Number(to.toFixed(8)));
  } else {
    steps[steps.length - 1] = Number(to.toFixed(8));
  }
  return steps;
}

export function pricePathDirection(
  from: number,
  to: number,
): 'up' | 'down' {
  return to >= from ? 'up' : 'down';
}
