"use client";

import {
  CHART_CHROME_HEIGHT_PX,
  CHART_DEFAULT_BAR_SPACING,
  CHART_INITIAL_VISIBLE_BARS,
  CHART_MAX_BAR_SPACING,
  CHART_MIN_BAR_SPACING,
  CHART_MIN_BARS_FOR_RECENT_WINDOW,
  CHART_PLOT_SIDE_RESERVE_PX,
  CHART_PRICE_SCALE_MARGINS,
  CHART_ZOOM_BUTTON_FACTOR,
} from "@/constants/chart-layout";
import {
  CHART_TIMEFRAMES,
  DEFAULT_CHART_TIMEFRAME_DETAIL_ID,
  DEFAULT_CHART_TIMEFRAME_ID,
  getChartTimeframe,
} from "@/constants/chart-timeframe";
import {
  buildOhlcvSeries,
  chartTimeForSeries,
  isDailyBucket,
  sortUniqueChartTimes,
  timeToUnixSec,
  type ChartCandle,
} from "@/lib/chart-ohlcv";
import { cn } from "@/lib/cn";
import type { ITokenCryptoLog } from "@/types/token.type";
import type {
  IChartApi,
  ISeriesApi,
  LogicalRange,
  MouseEventParams,
  SeriesType,
  Time,
} from "lightweight-charts";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChartViewportMode = "recent-bars" | "fit-all";

type Props = {
  logs: ITokenCryptoLog[] | null | undefined;
  spotPrice?: number | null;
  loading?: boolean;
  className?: string;
  defaultTimeframeId?: string;
  /** Đồng bộ khung TG từ parent (vd. lưới admin) */
  controlledTimeframeId?: string;
  /** Ẩn toolbar TG/zoom — dùng TG chung trên trang */
  hideToolbar?: boolean;
  fixedHeightPx?: number;
  fillHeight?: boolean;
  viewportMode?: ChartViewportMode;
  /** Số nến cuối khi `viewportMode="recent-bars"` (mặc định trade). */
  initialVisibleBars?: number;
  /** Theo dõi nến mới (scroll realtime) — tắt trên lưới admin */
  autoFollowRealtime?: boolean;
  /** Pane volume dưới nến (Binance-style). */
  showVolume?: boolean;
};

type LegendState = {
  timeLabel: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

const CHART_BG = "#12181f";
const GRID = "rgba(255,255,255,0.06)";
const UP = "#22c55e";
const DOWN = "#ef4444";

function isLogicalRange(r: LogicalRange | null | undefined): r is LogicalRange {
  return (
    r != null &&
    typeof r.from === "number" &&
    typeof r.to === "number" &&
    Number.isFinite(r.from) &&
    Number.isFinite(r.to)
  );
}

function plotHeightPx(opts: {
  fixedHeightPx?: number;
  chromeHeight: number;
  plotEl: HTMLDivElement | null;
}): number {
  const { fixedHeightPx, chromeHeight, plotEl } = opts;
  if (plotEl?.clientHeight && plotEl.clientHeight > 0) {
    return Math.max(200, plotEl.clientHeight);
  }
  if (fixedHeightPx != null) {
    return Math.max(200, fixedHeightPx - chromeHeight);
  }
  return 400;
}

function plotUsableWidthPx(plotWidthPx: number): number {
  return Math.max(240, plotWidthPx - CHART_PLOT_SIDE_RESERVE_PX);
}

function resolveRightOffset(barCount: number): number {
  if (barCount <= 4) return 2;
  if (barCount <= 12) return 4;
  if (barCount <= 40) return 6;
  return 8;
}

function barSpacingForSlots(
  plotWidthPx: number,
  slotCount: number,
  fallback = CHART_DEFAULT_BAR_SPACING
): number {
  if (slotCount <= 0) return fallback;
  return Math.min(
    56,
    Math.max(
      CHART_MIN_BAR_SPACING,
      plotUsableWidthPx(plotWidthPx) / slotCount
    )
  );
}

/** Giới hạn zoom wheel / pinch (barSpacing lớn = phóng to nến). */
function applyTimeScaleZoomLimits(
  chart: IChartApi,
  opts: { barSpacing?: number; rightOffset?: number } = {}
) {
  const barSpacing = opts.barSpacing ?? CHART_DEFAULT_BAR_SPACING;
  const rightOffset = opts.rightOffset ?? 8;
  chart.applyOptions({
    timeScale: {
      barSpacing,
      minBarSpacing: CHART_MIN_BAR_SPACING,
      maxBarSpacing: CHART_MAX_BAR_SPACING,
      rightOffset,
      fixLeftEdge: false,
      fixRightEdge: false,
    },
  });
}

/**
 * Fit ngang khi ít nến; cửa sổ N nến cuối khi đủ dữ liệu.
 * Tránh rightOffset=8 + barSpacing cố định → 2 nến dồn trái, trống phải.
 */
function applySmartViewport(
  chart: IChartApi,
  barCount: number,
  opts: {
    plotWidthPx: number;
    visibleBars: number;
    mode: ChartViewportMode;
  }
) {
  const { plotWidthPx, visibleBars, mode } = opts;
  const rightOffset = resolveRightOffset(barCount);

  if (barCount <= 1 || mode === "fit-all") {
    const slots = Math.max(barCount + rightOffset, 6);
    applyTimeScaleZoomLimits(chart, {
      barSpacing: barSpacingForSlots(plotWidthPx, slots),
      rightOffset,
    });
    chart.timeScale().fitContent();
    if (barCount > 0) chart.timeScale().scrollToRealTime();
    return;
  }

  if (barCount < CHART_MIN_BARS_FOR_RECENT_WINDOW) {
    const slots = Math.max(barCount + rightOffset, 8);
    applyTimeScaleZoomLimits(chart, {
      barSpacing: barSpacingForSlots(plotWidthPx, slots, 10),
      rightOffset,
    });
    chart.timeScale().fitContent();
    chart.timeScale().scrollToRealTime();
    return;
  }

  const count = Math.min(visibleBars, barCount);
  const slots = count + rightOffset;
  applyTimeScaleZoomLimits(chart, {
    barSpacing: barSpacingForSlots(plotWidthPx, slots),
    rightOffset,
  });
  chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, barCount - count - 0.5),
    to: barCount + 0.5,
  });
  chart.timeScale().scrollToRealTime();
}

function canIncrementalCandleUpdate(
  prev: ChartCandle[],
  next: ChartCandle[]
): boolean {
  if (next.length === 0 || prev.length === 0) return false;
  if (next.length === prev.length) {
    return prev[prev.length - 1].time === next[next.length - 1].time;
  }
  if (next.length !== prev.length + 1) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].time !== next[i].time) return false;
  }
  return true;
}

/** Cùng bucket — chỉ OHLC đổi (giá live / forming bar). */
function isFormingBarOnlyChange(
  prev: ChartCandle[],
  next: ChartCandle[]
): boolean {
  if (next.length === 0 || prev.length === 0 || next.length !== prev.length) {
    return false;
  }
  const p = prev[prev.length - 1];
  const n = next[next.length - 1];
  if (p.time !== n.time) return false;
  return (
    p.open !== n.open ||
    p.high !== n.high ||
    p.low !== n.low ||
    p.close !== n.close
  );
}

function formatChartPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

function formatLegendTime(
  time: Time,
  opts: { showSeconds: boolean; daily: boolean }
): string {
  const sec = timeToUnixSec(
    time as number | string | { year: number; month: number; day: number }
  );
  if (sec == null) return "—";
  if (opts.daily) {
    return new Date(sec * 1000).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return new Date(sec * 1000).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: opts.showSeconds ? "2-digit" : undefined,
  });
}

function candleAtTime(candles: ChartCandle[], time: Time): ChartCandle | undefined {
  const t = timeToUnixSec(
    time as number | string | { year: number; month: number; day: number }
  );
  if (t == null) return undefined;
  return candles.find((c) => c.time === t);
}

/** Log đầy đủ tải sau — cần fit lại (tránh kẹt viewport 2 nến/area). */
function needsViewportBootstrap(prevBarCount: number, barCount: number): boolean {
  if (barCount <= 0) return false;
  if (prevBarCount <= 0) return true;
  if (
    prevBarCount < CHART_MIN_BARS_FOR_RECENT_WINDOW &&
    barCount >= CHART_MIN_BARS_FOR_RECENT_WINDOW
  ) {
    return true;
  }
  if (prevBarCount < 8 && barCount >= 8) return true;
  if (barCount - prevBarCount >= 12) return true;
  return false;
}

function isNearRealtimeEdge(chart: IChartApi, barCount: number): boolean {
  const logical = chart.timeScale().getVisibleLogicalRange();
  if (!isLogicalRange(logical) || barCount <= 0) return true;
  return logical.to >= barCount - 2;
}

/**
 * Biểu đồ nến OHLC + volume — Lightweight Charts v5.
 * @see docs/CHART_CANDLESTICK_SPEC.md
 */
export default function DbTokenPriceChart({
  logs,
  spotPrice,
  loading,
  className,
  defaultTimeframeId,
  controlledTimeframeId,
  hideToolbar = false,
  fixedHeightPx,
  fillHeight = false,
  viewportMode = "fit-all",
  initialVisibleBars = CHART_INITIAL_VISIBLE_BARS,
  autoFollowRealtime = true,
  showVolume = true,
}: Props) {
  const initialTf =
    defaultTimeframeId ??
    controlledTimeframeId ??
    (viewportMode === "recent-bars"
      ? DEFAULT_CHART_TIMEFRAME_ID
      : DEFAULT_CHART_TIMEFRAME_DETAIL_ID);

  const [timeframeId, setTimeframeId] = useState(initialTf);

  useEffect(() => {
    if (controlledTimeframeId) {
      setTimeframeId(controlledTimeframeId);
    }
  }, [controlledTimeframeId]);
  const [legend, setLegend] = useState<LegendState | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const bucketMs = getChartTimeframe(timeframeId).bucketMs;

  const containerRef = useRef<HTMLDivElement>(null);
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const seriesModeRef = useRef<"candle" | "area" | null>(null);
  const candlesRef = useRef<ChartCandle[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);
  const lcModRef = useRef<typeof import("lightweight-charts") | null>(null);

  const userLockedViewRef = useRef(false);
  const programmaticRef = useRef(false);
  const hasInitialViewportRef = useRef(false);
  const prevViewportBarCountRef = useRef(0);
  const savedLogicalRef = useRef<LogicalRange | null>(null);
  const prevCandlesRef = useRef<ChartCandle[]>([]);
  const prevMainLenRef = useRef(0);
  const prevMainLastTimeRef = useRef<number | null>(null);
  const seriesHasDataRef = useRef(false);

  const chartData = useMemo(
    () =>
      buildOhlcvSeries(logs, bucketMs, spotPrice, {
        prevCandles: prevCandlesRef.current,
      }),
    [logs, bucketMs, spotPrice]
  );

  useEffect(() => {
    candlesRef.current = chartData.candles;
  }, [chartData.candles]);

  const hasData =
    chartData.candles.length > 0 || chartData.lineData.length > 0;
  /** Mount chart khi đã có dữ liệu; refetch không gỡ chart (tránh “lót lại” cả khung). */
  const plotReady = hasData;
  const showInitialLoading = Boolean(loading && !hasData);

  const resolvePlotHeight = useCallback(
    () =>
      plotHeightPx({
        fixedHeightPx,
        chromeHeight: hideToolbar
          ? 0
          : (chromeRef.current?.offsetHeight ?? CHART_CHROME_HEIGHT_PX),
        plotEl: plotWrapRef.current,
      }),
    [fixedHeightPx, hideToolbar]
  );

  const resetViewLocks = useCallback(() => {
    userLockedViewRef.current = false;
    savedLogicalRef.current = null;
    hasInitialViewportRef.current = false;
    prevViewportBarCountRef.current = 0;
    prevCandlesRef.current = [];
    prevMainLenRef.current = 0;
    prevMainLastTimeRef.current = null;
    seriesHasDataRef.current = false;
  }, []);

  const goToRecent = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    resetViewLocks();
    programmaticRef.current = true;
    const n = Math.max(
      chartData.candles.length,
      chartData.lineData.length,
      1
    );
    applySmartViewport(chart, n, {
      plotWidthPx: containerRef.current?.clientWidth ?? 640,
      visibleBars: initialVisibleBars,
      mode: viewportMode,
    });
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, [
    chartData.candles.length,
    chartData.lineData.length,
    initialVisibleBars,
    resetViewLocks,
    viewportMode,
  ]);

  const goToFit = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    resetViewLocks();
    programmaticRef.current = true;
    chart.timeScale().fitContent();
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, [resetViewLocks]);

  /** factor > 1: nến to hơn (zoom in); < 1: zoom out */
  const zoomBarSpacing = useCallback((factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const current = ts.options().barSpacing ?? CHART_DEFAULT_BAR_SPACING;
    const next = Math.min(
      CHART_MAX_BAR_SPACING,
      Math.max(CHART_MIN_BAR_SPACING, current * factor)
    );
    programmaticRef.current = true;
    ts.applyOptions({ barSpacing: next });
    const logical = ts.getVisibleLogicalRange();
    if (isLogicalRange(logical)) {
      savedLogicalRef.current = { from: logical.from, to: logical.to };
      userLockedViewRef.current = true;
    }
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, []);

  const zoomIn = useCallback(() => {
    zoomBarSpacing(CHART_ZOOM_BUTTON_FACTOR);
  }, [zoomBarSpacing]);

  const zoomOut = useCallback(() => {
    zoomBarSpacing(1 / CHART_ZOOM_BUTTON_FACTOR);
  }, [zoomBarSpacing]);

  const destroyChart = useCallback(() => {
    roRef.current?.disconnect();
    roRef.current = null;
    chartRef.current?.remove();
    chartRef.current = null;
    mainSeriesRef.current = null;
    volumeSeriesRef.current = null;
    seriesModeRef.current = null;
    seriesHasDataRef.current = false;
    setChartReady(false);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !plotReady) {
      destroyChart();
      setLegend(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const mod = lcModRef.current ?? (await import("lightweight-charts"));
      if (cancelled) return;
      lcModRef.current = mod;

      destroyChart();
      hasInitialViewportRef.current = false;
      resetViewLocks();

      const showSeconds = bucketMs < 60_000;
      const chart = mod.createChart(el, {
        layout: {
          background: { type: mod.ColorType.Solid, color: CHART_BG },
          textColor: "#8b939e",
          panes: {
            separatorColor: "rgba(255,255,255,0.1)",
            separatorHoverColor: "rgba(34, 197, 94, 0.2)",
            enableResize: true,
          },
        },
        grid: {
          vertLines: { color: GRID },
          horzLines: { color: GRID },
        },
        crosshair: {
          mode: mod.CrosshairMode.Normal,
          vertLine: {
            width: 1,
            color: "rgba(34, 197, 94, 0.5)",
            labelBackgroundColor: "#1a2330",
          },
          horzLine: {
            width: 1,
            color: "rgba(34, 197, 94, 0.5)",
            labelBackgroundColor: "#1a2330",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.12)",
          minimumWidth: 72,
          autoScale: true,
          scaleMargins: CHART_PRICE_SCALE_MARGINS,
        },
        leftPriceScale: { visible: false },
        timeScale: {
          borderColor: "rgba(255,255,255,0.08)",
          timeVisible: true,
          secondsVisible: showSeconds,
          rightOffset: 8,
          shiftVisibleRangeOnNewBar: true,
          rightBarStaysOnScroll: true,
          barSpacing: CHART_DEFAULT_BAR_SPACING,
          minBarSpacing: CHART_MIN_BAR_SPACING,
          maxBarSpacing: CHART_MAX_BAR_SPACING,
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: { time: true, price: false },
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        localization: { priceFormatter: formatChartPrice },
        height: resolvePlotHeight(),
        width: Math.max(el.clientWidth, 280),
      });

      chartRef.current = chart;

      if (showVolume) {
        const panes = chart.panes();
        if (panes[0]) panes[0].setStretchFactor(7);
        if (panes[1]) panes[1].setStretchFactor(3);
      }

      const onRangeChange = () => {
        if (programmaticRef.current) return;
        const logical = chart.timeScale().getVisibleLogicalRange();
        if (isLogicalRange(logical)) {
          savedLogicalRef.current = {
            from: logical.from,
            to: logical.to,
          };
          userLockedViewRef.current = true;
        }
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

      const onCrosshair = (param: MouseEventParams<Time>) => {
        if (!param.time || param.point == null) {
          setLegend(null);
          return;
        }
        const candle = candleAtTime(candlesRef.current, param.time);
        if (candle) {
          setLegend({
            timeLabel: formatLegendTime(param.time, {
              showSeconds,
              daily: isDailyBucket(bucketMs),
            }),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });
        } else {
          const main = mainSeriesRef.current;
          const md =
            main && param.seriesData
              ? (param.seriesData.get(main) as
                  | { value?: number; close?: number }
                  | undefined)
              : undefined;
          const close =
            md && typeof md.close === "number"
              ? md.close
              : md && typeof md.value === "number"
                ? md.value
                : undefined;
          setLegend({
            timeLabel: formatLegendTime(param.time, {
              showSeconds,
              daily: isDailyBucket(bucketMs),
            }),
            close,
          });
        }
      };
      chart.subscribeCrosshairMove(onCrosshair);

      const ro = new ResizeObserver(() => {
        if (!containerRef.current || !chartRef.current) return;
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: resolvePlotHeight(),
        });
      });
      ro.observe(plotWrapRef.current ?? el);
      roRef.current = ro;

      setChartReady(true);
    })();

    return () => {
      cancelled = true;
      destroyChart();
    };
  }, [
    bucketMs,
    plotReady,
    destroyChart,
    resetViewLocks,
    resolvePlotHeight,
    showVolume,
  ]);

  useEffect(() => {
    if (!chartReady || !chartRef.current || !lcModRef.current || !plotReady) {
      return;
    }

    const mod = lcModRef.current;
    const chart = chartRef.current;
    const { candles, lineData, volumeBars, mode } = chartData;
    const barCount = Math.max(candles.length, lineData.length, 1);

    chart.applyOptions({
      timeScale: { secondsVisible: bucketMs < 60_000 },
    });

    if (seriesModeRef.current !== mode || !mainSeriesRef.current) {
      if (volumeSeriesRef.current) {
        chart.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }
      if (mainSeriesRef.current) {
        chart.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
      }
      if (mode === "candle" && candles.length > 0) {
        mainSeriesRef.current = chart.addSeries(
          mod.CandlestickSeries,
          {
            upColor: UP,
            downColor: DOWN,
            borderUpColor: UP,
            borderDownColor: DOWN,
            wickUpColor: UP,
            wickDownColor: DOWN,
            lastValueVisible: true,
            priceLineVisible: true,
            priceLineWidth: 1,
            priceLineColor: UP,
          },
          0
        );
        if (showVolume) {
          volumeSeriesRef.current = chart.addSeries(
            mod.HistogramSeries,
            {
              priceFormat: { type: "volume" },
              lastValueVisible: false,
              priceLineVisible: false,
            },
            1
          );
          volumeSeriesRef.current.priceScale().applyOptions({
            scaleMargins: { top: 0.08, bottom: 0 },
          });
        }
      } else if (lineData.length > 0) {
        mainSeriesRef.current = chart.addSeries(
          mod.AreaSeries,
          {
            lineColor: UP,
            topColor: "rgba(34, 197, 94, 0.28)",
            bottomColor: "rgba(34, 197, 94, 0.02)",
            lineWidth: 2,
          },
          0
        );
      }
      seriesModeRef.current = mainSeriesRef.current ? mode : null;
      prevCandlesRef.current = [];
      prevMainLenRef.current = 0;
      prevMainLastTimeRef.current = null;
      seriesHasDataRef.current = false;
      hasInitialViewportRef.current = false;
      prevViewportBarCountRef.current = 0;
    }

    const main = mainSeriesRef.current;
    if (!main) return;

    const preserve =
      userLockedViewRef.current && savedLogicalRef.current != null;
    programmaticRef.current = true;

    const candlePayload = sortUniqueChartTimes(
      candles.map((c) => ({
        time: chartTimeForSeries(c.time, bucketMs) as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    const linePayload = sortUniqueChartTimes(
      lineData.map((d) => ({
        time: chartTimeForSeries(d.time, bucketMs) as Time,
        value: d.value,
      }))
    );

    const prevC = prevCandlesRef.current;

    if (mode === "candle" && candlePayload.length > 0) {
      const last = candlePayload[candlePayload.length - 1];
      const canUpdate =
        seriesHasDataRef.current &&
        (isFormingBarOnlyChange(prevC, candles) ||
          canIncrementalCandleUpdate(prevC, candles));
      if (canUpdate) {
        main.update(last);
      } else {
        main.setData(candlePayload);
        seriesHasDataRef.current = true;
      }
      prevCandlesRef.current = candles;

      if (volumeSeriesRef.current && volumeBars.length > 0) {
        const volPayload = sortUniqueChartTimes(
          volumeBars.map((v) => ({
            time: chartTimeForSeries(v.time, bucketMs) as Time,
            value: v.value,
            color: v.color,
          }))
        );
        const volSeries = volumeSeriesRef.current;
        const volLast = volPayload[volPayload.length - 1];
        const canVolUpdate =
          seriesHasDataRef.current &&
          (isFormingBarOnlyChange(prevC, candles) ||
            canIncrementalCandleUpdate(prevC, candles));
        if (canVolUpdate && volLast) {
          volSeries.update(volLast);
        } else {
          volSeries.setData(volPayload);
        }
      }
    } else if (linePayload.length > 0) {
      const last = linePayload[linePayload.length - 1];
      const lastTime = timeToUnixSec(
        last.time as number | string | { year: number; month: number; day: number }
      );
      const livePointUpdate =
        seriesHasDataRef.current &&
        lastTime != null &&
        linePayload.length === prevMainLenRef.current &&
        prevMainLastTimeRef.current === lastTime;
      const canUpdate =
        livePointUpdate ||
        (seriesHasDataRef.current &&
          preserve &&
          prevMainLenRef.current > 0 &&
          (linePayload.length === prevMainLenRef.current ||
            linePayload.length === prevMainLenRef.current + 1));
      if (canUpdate) {
        main.update(last);
      } else {
        main.setData(linePayload);
        seriesHasDataRef.current = true;
      }
      prevMainLenRef.current = linePayload.length;
      prevMainLastTimeRef.current = lastTime;
      prevCandlesRef.current = [];
    }

    const applyInitialViewport = () => {
      const prevBar = prevViewportBarCountRef.current;
      const rebootstrap = needsViewportBootstrap(prevBar, barCount);

      if (preserve && savedLogicalRef.current && !rebootstrap) {
        chart.timeScale().setVisibleLogicalRange(savedLogicalRef.current);
        return;
      }
      if (hasInitialViewportRef.current && !rebootstrap) {
        const newBar =
          candles.length > prevC.length &&
          canIncrementalCandleUpdate(prevC, candles);
        if (
          autoFollowRealtime &&
          !userLockedViewRef.current &&
          isNearRealtimeEdge(chart, barCount) &&
          (newBar || isFormingBarOnlyChange(prevC, candles))
        ) {
          chart.timeScale().scrollToRealTime();
        }
        prevViewportBarCountRef.current = barCount;
        return;
      }
      programmaticRef.current = true;
      applySmartViewport(chart, barCount, {
        plotWidthPx: containerRef.current?.clientWidth ?? 640,
        visibleBars: initialVisibleBars,
        mode: viewportMode,
      });
      hasInitialViewportRef.current = true;
      prevViewportBarCountRef.current = barCount;
    };

    requestAnimationFrame(() => {
      applyInitialViewport();
      requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    });
  }, [
    autoFollowRealtime,
    chartData,
    chartReady,
    bucketMs,
    initialVisibleBars,
    plotReady,
    viewportMode,
    showVolume,
  ]);

  useEffect(() => {
    if (!chartReady || !chartRef.current) return;
    const w = containerRef.current?.clientWidth;
    chartRef.current.applyOptions({
      width: w,
      height: resolvePlotHeight(),
    });
    if (
      w &&
      hasInitialViewportRef.current &&
      !userLockedViewRef.current &&
      chartData.candles.length < CHART_MIN_BARS_FOR_RECENT_WINDOW
    ) {
      programmaticRef.current = true;
      const n = Math.max(
        chartData.candles.length,
        chartData.lineData.length,
        1
      );
      applySmartViewport(chartRef.current, n, {
        plotWidthPx: w,
        visibleBars: initialVisibleBars,
        mode: viewportMode,
      });
      requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    }
  }, [
    chartReady,
    chartData.candles.length,
    chartData.lineData.length,
    fillHeight,
    initialVisibleBars,
    resolvePlotHeight,
    viewportMode,
  ]);

  const lastCandle = chartData.candles[chartData.candles.length - 1];

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-kc-border bg-kc-surface/40 px-2 py-1.5 sm:px-3">
      <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-wide text-kc-muted">
        TG
      </span>
      {CHART_TIMEFRAMES.map((tf) => (
        <button
          key={tf.id}
          type="button"
          onClick={() => {
            setTimeframeId(tf.id);
            resetViewLocks();
          }}
          className={clsx(
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:text-xs",
            timeframeId === tf.id
              ? "bg-kc-accent/20 text-kc-accent"
              : "text-kc-muted hover:bg-white/[0.06] hover:text-kc-fg"
          )}
        >
          {tf.label}
        </button>
      ))}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <span
          className="mr-0.5 hidden text-[10px] text-kc-muted sm:inline"
          title="Cuộn wheel trên biểu đồ để zoom; kéo để pan"
        >
          Zoom
        </span>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-kc-border text-sm font-medium text-kc-muted hover:border-kc-border-strong hover:text-kc-fg"
        >
          −
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-kc-border text-sm font-medium text-kc-muted hover:border-kc-border-strong hover:text-kc-fg"
        >
          +
        </button>
        <button
          type="button"
          onClick={goToRecent}
          className="rounded-md border border-kc-border px-2 py-1 text-[11px] font-medium text-kc-muted hover:border-kc-border-strong hover:text-kc-fg"
        >
          Mới nhất
        </button>
        <button
          type="button"
          onClick={goToFit}
          className="rounded-md border border-kc-border px-2 py-1 text-[11px] font-medium text-kc-muted hover:border-kc-border-strong hover:text-kc-fg"
        >
          Fit
        </button>
      </div>
    </div>
  );

  const legendBar = (
    <div className="num flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-kc-border bg-kc-bg/80 px-2 py-1.5 text-[10px] sm:px-3 sm:text-[11px]">
      {legend ? (
        <>
          <span className="text-kc-muted">{legend.timeLabel}</span>
          {legend.open != null && (
            <span>
              <span className="text-kc-muted">O </span>
              <span className="text-kc-fg">{formatChartPrice(legend.open)}</span>
            </span>
          )}
          {legend.high != null && (
            <span>
              <span className="text-kc-muted">H </span>
              <span className="text-kc-up">{formatChartPrice(legend.high)}</span>
            </span>
          )}
          {legend.low != null && (
            <span>
              <span className="text-kc-muted">L </span>
              <span className="text-kc-down">{formatChartPrice(legend.low)}</span>
            </span>
          )}
          {legend.close != null && (
            <span>
              <span className="text-kc-muted">C </span>
              <span className="font-medium text-kc-fg">
                {formatChartPrice(legend.close)}
              </span>
            </span>
          )}
        </>
      ) : lastCandle ? (
        <>
          <span className="text-kc-muted">Mới nhất</span>
          <span>
            <span className="text-kc-muted">O </span>
            {formatChartPrice(lastCandle.open)}
          </span>
          <span>
            <span className="text-kc-muted">H </span>
            <span className="text-kc-up">{formatChartPrice(lastCandle.high)}</span>
          </span>
          <span>
            <span className="text-kc-muted">L </span>
            <span className="text-kc-down">{formatChartPrice(lastCandle.low)}</span>
          </span>
          <span>
            <span className="text-kc-muted">C </span>
            <span className="font-medium text-kc-fg">
              {formatChartPrice(lastCandle.close)}
            </span>
          </span>
        </>
      ) : (
        <span className="text-kc-muted">Rê chuột trên biểu đồ để xem OHLC</span>
      )}
    </div>
  );

  const rootStyle =
    fixedHeightPx != null
      ? ({
          height: fixedHeightPx,
          minHeight: fixedHeightPx,
          maxHeight: fixedHeightPx,
        } as const)
      : undefined;

  /** Plot area flex-1 when parent supplies height (fillHeight or fixedHeightPx). */
  const plotFillsRemaining = fillHeight || fixedHeightPx != null;

  if (showInitialLoading) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col overflow-hidden",
          fillHeight ? "h-full min-h-0" : fixedHeightPx == null ? "min-h-[300px]" : "",
          className
        )}
        style={rootStyle}
      >
        {!hideToolbar ? toolbar : null}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-sm text-kc-muted">
          Đang tải lịch sử giá…
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col overflow-hidden",
          fillHeight ? "h-full min-h-0" : fixedHeightPx == null ? "min-h-[300px]" : "",
          className
        )}
        style={rootStyle}
      >
        {!hideToolbar ? toolbar : null}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-kc-muted">
          Chưa có lịch sử giá. Sau khi có giao dịch khớp (ghi{" "}
          <code className="rounded bg-kc-bg px-1 text-xs">TokenCryptoLog</code>
          ), nến sẽ hiển thị tại đây.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden",
        fillHeight ? "h-full min-h-0" : fixedHeightPx == null ? "shrink-0" : "",
        className
      )}
      style={rootStyle}
    >
      <div ref={chromeRef} className="shrink-0">
        {!hideToolbar ? toolbar : null}
        {!hideToolbar ? legendBar : null}
      </div>
      <div
        ref={plotWrapRef}
        className={cn(
          "relative min-h-0 overflow-hidden",
          plotFillsRemaining ? "min-h-0 flex-1" : "min-h-[300px] shrink-0"
        )}
      >
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {!chartReady && plotReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-kc-bg/60 text-xs text-kc-muted">
            Đang khởi tạo biểu đồ…
          </div>
        ) : null}
      </div>
    </div>
  );
}
