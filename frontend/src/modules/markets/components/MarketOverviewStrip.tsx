"use client";

import type { MarketOverview } from "@/modules/markets/market-hub-utils";
import { formatMarketCap } from "@/utils/format-number";
import { cn } from "@/lib/cn";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineChartBar,
  HiOutlineFire,
  HiOutlineTrendingUp,
} from "react-icons/hi";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "up" | "down" | "accent" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-kc-border bg-kc-elevated/80 p-4 ring-1 ring-white/[0.03]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-kc-muted">
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            accent === "up" && "text-kc-up",
            accent === "down" && "text-kc-down",
            accent === "accent" && "text-kc-accent",
            (!accent || accent === "neutral") && "text-kc-muted"
          )}
        />
      </div>
      <p className="num mt-2 text-xl font-semibold text-kc-fg sm:text-2xl">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-kc-muted">{sub}</p> : null}
    </div>
  );
}

export default function MarketOverviewStrip({
  overview,
}: {
  overview: MarketOverview;
}) {
  const avg = overview.avgChange24h;
  const avgLabel =
    avg >= 0 ? `+${avg.toFixed(2)}%` : `${avg.toFixed(2)}%`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Vốn hóa alt"
        value={formatMarketCap(overview.totalMarketCap)}
        sub={`${overview.altCount} token`}
        icon={HiOutlineChartBar}
        accent="accent"
      />
      <StatCard
        label="KL 24h"
        value={formatMarketCap(overview.totalVolume24h)}
        sub="Toàn thị trường"
        icon={HiOutlineTrendingUp}
      />
      <StatCard
        label="Biến động TB"
        value={avgLabel}
        sub="Trung bình 24h"
        icon={avg >= 0 ? HiOutlineArrowUp : HiOutlineArrowDown}
        accent={avg >= 0 ? "up" : "down"}
      />
      <StatCard
        label="Tăng / Giảm"
        value={`${overview.gainerCount} / ${overview.loserCount}`}
        sub="Token alt 24h"
        icon={HiOutlineArrowUp}
      />
      <StatCard
        label="Đang niêm yết"
        value={String(overview.tokenCount)}
        sub="Spot KingCoin"
        icon={HiOutlineChartBar}
      />
      <StatCard
        label="Hot nhất"
        value={overview.hotSymbol ?? "—"}
        sub="Theo vol × biến động"
        icon={HiOutlineFire}
        accent="accent"
      />
    </div>
  );
}
