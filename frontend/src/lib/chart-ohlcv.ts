import type { ITokenCryptoLog } from "@/types/token.type";

export type ChartTick = {
  timeMs: number;
  price: number;
  volume: number;
};

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ChartVolumeBar = {
  time: number;
  value: number;
  color: string;
};

const UP_VOL = "rgba(34, 197, 94, 0.55)";
const DOWN_VOL = "rgba(239, 68, 68, 0.55)";

export const CHART_MAX_BARS = 800;
export const CHART_MAX_INTERIOR_GAP_FILL = 3;
const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const MINUTE_MS = 60_000;

/** Khung ngày trở lên: Lightweight Charts yêu cầu BusinessDay, không dùng UTCTimestamp số. */
export function isDailyBucket(bucketMs: number): boolean {
  return bucketMs >= DAY_MS;
}

export function unixSecToBusinessDay(timeSec: number): {
  year: number;
  month: number;
  day: number;
} {
  const d = new Date(timeSec * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** Chuyển unix giây (UTC) → Time cho series (1D+ = BusinessDay). */
export function chartTimeForSeries(
  timeSec: number,
  bucketMs: number
): number | { year: number; month: number; day: number } {
  if (isDailyBucket(bucketMs)) {
    return unixSecToBusinessDay(timeSec);
  }
  return timeSec;
}

function chartTimeSortKey(
  time: number | string | { year: number; month: number; day: number }
): string {
  const sec = timeToUnixSec(time);
  return sec != null ? String(sec) : JSON.stringify(time);
}

/** Sau khi map sang Time cho LW — bỏ trùng, sort tăng dần. */
export function sortUniqueChartTimes<T extends { time: unknown }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = chartTimeSortKey(
      item.time as number | string | { year: number; month: number; day: number }
    );
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort(
    (a, b) =>
      (timeToUnixSec(
        a.time as number | string | { year: number; month: number; day: number }
      ) ?? 0) -
      (timeToUnixSec(
        b.time as number | string | { year: number; month: number; day: number }
      ) ?? 0)
  );
}

/** Đọc Time từ crosshair / chart → unix giây để tra cứu nến nội bộ. */
export function timeToUnixSec(
  time: number | string | { year: number; month: number; day: number }
): number | null {
  if (typeof time === "number" && Number.isFinite(time)) {
    return time;
  }
  if (typeof time === "string") {
    const ms = Date.parse(time);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  if (time && typeof time === "object" && "year" in time) {
    return Math.floor(
      Date.UTC(time.year, time.month - 1, time.day) / 1000
    );
  }
  return null;
}

/** Chuẩn hóa timestamp log (ms) — API có thể trả number hoặc chuỗi số/ISO. */
export function logTimestampMs(log: ITokenCryptoLog): number {
  const raw =
    (log as { timestamp?: unknown; createdAt?: unknown }).timestamp ??
    (log as { createdAt?: unknown }).createdAt;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw >= 1e12 ? raw : raw * 1000;
  }
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return 0;
      return n >= 1e12 ? n : n * 1000;
    }
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/** Tick từ log DB — không chèn spot (xử lý ở buildOhlcvSeries). */
export function logsToTicks(
  logs: ITokenCryptoLog[] | null | undefined
): ChartTick[] {
  return (logs ?? [])
    .map((log) => ({
      timeMs: logTimestampMs(log),
      price: Number(log.price),
      volume: Number.isFinite(Number(log.volume))
        ? Math.max(0, Number(log.volume))
        : 0,
    }))
    .filter((p) => p.timeMs > 0 && Number.isFinite(p.price))
    .sort((a, b) => a.timeMs - b.timeMs);
}

function bucketStartMs(timeMs: number, bucketMs: number): number {
  const d = new Date(timeMs);
  if (bucketMs >= DAY_MS) {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  if (bucketMs >= HOUR_MS) {
    const stepH = Math.max(1, Math.floor(bucketMs / HOUR_MS));
    const h = Math.floor(d.getUTCHours() / stepH) * stepH;
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      h
    );
  }
  if (bucketMs >= MINUTE_MS) {
    const stepM = Math.max(1, Math.floor(bucketMs / MINUTE_MS));
    const m = Math.floor(d.getUTCMinutes() / stepM) * stepM;
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      m
    );
  }
  return Math.floor(timeMs / bucketMs) * bucketMs;
}

type BucketAcc = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  firstMs: number;
};

function aggregateTicks(
  ticks: ChartTick[],
  bucketMs: number
): { candles: ChartCandle[]; volumeBars: ChartVolumeBar[] } {
  const map = new Map<number, BucketAcc>();

  for (const t of ticks) {
    const start = bucketStartMs(t.timeMs, bucketMs);
    const acc = map.get(start);
    if (!acc) {
      map.set(start, {
        open: t.price,
        high: t.price,
        low: t.price,
        close: t.price,
        volume: t.volume,
        firstMs: t.timeMs,
      });
    } else {
      if (t.timeMs < acc.firstMs) {
        acc.open = t.price;
        acc.firstMs = t.timeMs;
      }
      acc.high = Math.max(acc.high, t.price);
      acc.low = Math.min(acc.low, t.price);
      acc.close = t.price;
      acc.volume += t.volume;
    }
  }

  const keys = [...map.keys()].sort((a, b) => a - b);
  const candles: ChartCandle[] = [];
  const volumeBars: ChartVolumeBar[] = [];

  for (const k of keys) {
    const b = map.get(k)!;
    const time = Math.floor(k / 1000);
    candles.push({
      time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    });
    const up = b.close >= b.open;
    volumeBars.push({
      time,
      value: b.volume,
      color: up ? UP_VOL : DOWN_VOL,
    });
  }

  return { candles, volumeBars };
}

function mergeCandle(a: ChartCandle, b: ChartCandle): ChartCandle {
  return {
    time: b.time,
    open: a.open,
    high: Math.max(a.high, b.high),
    low: Math.min(a.low, b.low),
    close: b.close,
  };
}

/** Lấp tối đa N bucket trống giữa hai nến liên tiếp (nến flat). */
function fillSmallInteriorGaps(
  candles: ChartCandle[],
  volumeBars: ChartVolumeBar[],
  bucketMs: number,
  maxGap: number
): { candles: ChartCandle[]; volumeBars: ChartVolumeBar[] } {
  if (candles.length < 2 || maxGap <= 0) {
    return { candles, volumeBars };
  }

  const volByTime = new Map(volumeBars.map((v) => [v.time, v]));
  const outC: ChartCandle[] = [candles[0]];
  const outV: ChartVolumeBar[] = [
    volByTime.get(candles[0].time) ?? {
      time: candles[0].time,
      value: 0,
      color: UP_VOL,
    },
  ];

  for (let i = 1; i < candles.length; i++) {
    const prev = outC[outC.length - 1];
    const next = candles[i];
    const prevMs = prev.time * 1000;
    const nextMs = next.time * 1000;
    const gapBuckets = Math.floor((nextMs - prevMs) / bucketMs) - 1;

    if (gapBuckets > 0 && gapBuckets <= maxGap) {
      let tMs = prevMs + bucketMs;
      let lastClose = prev.close;
      for (let g = 0; g < gapBuckets; g++) {
        const t = Math.floor(tMs / 1000);
        if (t >= next.time) {
          break;
        }
        outC.push({
          time: t,
          open: lastClose,
          high: lastClose,
          low: lastClose,
          close: lastClose,
        });
        outV.push({ time: t, value: 0, color: UP_VOL });
        tMs += bucketMs;
      }
    }

    const tail = outC[outC.length - 1];
    if (tail?.time !== next.time) {
      outC.push(next);
    } else if (tail) {
      outC[outC.length - 1] = mergeCandle(tail, next);
    }

    const lastOut = outC[outC.length - 1];
    if (lastOut?.time === next.time) {
      outV[outV.length - 1] = volByTime.get(next.time) ?? {
        time: next.time,
        value: 0,
        color: next.close >= next.open ? UP_VOL : DOWN_VOL,
      };
    } else {
      outV.push(
        volByTime.get(next.time) ?? {
          time: next.time,
          value: 0,
          color: next.close >= next.open ? UP_VOL : DOWN_VOL,
        }
      );
    }
  }

  return { candles: outC, volumeBars: outV };
}

/** Cập nhật / thêm nến đang hình thành từ giá spot. */
function applyFormingBar(
  candles: ChartCandle[],
  volumeBars: ChartVolumeBar[],
  spotPrice: number,
  bucketMs: number,
  prevLast?: ChartCandle | null
): { candles: ChartCandle[]; volumeBars: ChartVolumeBar[] } {
  if (!Number.isFinite(spotPrice)) {
    return { candles, volumeBars };
  }

  if (candles.length === 0) {
    const nowBucket = bucketStartMs(Date.now(), bucketMs);
    const nowSec = Math.floor(nowBucket / 1000);
    return {
      candles: [
        {
          time: nowSec,
          open: spotPrice,
          high: spotPrice,
          low: spotPrice,
          close: spotPrice,
        },
      ],
      volumeBars: [{ time: nowSec, value: 0, color: UP_VOL }],
    };
  }

  const nowBucket = bucketStartMs(Date.now(), bucketMs);
  const nowSec = Math.floor(nowBucket / 1000);
  const outC = [...candles];
  const outV = [...volumeBars];
  const last = outC[outC.length - 1];

  if (last.time === nowSec) {
    const c = spotPrice;
    const prevHigh =
      prevLast && prevLast.time === nowSec ? Number(prevLast.high) : -Infinity;
    const prevLow =
      prevLast && prevLast.time === nowSec ? Number(prevLast.low) : Infinity;
    const prevOpen =
      prevLast && prevLast.time === nowSec ? Number(prevLast.open) : last.open;
    outC[outC.length - 1] = {
      ...last,
      open: Number.isFinite(prevOpen) ? prevOpen : last.open,
      close: c,
      high: Math.max(last.high, prevHigh, c),
      low: Math.min(last.low, prevLow, c),
    };
    const v = outV[outV.length - 1];
    if (v) {
      outV[outV.length - 1] = {
        ...v,
        color: outC[outC.length - 1].close >= outC[outC.length - 1].open ? UP_VOL : DOWN_VOL,
      };
    }
    return { candles: outC, volumeBars: outV };
  }

  if (nowBucket / 1000 > last.time) {
    const open = last.close;
    outC.push({
      time: nowSec,
      open,
      high: Math.max(open, spotPrice),
      low: Math.min(open, spotPrice),
      close: spotPrice,
    });
    const up = spotPrice >= open;
    outV.push({
      time: nowSec,
      value: 0,
      color: up ? UP_VOL : DOWN_VOL,
    });
  }

  return { candles: outC, volumeBars: outV };
}

function trimToMaxBars(
  candles: ChartCandle[],
  volumeBars: ChartVolumeBar[]
): { candles: ChartCandle[]; volumeBars: ChartVolumeBar[] } {
  if (candles.length <= CHART_MAX_BARS) {
    return { candles, volumeBars };
  }
  const slice = candles.length - CHART_MAX_BARS;
  const c = candles.slice(slice);
  const times = new Set(c.map((x) => x.time));
  const v = volumeBars.filter((b) => times.has(b.time));
  return { candles: c, volumeBars: v };
}

/** Gộp điểm trùng `time` (giữ thứ tự tăng) — tránh lỗi lightweight-charts. */
function dedupeCandles(candles: ChartCandle[]): ChartCandle[] {
  const map = new Map<number, ChartCandle>();
  for (const c of candles) {
    const prev = map.get(c.time);
    map.set(c.time, prev ? mergeCandle(prev, c) : { ...c });
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, c]) => c);
}

function dedupeVolumeBars(
  bars: ChartVolumeBar[],
  candles: ChartCandle[]
): ChartVolumeBar[] {
  const candleByTime = new Map(candles.map((c) => [c.time, c]));
  const map = new Map<number, ChartVolumeBar>();
  for (const b of bars) {
    const prev = map.get(b.time);
    if (!prev) {
      map.set(b.time, { ...b });
    } else {
      const c = candleByTime.get(b.time);
      map.set(b.time, {
        time: b.time,
        value: prev.value + b.value,
        color:
          c && c.close >= c.open
            ? UP_VOL
            : c
              ? DOWN_VOL
              : b.color,
      });
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

function dedupeLinePoints(
  points: { time: number; value: number }[]
): { time: number; value: number }[] {
  const map = new Map<number, number>();
  for (const p of points) {
    map.set(p.time, p.value);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time, value }));
}

/** Chuỗi area tối thiểu khi chỉ có 0–1 bucket thật. */
export function buildAreaFallback(
  ticks: ChartTick[],
  spotPrice?: number | null
): { time: number; value: number }[] {
  const pts: { timeMs: number; value: number }[] = ticks.map((t) => ({
    timeMs: t.timeMs,
    value: t.price,
  }));
  if (spotPrice != null && Number.isFinite(spotPrice)) {
    const nowMs = Date.now();
    const last = pts[pts.length - 1];
    if (last && Math.floor(last.timeMs / 1000) >= Math.floor(nowMs / 1000)) {
      pts[pts.length - 1] = { ...last, value: spotPrice };
    } else {
      pts.push({
        timeMs: Math.max(nowMs, (last?.timeMs ?? 0) + 1000),
        value: spotPrice,
      });
    }
  }
  if (pts.length === 0) return [];
  if (pts.length === 1) {
    const p = pts[0];
    pts.unshift({ timeMs: p.timeMs - 3600_000, value: p.value });
  }
  const raw = pts.map((p) => ({
    time: Math.floor(p.timeMs / 1000),
    value: p.value,
  }));
  return dedupeLinePoints(raw);
}

export type OhlcvSeriesResult = {
  candles: ChartCandle[];
  volumeBars: ChartVolumeBar[];
  lineData: { time: number; value: number }[];
  mode: "candle" | "area";
};

/**
 * Pipeline OHLCV chuẩn sàn từ TokenCryptoLog + spot.
 */
export function buildOhlcvSeries(
  logs: ITokenCryptoLog[] | null | undefined,
  bucketMs: number,
  spotPrice?: number | null,
  options?: {
    fillSmallGaps?: boolean;
    maxBars?: number;
    /** Giữ forming-bar wick qua các lần render (spot nhảy nhanh). */
    prevCandles?: ChartCandle[];
  }
): OhlcvSeriesResult {
  const ticks = logsToTicks(logs);
  const maxBars = options?.maxBars ?? CHART_MAX_BARS;

  if (ticks.length === 0 && spotPrice == null) {
    return { candles: [], volumeBars: [], lineData: [], mode: "area" };
  }

  let { candles, volumeBars } = aggregateTicks(ticks, bucketMs);

  if (options?.fillSmallGaps !== false && !isDailyBucket(bucketMs)) {
    ({ candles, volumeBars } = fillSmallInteriorGaps(
      candles,
      volumeBars,
      bucketMs,
      CHART_MAX_INTERIOR_GAP_FILL
    ));
  }

  if (spotPrice != null && Number.isFinite(spotPrice)) {
    const prevLast =
      options?.prevCandles && options.prevCandles.length > 0
        ? options.prevCandles[options.prevCandles.length - 1]
        : null;
    ({ candles, volumeBars } = applyFormingBar(
      candles,
      volumeBars,
      spotPrice,
      bucketMs,
      prevLast
    ));
  }

  ({ candles, volumeBars } = trimToMaxBars(candles, volumeBars));
  if (candles.length > maxBars) {
    const slice = candles.length - maxBars;
    candles = candles.slice(slice);
    const times = new Set(candles.map((c) => c.time));
    volumeBars = volumeBars.filter((v) => times.has(v.time));
  }

  candles = dedupeCandles(candles);
  volumeBars = dedupeVolumeBars(volumeBars, candles);

  const lineData = dedupeLinePoints(
    candles.map((c) => ({ time: c.time, value: c.close }))
  );
  if (candles.length >= 2) {
    return { candles, volumeBars, lineData, mode: "candle" };
  }

  const area = buildAreaFallback(ticks, spotPrice);
  return {
    candles: [],
    volumeBars: [],
    lineData: area,
    mode: "area",
  };
}

/** @deprecated Dùng buildOhlcvSeries — giữ export cũ cho import ngắn. */
export function logsToPricePoints(
  logs: ITokenCryptoLog[] | null | undefined,
  _spotPrice?: number | null
): ChartTick[] {
  return logsToTicks(logs);
}

export type Candle = ChartCandle;
export type VolumeBar = ChartVolumeBar;

export function bucketCandles(
  points: ChartTick[],
  bucketMs: number
): ChartCandle[] {
  return buildOhlcvSeries(
    points.map((p, i) => ({
      id: `pt-${i}`,
      tokenId: "",
      price: p.price,
      volume: p.volume,
      timestamp: new Date(p.timeMs),
      hash: "",
    })),
    bucketMs,
    null,
    { fillSmallGaps: false }
  ).candles;
}

export function bucketVolumeBars(
  points: ChartTick[],
  bucketMs: number
): ChartVolumeBar[] {
  return buildOhlcvSeries(
    points.map((p, i) => ({
      id: `pt-${i}`,
      tokenId: "",
      price: p.price,
      volume: p.volume,
      timestamp: new Date(p.timeMs),
      hash: "",
    })),
    bucketMs,
    null,
    { fillSmallGaps: false }
  ).volumeBars;
}

export function bucketCloseLineSeries(
  points: ChartTick[],
  bucketMs: number
): { time: number; value: number }[] {
  return buildOhlcvSeries(
    points.map((p, i) => ({
      id: `pt-${i}`,
      tokenId: "",
      price: p.price,
      volume: p.volume,
      timestamp: new Date(p.timeMs),
      hash: "",
    })),
    bucketMs,
    null,
    { fillSmallGaps: false }
  ).lineData;
}
