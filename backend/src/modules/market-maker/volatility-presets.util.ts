import type { PatchPlatformLiquiditySettingsDto } from '@modules/market-maker/dto/patch-platform-liquidity-settings.dto';
import { NORMAL_STEADY_PRESET } from '@modules/market-maker/liquidity-presets.util';

export type VolatilityLevelId =
  | 'gentle'
  | 'moderate'
  | 'stable'
  | 'strong'
  | 'extreme';

export type VolatilityLevelMeta = {
  id: VolatilityLevelId;
  labelVi: string;
  hintVi: string;
  /** Dao mid chính — dùng nhận diện mức đang chọn */
  oscillatePct: number;
};

const BASE = {
  mmEnabled: true,
  flowEnabled: true,
  mmBotCount: 12,
  flowBotCount: 4,
  levels: 12,
  qty: 120,
  multiMidStep: 0.5,
} as const;

/** Thứ tự slider: nhẹ → vừa → ổn định → mạnh → cực mạnh */
export const VOLATILITY_LEVELS: readonly VolatilityLevelMeta[] = [
  {
    id: 'gentle',
    labelVi: 'Nhẹ',
    hintVi: 'Dao rất ít, sổ chậm hơn',
    oscillatePct: 0.0004,
  },
  {
    id: 'moderate',
    labelVi: 'Vừa',
    hintVi: 'Biến động vừa phải',
    oscillatePct: 0.0008,
  },
  {
    id: 'stable',
    labelVi: 'Ổn định',
    hintVi: 'Mặc định ~±0.1%, sổ 500ms',
    oscillatePct: 0.001,
  },
  {
    id: 'strong',
    labelVi: 'Mạnh',
    hintVi: 'Giá dao rõ, flow nhanh hơn',
    oscillatePct: 0.0025,
  },
  {
    id: 'extreme',
    labelVi: 'Cực mạnh',
    hintVi: 'Biến động lớn — cẩn thận',
    oscillatePct: 0.005,
  },
] as const;

const PRESETS: Record<VolatilityLevelId, PatchPlatformLiquiditySettingsDto> = {
  gentle: {
    ...BASE,
    mmIntervalMs: 900,
    flowIntervalMs: 1000,
    spreadStep: 0.0008,
    flowQty: 3,
    oscillatePct: 0.0004,
    wanderPct: 0.00015,
    levelJitterPct: 0.0001,
  },
  moderate: {
    ...BASE,
    mmIntervalMs: 650,
    flowIntervalMs: 750,
    spreadStep: 0.001,
    flowQty: 4,
    oscillatePct: 0.0008,
    wanderPct: 0.00025,
    levelJitterPct: 0.00015,
  },
  stable: { ...NORMAL_STEADY_PRESET },
  strong: {
    ...BASE,
    mmIntervalMs: 400,
    flowIntervalMs: 400,
    spreadStep: 0.0015,
    flowQty: 6,
    oscillatePct: 0.0025,
    wanderPct: 0.0008,
    levelJitterPct: 0.0005,
  },
  extreme: {
    ...BASE,
    mmIntervalMs: 300,
    flowIntervalMs: 300,
    spreadStep: 0.002,
    flowQty: 10,
    oscillatePct: 0.005,
    wanderPct: 0.0015,
    levelJitterPct: 0.001,
  },
};

export function volatilityPresetFor(
  level: string,
): PatchPlatformLiquiditySettingsDto | null {
  const id = level as VolatilityLevelId;
  return PRESETS[id] ?? null;
}

export function isVolatilityLevelId(level: string): level is VolatilityLevelId {
  return level in PRESETS;
}

/** Khớp mức gần nhất theo oscillatePct hiện tại */
export function inferVolatilityLevel(
  oscillatePct: number,
): VolatilityLevelId {
  let best: VolatilityLevelId = 'stable';
  let minDist = Infinity;
  for (const L of VOLATILITY_LEVELS) {
    const d = Math.abs(oscillatePct - L.oscillatePct);
    if (d < minDist) {
      minDist = d;
      best = L.id;
    }
  }
  return best;
}
