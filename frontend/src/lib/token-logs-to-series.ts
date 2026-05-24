/**
 * Re-export pipeline OHLCV — logic tại chart-ohlcv.ts (đặc tả: docs/CHART_CANDLESTICK_SPEC.md).
 */
export {
  buildOhlcvSeries,
  buildAreaFallback,
  logsToTicks,
  logsToPricePoints,
  bucketCandles,
  bucketVolumeBars,
  bucketCloseLineSeries,
  type ChartCandle as Candle,
  type ChartVolumeBar as VolumeBar,
  type ChartTick as PricePoint,
} from "@/lib/chart-ohlcv";
