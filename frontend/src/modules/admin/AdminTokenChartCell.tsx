"use client";

import { TokenIdentity } from "@/components/token/TokenLogo";
import { AdminTokenChartPlot } from "@/modules/admin/AdminTokenChartPlot";
import { LiveTokenChangePct } from "@/components/live/LiveTokenStats";
import { useLiveTicker, useSmoothedPrice } from "@/context/market-live-context";
import useFetchApi from "@/hooks/useFetchApi";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import { tokenDetailPath, tradeHref } from "@/lib/token-routes";
import { isStablecoinToken } from "@/types/token.type";
import type { ITokenCrypto, ITokenCryptoLog } from "@/types/token.type";
import {
  ADMIN_CHART_CARD_HEIGHT_PX,
  ADMIN_CHART_HEADER_MIN_HEIGHT_PX,
  ADMIN_CHART_PLOT_HEIGHT_PX,
} from "@/constants/admin-charts";
import { CHART_LOG_FETCH_LIMIT } from "@/constants/chart-layout";
import { formatTokenPrice } from "@/utils/format-number";
import Link from "next/link";
import { useEffect, useMemo } from "react";

type Props = {
  token: ITokenCrypto;
  timeframeId: string;
  refreshKey: number;
};

export function AdminTokenChartCell({
  token,
  timeframeId,
  refreshKey,
}: Props) {
  const patch = useLiveTicker(token.id);
  const chartPatch = useSmoothedPrice(token.id, "chart");
  const live = useMemo(
    () => applyTickerPatch(token, patch) ?? token,
    [token, patch]
  );
  const chartSpotPrice = chartPatch?.price ?? live.price;

  const logPath = token.id
    ? `/crypto-logs/${token.id}?limit=${CHART_LOG_FETCH_LIMIT}`
    : "";
  const { data: logs, loading, refetch } = useFetchApi<ITokenCryptoLog[]>(
    logPath,
    { refreshInterval: 12_000, silentOnPoll: true }
  );

  useEffect(() => {
    if (refreshKey > 0) void refetch();
  }, [refreshKey, refetch]);

  const isStable = isStablecoinToken(token);

  return (
    <article
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-surface"
      style={{ minHeight: ADMIN_CHART_CARD_HEIGHT_PX }}
    >
      <header
        className="flex shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-kc-border px-3 py-2"
        style={{ minHeight: ADMIN_CHART_HEADER_MIN_HEIGHT_PX }}
      >
        <TokenIdentity
          logo={token.logo}
          symbol={token.symbol}
          name={token.name}
          id={token.id}
          size="sm"
          nameFirst
          className="min-w-0 flex-1"
          subline={
            <>
              <span className="num text-kc-accent">
                {formatTokenPrice(token.decimals ?? 2, live.price ?? 0)} KC
              </span>
              {isStable ? " · stable" : ""}
            </>
          }
        />
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <LiveTokenChangePct
            token={live}
            field="priceChange24h"
            className="num text-xs"
          />
          <Link
            href={tradeHref(token)}
            className="text-kc-accent hover:underline"
          >
            Trade
          </Link>
          <Link
            href={tokenDetailPath(token.id)}
            className="text-kc-muted hover:text-kc-fg hover:underline"
          >
            Chi tiết
          </Link>
          <button
            type="button"
            className="text-kc-muted hover:text-kc-fg"
            title="Tải lại log"
            onClick={() => void refetch()}
          >
            ↻
          </button>
        </div>
      </header>
      <div
        className="shrink-0 overflow-hidden"
        style={{ height: ADMIN_CHART_PLOT_HEIGHT_PX }}
      >
        <AdminTokenChartPlot
          logs={logs}
          loading={loading}
          timeframeId={timeframeId}
          spotPrice={chartSpotPrice}
        />
      </div>
    </article>
  );
}
