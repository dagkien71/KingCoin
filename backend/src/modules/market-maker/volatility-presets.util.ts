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
  /** Gợi ý UI — giá chủ yếu từ khớp lệnh, không còn sóng sin đẩy spot */
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
  /** Chỉ jitter sổ — không đẩy spot trực tiếp */
  wanderPct: number;
  oscillatePct: number;
  instantFillTolerancePct: number;
};

export type VolatilityMarketProfile = {
  level: VolatilityLevelId;
  labelVi: string;
  hintVi: string;
  patch: PatchPlatformLiquiditySettingsDto;
  flow: VolatilityFlowProfile;
  pricing: VolatilityPricingProfile;
};

const BASE = {
  mmEnabled: true,
  flowEnabled: true,
  mmBotCount: 22,
  flowBotCount: 14,
  levels: 12,
  qty: 120,
  multiMidStep: 0.5,
} as const;

export const VOLATILITY_ORDER: VolatilityLevelId[] = [
  'gentle',
  'moderate',
  'stable',
  'strong',
  'extreme',
];

export const VOLATILITY_MARKET_PROFILES: Record<
  VolatilityLevelId,
  VolatilityMarketProfile
> = {
  gentle: {
    level: 'gentle',
    labelVi: 'Nhẹ',
    hintVi: 'Thị trường yên — ít lệnh, khớp chậm, giá từ giao dịch nhỏ',
    patch: {
      ...BASE,
      volatilityLevel: 'gentle',
      mmIntervalMs: 900,
      flowIntervalMs: 1000,
      spreadStep: 0.001,
      flowQty: 3,
      oscillatePct: 0.0001,
      wanderPct: 0,
      levelJitterPct: 0.00008,
    },
    flow: { passesPerTick: 1, sweepMaxFills: 2, bothSidesPerTick: true },
    pricing: {
      bookSkewPct: 0,
      maxMidStepPctPerRefresh: 0.0005,
      wanderPct: 0,
      oscillatePct: 0.0001,
      instantFillTolerancePct: 0.0015,
    },
  },
  moderate: {
    level: 'moderate',
    labelVi: 'Vừa',
    hintVi: 'Nhịp tự nhiên — giao dịch và khớp vừa phải',
    patch: {
      ...BASE,
      volatilityLevel: 'moderate',
      mmIntervalMs: 650,
      flowIntervalMs: 750,
      spreadStep: 0.001,
      flowQty: 5,
      oscillatePct: 0.0001,
      wanderPct: 0,
      levelJitterPct: 0.00012,
    },
    flow: { passesPerTick: 2, sweepMaxFills: 3, bothSidesPerTick: true },
    pricing: {
      bookSkewPct: 0,
      maxMidStepPctPerRefresh: 0.001,
      wanderPct: 0,
      oscillatePct: 0.0001,
      instantFillTolerancePct: 0.0018,
    },
  },
  stable: {
    level: 'stable',
    labelVi: 'Ổn định',
    hintVi: 'Mặc định — sổ 500ms, khớp đều, giá theo lệnh',
    patch: {
      ...NORMAL_STEADY_PRESET,
      volatilityLevel: 'stable',
      oscillatePct: 0.00015,
      wanderPct: 0,
    },
    flow: { passesPerTick: 2, sweepMaxFills: 4, bothSidesPerTick: true },
    pricing: {
      bookSkewPct: 0,
      maxMidStepPctPerRefresh: 0.002,
      wanderPct: 0,
      oscillatePct: 0.00015,
      instantFillTolerancePct: 0.002,
    },
  },
  strong: {
    level: 'strong',
    labelVi: 'Mạnh',
    hintVi: 'Sôi động — nhiều khớp hai phía, sổ dày, giá chạy theo volume',
    patch: {
      ...BASE,
      volatilityLevel: 'strong',
      mmIntervalMs: 350,
      flowIntervalMs: 200,
      flowBotCount: 16,
      spreadStep: 0.0012,
      flowQty: 12,
      oscillatePct: 0.0002,
      wanderPct: 0,
      levelJitterPct: 0.0004,
    },
    flow: { passesPerTick: 2, sweepMaxFills: 4, bothSidesPerTick: true },
    pricing: {
      bookSkewPct: 0.00035,
      maxMidStepPctPerRefresh: 0.004,
      wanderPct: 0,
      oscillatePct: 0.0002,
      instantFillTolerancePct: 0.0025,
    },
  },
  extreme: {
    level: 'extreme',
    labelVi: 'Cực mạnh',
    hintVi: 'FOMO — khớp dày, volume lớn, giá cập nhật liên tục từ giao dịch',
    patch: {
      ...BASE,
      volatilityLevel: 'extreme',
      mmIntervalMs: 300,
      flowIntervalMs: 150,
      flowBotCount: 16,
      spreadStep: 0.0015,
      flowQty: 16,
      oscillatePct: 0.00025,
      wanderPct: 0,
      levelJitterPct: 0.0006,
    },
    flow: { passesPerTick: 3, sweepMaxFills: 6, bothSidesPerTick: true },
    pricing: {
      bookSkewPct: 0.00065,
      maxMidStepPctPerRefresh: 0.008,
      wanderPct: 0,
      oscillatePct: 0.00025,
      instantFillTolerancePct: 0.0035,
    },
  },
};

/** Thứ tự slider: nhẹ → cực mạnh */
export const VOLATILITY_LEVELS: readonly VolatilityLevelMeta[] =
  VOLATILITY_ORDER.map((id) => {
    const p = VOLATILITY_MARKET_PROFILES[id];
    return {
      id,
      labelVi: p.labelVi,
      hintVi: p.hintVi,
      oscillatePct: p.pricing.oscillatePct,
      frequencyHintVi: formatFrequencyHint(p.patch),
      volumeHintVi: formatVolumeHint(p.patch),
      matchHintVi: formatMatchHint(p.flow, p.patch),
      priceHintVi: formatPriceHint(p.pricing, p.flow),
    };
  });

function formatFrequencyHint(
  patch: PatchPlatformLiquiditySettingsDto,
): string {
  return `MM ${patch.mmIntervalMs ?? '?'}ms · Flow ${patch.flowIntervalMs ?? '?'}ms`;
}

function formatVolumeHint(patch: PatchPlatformLiquiditySettingsDto): string {
  return `Sổ qty≈${patch.qty ?? '?'} · flow ${patch.flowQty ?? '?'}/lệnh`;
}

function formatMatchHint(
  flow: VolatilityFlowProfile,
  patch: PatchPlatformLiquiditySettingsDto,
): string {
  const sides = flow.bothSidesPerTick ? 'khớp 2 phía' : 'khớp xen kẽ';
  return `${sides} · ${flow.passesPerTick} vòng/tick · spread ${((patch.spreadStep ?? 0) * 100).toFixed(2)}%`;
}

function formatPriceHint(
  pricing: VolatilityPricingProfile,
  flow: VolatilityFlowProfile,
): string {
  const skew =
    pricing.bookSkewPct > 0
      ? `lệch sổ ${(pricing.bookSkewPct * 100).toFixed(3)}%`
      : 'giá = khớp lệnh';
  return `${skew} · tối đa ${flow.sweepMaxFills} fill/sweep`;
}

export function volatilityMarketProfile(
  level: VolatilityLevelId,
): VolatilityMarketProfile {
  return VOLATILITY_MARKET_PROFILES[level];
}

export function volatilityPresetFor(
  level: string,
): PatchPlatformLiquiditySettingsDto | null {
  if (!isVolatilityLevelId(level)) return null;
  return { ...VOLATILITY_MARKET_PROFILES[level].patch };
}

export function isVolatilityLevelId(level: string): level is VolatilityLevelId {
  return level in VOLATILITY_MARKET_PROFILES;
}

export function resolveVolatilityProfile(
  level?: VolatilityLevelId | string | null,
): VolatilityMarketProfile {
  if (level && isVolatilityLevelId(level)) {
    return VOLATILITY_MARKET_PROFILES[level];
  }
  return VOLATILITY_MARKET_PROFILES.stable;
}

/** Khớp mức gần nhất theo oscillatePct (DB cũ không có volatilityLevel) */
export function inferVolatilityLevel(
  oscillatePct: number,
  storedLevel?: string | null,
): VolatilityLevelId {
  if (storedLevel && isVolatilityLevelId(storedLevel)) {
    return storedLevel;
  }
  let best: VolatilityLevelId = 'stable';
  let minDist = Infinity;
  for (const id of VOLATILITY_ORDER) {
    const ref = VOLATILITY_MARKET_PROFILES[id].pricing.oscillatePct;
    const d = Math.abs(oscillatePct - ref);
    if (d < minDist) {
      minDist = d;
      best = id;
    }
  }
  return best;
}

export function volatilityProfilesForApi(): VolatilityMarketProfile[] {
  return VOLATILITY_ORDER.map((id) => VOLATILITY_MARKET_PROFILES[id]);
}
