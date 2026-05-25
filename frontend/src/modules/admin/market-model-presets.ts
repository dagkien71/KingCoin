/** Phương pháp 2 — preset chạy mô hình đường giá */

export type PriceModelId =
  | "sin_band"
  | "linear_ramp"
  | "mean_reversion"
  | "gbm"
  | "step_ladder"
  | "triangle"
  | "exp_trend";

export type ModelPreset = {
  id: string;
  modelId: PriceModelId;
  title: string;
  desc: string;
  durationMin: number;
  /** Ghi đè tham số mặc định backend */
  params?: Record<string, number>;
  tone: "up" | "down" | "neutral" | "accent";
};

export const MODEL_PRESET_GROUPS = [
  {
    id: "trend",
    label: "Xu hướng",
    hint: "Ramp, mũ, bậc thang — nến thân dài một hướng",
  },
  {
    id: "oscillate",
    label: "Dao động / hồi quy",
    hint: "Sideway, OU, GBM — giá lắc hoặc ngẫu nhiên có kiểm soát",
  },
  {
    id: "pattern",
    label: "Mẫu hình",
    hint: "V-shape, pump/dump có cấu trúc",
  },
] as const;

export const PRICE_MODEL_PRESETS: ModelPreset[] = [
  {
    id: "model-volatile-trend-up",
    modelId: "gbm",
    title: "Biến động mạnh — xu hướng tăng",
    desc: "GBM: lắc mạnh ~±4–5%/bước, drift dương — giá nghiêng lên ~15–25% trong 25 phút",
    durationMin: 25,
    params: { drift: 0.14, volatility: 0.048 },
    tone: "up",
  },
  {
    id: "model-volatile-trend-down",
    modelId: "gbm",
    title: "Biến động mạnh — xu hướng giảm",
    desc: "GBM: lắc mạnh ~±4–5%/bước, drift âm — giá nghiêng xuống ~15–25% trong 25 phút",
    durationMin: 25,
    params: { drift: -0.14, volatility: 0.048 },
    tone: "down",
  },
  {
    id: "model-pump-ramp",
    modelId: "linear_ramp",
    title: "Pump ramp (+5%)",
    desc: "Tăng tuyến tính ~5% trong 10 phút",
    durationMin: 10,
    params: {},
    tone: "up",
  },
  {
    id: "model-dump-ramp",
    modelId: "linear_ramp",
    title: "Dump ramp (−5%)",
    desc: "Giảm tuyến tính ~5% trong 10 phút",
    durationMin: 10,
    tone: "down",
  },
  {
    id: "model-exp-pump",
    modelId: "exp_trend",
    title: "Pump mũ",
    desc: "Tăng theo hàm mũ (expFactor 1.15)",
    durationMin: 12,
    params: { expFactor: 1.15 },
    tone: "up",
  },
  {
    id: "model-steps-up",
    modelId: "step_ladder",
    title: "Bậc thang lên",
    desc: "5 bậc giá tăng dần",
    durationMin: 15,
    params: { steps: 5 },
    tone: "up",
  },
  {
    id: "model-sideway-sin",
    modelId: "sin_band",
    title: "Sideway sin",
    desc: "Dao động ±3% trong dải",
    durationMin: 20,
    tone: "neutral",
  },
  {
    id: "model-mean-revert",
    modelId: "mean_reversion",
    title: "Hồi quy về spot",
    desc: "Giá lệch rồi kéo về mức ban đầu (OU)",
    durationMin: 18,
    params: { reversionSpeed: 6 },
    tone: "neutral",
  },
  {
    id: "model-gbm-demo",
    modelId: "gbm",
    title: "GBM demo",
    desc: "Đường ngẫu nhiên log-normal (vol 2%)",
    durationMin: 15,
    params: { volatility: 0.02, drift: 0.03 },
    tone: "accent",
  },
  {
    id: "model-v-recovery",
    modelId: "triangle",
    title: "V-shape recovery",
    desc: "Giảm nửa đầu, hồi nửa sau",
    durationMin: 20,
    tone: "accent",
  },
];

/** Ramp / sin với % tùy chọn (bàn điều khiển nhanh & preset động). */
export function buildModelRunBodyWithPct(
  opts: {
    modelId: PriceModelId;
    spot: number;
    pct: number;
    durationMin: number;
    direction?: "up" | "down";
    restoreOnEnd?: boolean;
  }
): {
  modelId: PriceModelId;
  durationMin: number;
  params: Record<string, number>;
  restoreOnEnd: boolean;
} {
  const p = opts.spot > 0 ? opts.spot : 1;
  const band = Math.min(50, Math.max(0.5, opts.pct)) / 100;
  const params: Record<string, number> = { priceStart: p };

  if (opts.modelId === "linear_ramp") {
    const up = opts.direction !== "down";
    params.priceEnd = Number((p * (up ? 1 + band : 1 - band)).toFixed(8));
  } else if (opts.modelId === "sin_band") {
    params.priceMin = Number((p * (1 - band)).toFixed(8));
    params.priceMax = Number((p * (1 + band)).toFixed(8));
    params.waveCycles = Math.max(
      2,
      Math.min(12, Math.round(opts.durationMin / 4))
    );
  }

  return {
    modelId: opts.modelId,
    durationMin: opts.durationMin,
    params,
    restoreOnEnd: opts.restoreOnEnd === true,
  };
}

export function buildModelRunBody(
  preset: ModelPreset,
  spot: number,
  overrides?: { pct?: number; durationMin?: number }
): {
  modelId: PriceModelId;
  durationMin: number;
  params: Record<string, number>;
  restoreOnEnd: boolean;
  /** Chỉ dùng khi đặt lịch tương lai (datetime-local) */
  startAt?: string;
  endAt?: string;
} {
  const durationMin = overrides?.durationMin ?? preset.durationMin;
  const pct = overrides?.pct;

  if (
    pct != null &&
    (preset.modelId === "linear_ramp" || preset.modelId === "sin_band")
  ) {
    return buildModelRunBodyWithPct({
      modelId: preset.modelId,
      spot,
      pct,
      durationMin,
      direction: preset.id === "model-dump-ramp" ? "down" : "up",
    });
  }

  const p = spot > 0 ? spot : 1;
  const params: Record<string, number> = {
    priceStart: p,
    ...preset.params,
  };

  if (preset.modelId === "linear_ramp") {
    if (preset.id === "model-dump-ramp") {
      params.priceEnd = Number((p * 0.95).toFixed(8));
    } else {
      params.priceEnd = Number((p * 1.05).toFixed(8));
    }
  }
  if (preset.modelId === "sin_band") {
    params.priceMin = Number((p * 0.97).toFixed(8));
    params.priceMax = Number((p * 1.03).toFixed(8));
    params.waveCycles = 4;
  }
  if (preset.modelId === "mean_reversion") {
    params.priceStart = Number((p * 1.04).toFixed(8));
    params.priceEnd = p;
  }
  if (preset.modelId === "step_ladder") {
    params.priceEnd = Number((p * 1.06).toFixed(8));
  }
  if (preset.modelId === "triangle") {
    params.priceMin = Number((p * 0.94).toFixed(8));
    params.priceEnd = Number((p * 1.02).toFixed(8));
  }
  if (preset.modelId === "exp_trend") {
    params.priceEnd = Number((p * 1.08).toFixed(8));
  }
  if (preset.modelId === "gbm") {
    params.drift = preset.params?.drift ?? 0.05;
    params.volatility = preset.params?.volatility ?? 0.018;
  }

  return {
    modelId: preset.modelId,
    durationMin,
    params,
    restoreOnEnd: false,
  };
}
