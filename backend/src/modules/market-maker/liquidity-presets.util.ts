import type { PatchPlatformLiquiditySettingsDto } from '@modules/market-maker/dto/patch-platform-liquidity-settings.dto';

/**
 * Sổ lệnh refresh nhanh (500ms), flow vừa phải, giá dao ±~0.1% (oscillate 0.001).
 */
export const NORMAL_STEADY_PRESET: PatchPlatformLiquiditySettingsDto = {
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
