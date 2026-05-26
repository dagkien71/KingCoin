import type { EffectiveLiquiditySettings } from "@/modules/admin/market-settings/market-settings-types";

/** Khớp `PatchPlatformLiquiditySettingsDto` backend */
export const MARKET_SETTINGS_LIMITS = {
  mmIntervalMs: { min: 500, max: 60_000 },
  flowIntervalMs: { min: 300, max: 60_000 },
  mmBotCount: { min: 0, max: 32 },
  flowBotCount: { min: 0, max: 16 },
  levels: { min: 1, max: 12 },
  spreadStep: { min: 0.0001, max: 0.2 },
  qty: { min: 1, max: 1_000_000 },
  flowQty: { min: 1, max: 100_000 },
  oscillatePct: { min: 0, max: 0.05 },
  wanderPct: { min: 0, max: 0.02 },
  levelJitterPct: { min: 0, max: 0.02 },
  multiMidStep: { min: 0, max: 2 },
} as const;

export function clampMarketSettings(
  form: EffectiveLiquiditySettings
): EffectiveLiquiditySettings {
  const L = MARKET_SETTINGS_LIMITS;
  const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, n));
  return {
    ...form,
    mmIntervalMs: clamp(form.mmIntervalMs, L.mmIntervalMs.min, L.mmIntervalMs.max),
    flowIntervalMs: clamp(
      form.flowIntervalMs,
      L.flowIntervalMs.min,
      L.flowIntervalMs.max
    ),
    mmBotCount: clamp(form.mmBotCount, L.mmBotCount.min, L.mmBotCount.max),
    flowBotCount: clamp(form.flowBotCount, L.flowBotCount.min, L.flowBotCount.max),
    levels: clamp(form.levels, L.levels.min, L.levels.max),
    spreadStep: clamp(form.spreadStep, L.spreadStep.min, L.spreadStep.max),
    qty: clamp(form.qty, L.qty.min, L.qty.max),
    flowQty: clamp(form.flowQty, L.flowQty.min, L.flowQty.max),
    oscillatePct: clamp(
      form.oscillatePct,
      L.oscillatePct.min,
      L.oscillatePct.max
    ),
    wanderPct: clamp(form.wanderPct, L.wanderPct.min, L.wanderPct.max),
    levelJitterPct: clamp(
      form.levelJitterPct,
      L.levelJitterPct.min,
      L.levelJitterPct.max
    ),
    multiMidStep: clamp(
      form.multiMidStep,
      L.multiMidStep.min,
      L.multiMidStep.max
    ),
  };
}

export function validateMarketSettings(
  form: EffectiveLiquiditySettings
): string | null {
  const L = MARKET_SETTINGS_LIMITS;
  if (form.spreadStep > L.spreadStep.max || form.spreadStep < L.spreadStep.min) {
    return `Spread step phải từ ${L.spreadStep.min} đến ${L.spreadStep.max} (0.2 = 20% mỗi bậc sổ).`;
  }
  if (form.oscillatePct > L.oscillatePct.max) {
    return `Oscillate % tối đa ${L.oscillatePct.max}.`;
  }
  if (form.wanderPct > L.wanderPct.max) {
    return `Wander % tối đa ${L.wanderPct.max}.`;
  }
  if (form.levelJitterPct > L.levelJitterPct.max) {
    return `Level jitter % tối đa ${L.levelJitterPct.max}.`;
  }
  return null;
}
