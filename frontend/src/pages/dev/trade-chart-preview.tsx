"use client";

import DbTokenPriceChart from "@/components/charts/DbTokenPriceChart";
import { TRADE_CHART_HEIGHT_PX } from "@/constants/chart-layout";
import { buildTradeChartMockLogs } from "@/mocks/trade-chart-logs.mock";
import clsx from "clsx";
import { useMemo } from "react";

/**
 * Preview layout biểu đồ trade (mock data) — dùng khi DB/API chưa sẵn sàng.
 * http://localhost:3000/dev/trade-chart-preview
 */
export default function TradeChartPreviewPage() {
  const logs = useMemo(() => buildTradeChartMockLogs(160), []);
  const spot = logs[logs.length - 1]?.price ?? 1;

  return (
    <main className="min-h-screen bg-kc-bg p-3 lg:p-4">
      <p className="mb-3 text-center text-xs text-kc-muted">
        Preview dev — cùng layout trang trade (chiều cao cố định, ~48 nến mặc định)
      </p>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          className={clsx(
            "flex min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
            "ring-1 ring-white/[0.04]"
          )}
        >
          <div className="flex gap-2 border-b border-kc-border bg-kc-surface/40 px-3 py-2.5">
            <span className="rounded-md bg-kc-accent/15 px-3 py-1.5 text-sm font-medium text-kc-accent">
              Biểu đồ
            </span>
            <span className="rounded-md px-3 py-1.5 text-sm text-kc-muted">Tổng quan</span>
          </div>
          <div className="shrink-0 overflow-hidden">
            <DbTokenPriceChart
              logs={logs}
              spotPrice={spot}
              fixedHeightPx={TRADE_CHART_HEIGHT_PX}
              viewportMode="recent-bars"
              className="w-full"
            />
          </div>
        </section>

        <aside className="hidden rounded-xl border border-kc-border bg-kc-elevated p-4 text-sm text-kc-muted lg:block">
          Cột đặt lệnh (placeholder)
        </aside>
      </div>
    </main>
  );
}
