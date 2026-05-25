"use client";

import { AdminTokenChartCell } from "@/modules/admin/AdminTokenChartCell";
import { Button } from "@/components/ui/button";
import {
  CHART_TIMEFRAMES,
  DEFAULT_CHART_TIMEFRAME_ID,
} from "@/constants/chart-timeframe";
import { MarketLiveProvider } from "@/context/market-live-context";
import useFetchApi from "@/hooks/useFetchApi";
import { unwrapPaginatedData } from "@/lib/unwrap-paginated";
import { ADMIN_CHART_CARD_HEIGHT_PX } from "@/constants/admin-charts";
import { cn } from "@/lib/cn";
import { isStablecoinToken } from "@/types/stablecoin.type";
import type { ITokenCrypto } from "@/types/token.type";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

export function AdminChartsView() {
  const [timeframeId, setTimeframeId] = useState(DEFAULT_CHART_TIMEFRAME_ID);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hideStable, setHideStable] = useState(false);

  const { data: tokensRaw, loading, refetch } = useFetchApi<
    { data?: ITokenCrypto[] } | ITokenCrypto[]
  >("/token-crypto/all", { refreshInterval: 30_000 });

  const list = useMemo(() => {
    const raw = unwrapPaginatedData(tokensRaw);
    const filtered = hideStable ? raw.filter((t) => !isStablecoinToken(t)) : raw;
    return [...filtered].sort((a, b) =>
      (a.symbol ?? "").localeCompare(b.symbol ?? "")
    );
  }, [tokensRaw, hideStable]);

  return (
    <MarketLiveProvider>
      <div className="space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400/90">
            Giám sát
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-kc-fg sm:text-3xl">
            Lưới biểu đồ OHLC
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-kc-muted">
            {list.length} mã · tối đa 3 chart / hàng · khung TG chung · log + WS.
          </p>
        </motion.header>

        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/20 bg-[#0c0a14]/95 px-4 py-3 backdrop-blur-md">
          <span className="text-xs font-medium uppercase tracking-wide text-kc-muted">
            Khung TG
          </span>
          {CHART_TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframeId(tf.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                timeframeId === tf.id
                  ? "bg-violet-500/25 text-violet-200"
                  : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
              )}
            >
              {tf.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-kc-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-violet-500/40"
                checked={hideStable}
                onChange={(e) => setHideStable(e.target.checked)}
              />
              Ẩn KC
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRefreshKey((k) => k + 1);
                void refetch();
                toast.success("Đang làm mới…");
              }}
            >
              Làm mới tất cả
            </Button>
          </div>
        </div>

        {loading && !list.length ? (
          <p className="text-center text-sm text-kc-muted">Đang tải…</p>
        ) : null}

        {!loading && !list.length ? (
          <p className="text-center text-sm text-kc-muted">Không có token.</p>
        ) : null}

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((token) => (
            <div
              key={token.id}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-violet-500/15 bg-[#0c0a14]/50 shadow-[0_0_30px_-12px_rgba(139,92,246,0.25)]"
              style={{ minHeight: ADMIN_CHART_CARD_HEIGHT_PX }}
            >
              <AdminTokenChartCell
                token={token}
                timeframeId={timeframeId}
                refreshKey={refreshKey}
              />
            </div>
          ))}
        </div>
      </div>
    </MarketLiveProvider>
  );
}
