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
  frequencyHintVi: string;
  volumeHintVi: string;
  matchHintVi: string;
  priceHintVi: string;
};

export type VolatilityFlowProfile = {
  passesPerTick: number;
  sweepMaxFills: number;
  bothSidesPerTick: boolean;
};

export type VolatilityPricingProfile = {
  bookSkewPct: number;
  maxMidStepPctPerRefresh: number;
  wanderPct: number;
  oscillatePct: number;
  instantFillTolerancePct: number;
};

export type VolatilityProfileApi = {
  level: VolatilityLevelId;
  labelVi: string;
  hintVi: string;
  frequencyHintVi: string;
  volumeHintVi: string;
  matchHintVi: string;
  priceHintVi: string;
  flow: VolatilityFlowProfile;
  pricing: VolatilityPricingProfile;
};

export type MarketSettingsResponse = {
  effective: EffectiveLiquiditySettings;
  env: EffectiveLiquiditySettings;
  db: Partial<EffectiveLiquiditySettings> & {
    volatilityLevel?: VolatilityLevelId | null;
  } | null;
  sources: Record<keyof EffectiveLiquiditySettings, LiquiditySettingsSource>;
  volatilityLevels?: VolatilityLevelMeta[];
  volatilityProfiles?: VolatilityProfileApi[];
  currentVolatilityLevel?: VolatilityLevelId;
  volatilityRamping?: boolean;
};

export type MarketSettingsPatch = Partial<EffectiveLiquiditySettings>;
