import type { EffectiveLiquiditySettings } from "@/modules/admin/market-settings/market-settings-types";

/** Sổ refresh 500ms, flow vừa, giá dao ±~0.1%. */
export const NORMAL_STEADY_PRESET: EffectiveLiquiditySettings = {
  mmEnabled: true,
  flowEnabled: true,
  mmIntervalMs: 500,
  flowIntervalMs: 500,
  mmBotCount: 12,
  flowBotCount: 4,
  levels: 12,
  spreadStep: 0.001,
  qty: 120,
  flowQty: 4,
  oscillatePct: 0.001,
  wanderPct: 0.0003,
  levelJitterPct: 0.0002,
  multiMidStep: 0.5,
};
