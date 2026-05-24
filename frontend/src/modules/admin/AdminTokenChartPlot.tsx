"use client";

import DbTokenPriceChart from "@/components/charts/DbTokenPriceChart";
import { ADMIN_CHART_PLOT_HEIGHT_PX } from "@/constants/admin-charts";
import type { ITokenCryptoLog } from "@/types/token.type";
import { memo } from "react";

type Props = {
  logs: ITokenCryptoLog[] | null | undefined;
  loading: boolean;
  timeframeId: string;
  spotPrice?: number | null;
};

/** Tách khỏi header (giá live) — chỉ re-render khi log / TG đổi. */
export const AdminTokenChartPlot = memo(function AdminTokenChartPlot({
  logs,
  loading,
  timeframeId,
  spotPrice,
}: Props) {
  return (
    <DbTokenPriceChart
      logs={logs}
      spotPrice={spotPrice}
      loading={loading}
      controlledTimeframeId={timeframeId}
      hideToolbar
      fixedHeightPx={ADMIN_CHART_PLOT_HEIGHT_PX}
      viewportMode="recent-bars"
      autoFollowRealtime={false}
      className="rounded-b-xl"
    />
  );
});
