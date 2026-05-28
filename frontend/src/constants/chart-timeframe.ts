/**
 * Khung thời gian nến — căn docs/CHART_CANDLESTICK_SPEC.md
 */
export type ChartTimeframe = {
  id: string;
  label: string;
  bucketMs: number;
};

/** UI chính: bỏ sub-minute (log không đủ mật độ). */
export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { id: "1m", label: "1m", bucketMs: 60_000 },
  { id: "3m", label: "3m", bucketMs: 3 * 60_000 },
  { id: "5m", label: "5m", bucketMs: 5 * 60_000 },
  { id: "15m", label: "15m", bucketMs: 15 * 60_000 },
  { id: "30m", label: "30m", bucketMs: 30 * 60_000 },
  { id: "1h", label: "1h", bucketMs: 60 * 60_000 },
  { id: "4h", label: "4h", bucketMs: 4 * 60 * 60_000 },
  { id: "1d", label: "1D", bucketMs: 24 * 60 * 60_000 },
];

/** Trade: 1m mặc định — nhiều log/khớp hơn, nến có râu rõ hơn. */
export const DEFAULT_CHART_TIMEFRAME_ID = "1m";

/** Token detail: có thể xem rộng hơn. */
export const DEFAULT_CHART_TIMEFRAME_DETAIL_ID = "15m";

export function getChartTimeframe(id: string | undefined): ChartTimeframe {
  const found = CHART_TIMEFRAMES.find((t) => t.id === id);
  return (
    found ??
    CHART_TIMEFRAMES.find((t) => t.id === DEFAULT_CHART_TIMEFRAME_ID)!
  );
}
