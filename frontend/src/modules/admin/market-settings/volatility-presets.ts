import type { EffectiveLiquiditySettings } from "@/modules/admin/market-settings/market-settings-types";
import { NORMAL_STEADY_PRESET } from "@/modules/admin/market-settings/market-settings-presets";

export type VolatilityLevelId =
  | "gentle"
  | "moderate"
  | "stable"
  | "strong"
  | "extreme";

export type VolatilityLevelMeta = {
  id: VolatilityLevelId;
  labelVi: string;
  hintVi: string;
  oscillatePct: number;
};

const BASE: Pick<
  EffectiveLiquiditySettings,
  | "mmEnabled"
  | "flowEnabled"
  | "mmBotCount"
  | "flowBotCount"
  | "levels"
  | "qty"
  | "multiMidStep"
> = {
  mmEnabled: true,
  flowEnabled: true,
  mmBotCount: 12,
  flowBotCount: 4,
  levels: 12,
  qty: 120,
  multiMidStep: 0.5,
};

/** Thứ tự slider trái → phải */
export const VOLATILITY_LEVELS: VolatilityLevelMeta[] = [
  {
    id: "gentle",
    labelVi: "Nhẹ",
    hintVi: "Dao rất ít, sổ chậm hơn",
    oscillatePct: 0.0004,
  },
  {
    id: "moderate",
    labelVi: "Vừa",
    hintVi: "Biến động vừa phải",
    oscillatePct: 0.0008,
  },
  {
    id: "stable",
    labelVi: "Ổn định",
    hintVi: "Mặc định ~±0.1%, sổ 500ms",
    oscillatePct: 0.001,
  },
  {
    id: "strong",
    labelVi: "Mạnh",
    hintVi: "Giá dao rõ, flow nhanh hơn",
    oscillatePct: 0.0025,
  },
  {
    id: "extreme",
    labelVi: "Cực mạnh",
    hintVi: "Biến động lớn — cẩn thận",
    oscillatePct: 0.005,
  },
];

export const VOLATILITY_PRESETS: Record<
  VolatilityLevelId,
  EffectiveLiquiditySettings
> = {
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

export function volatilityLevelIndex(id: VolatilityLevelId): number {
  return VOLATILITY_LEVELS.findIndex((l) => l.id === id);
}

export function inferVolatilityLevel(oscillatePct: number): VolatilityLevelId {
  let best: VolatilityLevelId = "stable";
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
