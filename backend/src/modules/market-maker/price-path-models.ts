/**
 * Phương pháp 2 — đường giá theo mô hình (tham khảo GBM, mean-reversion OU, ramp, v.v.)
 * @see docs/MARKET_CONTROL_MODELS.md
 */

export type PriceModelId =
  | 'sin_band'
  | 'linear_ramp'
  | 'mean_reversion'
  | 'gbm'
  | 'step_ladder'
  | 'triangle'
  | 'exp_trend';

export type PriceModelRunStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'cancelled';

export type PriceModelRun = {
  id: string;
  tokenId: string;
  modelId: PriceModelId;
  startAt: number;
  endAt: number;
  params: PriceModelParams;
  restoreOnEnd: boolean;
  status: PriceModelRunStatus;
  createdAt: number;
  priceAtStart: number;
  /** Giá mục tiêu tick gần nhất (runtime) */
  currentTarget?: number;
};

export type PriceModelParams = {
  /** Giá đầu (mặc định = spot lúc chạy) */
  priceStart?: number;
  /** Giá đích / trung tâm hồi quy */
  priceEnd?: number;
  priceMin?: number;
  priceMax?: number;
  /** Số sóng (sin_band) */
  waveCycles?: number;
  /** Tốc độ hồi quy 1–20 (mean_reversion) */
  reversionSpeed?: number;
  /** Volatility mỗi bước, vd 0.02 = 2% (gbm) */
  volatility?: number;
  /** Drift mỗi đơn vị thời gian (gbm), annualized scaled to span */
  drift?: number;
  /** Số bậc (step_ladder) */
  steps?: number;
  /** Hệ số exp: >1 tăng, <1 giảm (exp_trend) */
  expFactor?: number;
};

export type PriceModelMeta = {
  id: PriceModelId;
  name: string;
  nameVi: string;
  description: string;
  /** Tham chiếu lý thuyết ngắn */
  reference: string;
  defaultDurationMin: number;
  paramHints: string[];
};

export const PRICE_MODEL_CATALOG: PriceModelMeta[] = [
  {
    id: 'sin_band',
    name: 'Sinusoidal band',
    nameVi: 'Sóng sin trong dải',
    description: 'Giá dao động đều giữa min và max — tương đương nến sideway.',
    reference: 'Periodic oscillation (Fourier fundamental)',
    defaultDurationMin: 15,
    paramHints: ['priceMin', 'priceMax', 'waveCycles'],
  },
  {
    id: 'linear_ramp',
    name: 'Linear ramp',
    nameVi: 'Ramp tuyến tính',
    description: 'Tăng hoặc giảm đều từ priceStart → priceEnd.',
    reference: 'Deterministic trend / straight candle series',
    defaultDurationMin: 10,
    paramHints: ['priceStart', 'priceEnd'],
  },
  {
    id: 'mean_reversion',
    name: 'Mean reversion (OU)',
    nameVi: 'Hồi quy về mức trung tính',
    description: 'Giá kéo về priceEnd (μ) theo hàm mũ — Ornstein-Uhlenbeck rời rạc.',
    reference: 'Ornstein-Uhlenbeck / Vasicek (quant finance)',
    defaultDurationMin: 20,
    paramHints: ['priceStart', 'priceEnd', 'reversionSpeed'],
  },
  {
    id: 'gbm',
    name: 'Geometric Brownian Motion',
    nameVi: 'GBM (ngẫu nhiên log-normal)',
    description: 'Đường giá ngẫu nhiên có drift + volatility — mô phỏng spot stochastic.',
    reference: 'Black-Scholes / GBM (QuantStart, MathWorks)',
    defaultDurationMin: 15,
    paramHints: ['priceStart', 'drift', 'volatility'],
  },
  {
    id: 'step_ladder',
    name: 'Step ladder',
    nameVi: 'Bậc thang',
    description: 'N bậc giá rời rạc từ start → end — nến thân dài từng pha.',
    reference: 'Piecewise constant / step function',
    defaultDurationMin: 12,
    paramHints: ['priceStart', 'priceEnd', 'steps'],
  },
  {
    id: 'triangle',
    name: 'V-shape (triangle)',
    nameVi: 'Hình chữ V',
    description: 'Giảm nửa đầu, tăng nửa sau — mô phỏng dump rồi recovery.',
    reference: 'Piecewise linear; W-bottom variant',
    defaultDurationMin: 20,
    paramHints: ['priceStart', 'priceMin', 'priceEnd'],
  },
  {
    id: 'exp_trend',
    name: 'Exponential trend',
    nameVi: 'Xu hướng mũ',
    description: 'Tăng/giảm theo hàm mũ quanh priceStart.',
    reference: 'Exponential growth/decay curves',
    defaultDurationMin: 15,
    paramHints: ['priceStart', 'expFactor'],
  },
];

function progress(run: PriceModelRun, now: number): number | null {
  if (run.status === 'cancelled' || run.status === 'ended') return null;
  if (now < run.startAt || now >= run.endAt) return null;
  const span = run.endAt - run.startAt;
  if (span <= 0) return null;
  return (now - run.startAt) / span;
}

/** Nhiễu xác định từ (modelId, progress) — reproducible cho test. */
function detNoise(modelId: string, t: number): number {
  const x = Math.sin(t * 12.9898 + modelId.length * 0.13) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function resolveStartEnd(
  run: PriceModelRun,
  spotFallback: number,
): { start: number; end: number; min: number; max: number } {
  const p0 = run.params.priceStart ?? run.priceAtStart ?? spotFallback;
  const p1 = run.params.priceEnd ?? p0;
  const min = run.params.priceMin ?? Math.min(p0, p1) * 0.97;
  const max = run.params.priceMax ?? Math.max(p0, p1) * 1.03;
  return { start: p0, end: p1, min, max };
}

export function modelPriceAt(
  run: PriceModelRun,
  now: number,
  spotFallback = 1,
): number | null {
  const t = progress(run, now);
  if (t == null) return null;

  const { start, end, min, max } = resolveStartEnd(run, spotFallback);
  const p = run.params;

  switch (run.modelId) {
    case 'sin_band': {
      const center = (min + max) / 2;
      const amp = (max - min) / 2;
      const cycles = p.waveCycles ?? 4;
      const wave = Math.sin(t * Math.PI * 2 * cycles);
      return Number((center + amp * wave).toFixed(8));
    }
    case 'linear_ramp':
      return Number((start + (end - start) * t).toFixed(8));
    case 'mean_reversion': {
      const mu = end;
      const k = Math.min(20, Math.max(0.5, p.reversionSpeed ?? 4));
      const factor = Math.exp(-k * t);
      return Number((mu + (start - mu) * factor).toFixed(8));
    }
    case 'gbm': {
      const sigma = Math.min(0.15, Math.max(0.001, p.volatility ?? 0.02));
      const mu = p.drift ?? 0;
      const z = detNoise(run.id, t);
      const logReturn = (mu - 0.5 * sigma * sigma) * t + sigma * Math.sqrt(t) * z;
      return Number((start * Math.exp(logReturn)).toFixed(8));
    }
    case 'step_ladder': {
      const steps = Math.max(2, Math.min(24, Math.round(p.steps ?? 6)));
      const idx = Math.min(steps - 1, Math.floor(t * steps));
      return Number((start + ((end - start) * idx) / (steps - 1)).toFixed(8));
    }
    case 'triangle': {
      const low = p.priceMin ?? Math.min(start, end) * 0.92;
      if (t < 0.5) {
        return Number((start + (low - start) * (t * 2)).toFixed(8));
      }
      return Number((low + (end - low) * ((t - 0.5) * 2)).toFixed(8));
    }
    case 'exp_trend': {
      const f = Math.min(3, Math.max(0.2, p.expFactor ?? 1.15));
      const scale = (Math.pow(f, t) - 1) / (f - 1 || 1);
      return Number((start * (1 + (end / start - 1) * scale)).toFixed(8));
    }
    default:
      return null;
  }
}

export function modelRunProgress(run: PriceModelRun, now: number): number {
  if (now <= run.startAt) return 0;
  if (now >= run.endAt) return 1;
  return (now - run.startAt) / (run.endAt - run.startAt);
}

export function defaultParamsForModel(
  modelId: PriceModelId,
  spot: number,
  durationMin: number,
): PriceModelParams {
  const p = spot > 0 ? spot : 1;
  switch (modelId) {
    case 'sin_band':
      return {
        priceStart: p,
        priceMin: Number((p * 0.97).toFixed(8)),
        priceMax: Number((p * 1.03).toFixed(8)),
        waveCycles: durationMin >= 30 ? 6 : 4,
      };
    case 'linear_ramp':
      return { priceStart: p, priceEnd: Number((p * 1.05).toFixed(8)) };
    case 'mean_reversion':
      return {
        priceStart: Number((p * 1.04).toFixed(8)),
        priceEnd: p,
        reversionSpeed: 5,
      };
    case 'gbm':
      return { priceStart: p, drift: 0.05, volatility: 0.018 };
    case 'step_ladder':
      return {
        priceStart: p,
        priceEnd: Number((p * 1.06).toFixed(8)),
        steps: 5,
      };
    case 'triangle':
      return {
        priceStart: p,
        priceMin: Number((p * 0.94).toFixed(8)),
        priceEnd: Number((p * 1.02).toFixed(8)),
      };
    case 'exp_trend':
      return { priceStart: p, priceEnd: Number((p * 1.08).toFixed(8)), expFactor: 1.12 };
    default:
      return { priceStart: p };
  }
}

/** Neo ramp theo spot thực — giữ hướng & % từ params client (tránh pump thành dump khi refSpot lệch). */
export function anchorLinearRampParams(
  spot: number,
  params: Pick<PriceModelParams, 'priceStart' | 'priceEnd'>,
): Pick<PriceModelParams, 'priceStart' | 'priceEnd'> {
  const p = spot > 0 ? spot : 1;
  const clientStart = params.priceStart ?? p;
  const clientEnd = params.priceEnd ?? p;
  if (clientStart <= 0) {
    return { priceStart: p, priceEnd: p };
  }
  const intendedUp = clientEnd >= clientStart;
  const ratio = Math.abs(clientEnd / clientStart - 1);
  const r = Math.min(100, Math.max(0, ratio));
  return {
    priceStart: p,
    priceEnd: Number((p * (intendedUp ? 1 + r : 1 - r)).toFixed(8)),
  };
}

/** Neo dải sin theo spot — giữ biên % từ min/max client. */
export function anchorSinBandParams(
  spot: number,
  params: Pick<
    PriceModelParams,
    'priceStart' | 'priceMin' | 'priceMax' | 'waveCycles'
  >,
): Pick<PriceModelParams, 'priceStart' | 'priceMin' | 'priceMax' | 'waveCycles'> {
  const p = spot > 0 ? spot : 1;
  const ref = params.priceStart ?? p;
  const min = params.priceMin ?? ref * 0.97;
  const max = params.priceMax ?? ref * 1.03;
  const halfRatio = ref > 0 ? (max - min) / (2 * ref) : 0.03;
  const band = Math.min(100, Math.max(0.001, halfRatio));
  return {
    priceStart: p,
    priceMin: Number((p * (1 - band)).toFixed(8)),
    priceMax: Number((p * (1 + band)).toFixed(8)),
    waveCycles: params.waveCycles,
  };
}

/**
 * Chuẩn hóa params theo spot token — dùng khi tạo model-run (đặc biệt bulk / refSpot UI lệch).
 */
export function anchorPathParamsToSpot(
  modelId: PriceModelId,
  spot: number,
  params: PriceModelParams,
): PriceModelParams {
  const p = spot > 0 ? spot : 1;
  const out = { ...params };

  switch (modelId) {
    case 'linear_ramp': {
      const anchored = anchorLinearRampParams(p, params);
      return { ...out, ...anchored };
    }
    case 'sin_band': {
      const anchored = anchorSinBandParams(p, params);
      return { ...out, ...anchored };
    }
    case 'step_ladder':
    case 'exp_trend': {
      const anchored = anchorLinearRampParams(p, params);
      return { ...out, priceStart: anchored.priceStart, priceEnd: anchored.priceEnd };
    }
    case 'mean_reversion': {
      const clientStart = params.priceStart ?? p;
      const clientEnd = params.priceEnd ?? p;
      const revertingDown = clientStart > clientEnd;
      const ratio =
        clientEnd > 0 ? Math.abs(clientStart / clientEnd - 1) : 0.04;
      const mag = Math.min(100, Math.max(0.001, ratio || 0.04));
      return {
        ...out,
        priceStart: Number(
          (p * (revertingDown ? 1 + mag : 1 - mag)).toFixed(8),
        ),
        priceEnd: p,
      };
    }
    case 'triangle': {
      const ref = params.priceStart ?? p;
      const low = params.priceMin ?? ref * 0.94;
      const end = params.priceEnd ?? ref * 1.02;
      const dipRatio = ref > 0 ? Math.abs(1 - low / ref) : 0.06;
      const finishRatio = ref > 0 ? end / ref - 1 : 0.02;
      const dip = Math.min(100, Math.max(0.001, dipRatio));
      const finish = Math.max(-0.2, Math.min(0.3, finishRatio));
      return {
        ...out,
        priceStart: p,
        priceMin: Number((p * (1 - dip)).toFixed(8)),
        priceEnd: Number((p * (1 + finish)).toFixed(8)),
      };
    }
    case 'gbm':
      return { ...out, priceStart: p };
    default:
      return { ...out, priceStart: params.priceStart ?? p };
  }
}
