"use client";

import DbTokenPriceChart from "@/components/charts/DbTokenPriceChart";
import { CHART_DETAIL_INITIAL_VISIBLE_BARS, CHART_LOG_FETCH_LIMIT } from "@/constants/chart-layout";
import { DEFAULT_CHART_TIMEFRAME_DETAIL_ID } from "@/constants/chart-timeframe";
import { MarketLiveProvider, useLiveTicker, useSmoothedPrice } from "@/context/market-live-context";
import useLiveFetch from "@/hooks/useLiveFetch";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import type { ITokenCrypto, ITokenCryptoLog } from "@/types/token.type";
import { useMemo } from "react";

function TokenDetailChartInner({ token }: { token: ITokenCrypto }) {
  const logPath = token.id
    ? `/crypto-logs/${token.id}?limit=${CHART_LOG_FETCH_LIMIT}`
    : "";
  const patch = useLiveTicker(token.id);
  const chartPatch = useSmoothedPrice(token.id, "chart");
  const live = useMemo(
    () => applyTickerPatch(token, patch) ?? token,
    [token, patch]
  );
  const chartSpotPrice = chartPatch?.price ?? live.price;
  const { data: logs, loading } = useLiveFetch<ITokenCryptoLog[]>(logPath, {
    stream: ["logs", "trades"],
  });

  return (
    <DbTokenPriceChart
      logs={logs}
      spotPrice={chartSpotPrice}
      loading={loading}
      className="h-full min-h-0 w-full flex-1"
      defaultTimeframeId={DEFAULT_CHART_TIMEFRAME_DETAIL_ID}
      viewportMode="recent-bars"
      initialVisibleBars={CHART_DETAIL_INITIAL_VISIBLE_BARS}
    />
  );
}

/** Biểu đồ token detail — OHLC từ log + forming bar từ WS ticker (CHART_CANDLESTICK_SPEC). */
export function TokenDetailChart({ token }: { token: ITokenCrypto }) {
  return (
    <MarketLiveProvider tokenId={token.id}>
      <TokenDetailChartInner token={token} />
    </MarketLiveProvider>
  );
}
