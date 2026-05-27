export type LiquiditySettingsSource = "env" | "db";

export type EffectiveLiquiditySettings = {
  mmEnabled: boolean;
  flowEnabled: boolean;
  mmIntervalMs: number;
  flowIntervalMs: number;
  mmBotCount: number;
  flowBotCount: number;
  levels: number;
  spreadStep: number;
  qty: number;
  flowQty: number;
  oscillatePct: number;
  wanderPct: number;
  levelJitterPct: number;
  multiMidStep: number;
};

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

export type MarketSettingsResponse = {
  effective: EffectiveLiquiditySettings;
  env: EffectiveLiquiditySettings;
  db: Partial<EffectiveLiquiditySettings> | null;
  sources: Record<keyof EffectiveLiquiditySettings, LiquiditySettingsSource>;
  volatilityLevels?: VolatilityLevelMeta[];
  currentVolatilityLevel?: VolatilityLevelId;
};

export type MarketSettingsPatch = Partial<EffectiveLiquiditySettings>;
