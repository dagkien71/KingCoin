"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import type { UpcomingListing } from "@/modules/markets/market-hub-utils";
import { formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import Link from "next/link";
import { HiOutlineClock, HiOutlineSparkles } from "react-icons/hi";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<UpcomingListing["status"], string> = {
  scheduled: "Sắp list",
  review: "Đang duyệt",
  pending: "Chờ niêm yết",
};

const STATUS_STYLE: Record<UpcomingListing["status"], string> = {
  scheduled: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  review: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  pending: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
};

export default function MarketUpcomingSection({
  listings,
}: {
  listings: UpcomingListing[];
}) {
  if (!listings.length) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-kc-fg">
            <HiOutlineClock className="h-4 w-4 text-kc-accent" />
            Sắp niêm yết & pipeline
          </h2>
          <p className="text-xs text-kc-muted">
            Token chờ list, đang duyệt hoặc lịch công bố từ Studio
          </p>
        </div>
        <Link
          href="/issuer"
          className="inline-flex items-center gap-1 text-xs font-medium text-kc-accent hover:underline"
        >
          <HiOutlineSparkles className="h-3.5 w-3.5" />
          Phát hành token
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((item) => {
          const card = (
            <div
              className={cn(
                "flex h-full flex-col rounded-xl border border-kc-border bg-gradient-to-br from-kc-elevated to-kc-surface/40 p-4 ring-1 ring-white/[0.03]",
                item.isPipeline && "border-dashed"
              )}
            >
              <div className="flex items-start gap-3">
                {item.isPipeline ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kc-accent/15 text-kc-accent">
                    <HiOutlineSparkles className="h-5 w-5" />
                  </div>
                ) : (
                  <TokenLogo
                    logo={item.logo}
                    symbol={item.symbol}
                    name={item.name}
                    id={item.id}
                    size="lg"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-kc-fg">{item.name}</p>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ring-1",
                        STATUS_STYLE[item.status]
                      )}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p className="text-xs text-kc-muted">{item.symbol}</p>
                </div>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-kc-muted">
                {item.description ?? "Thông tin chi tiết sẽ cập nhật trước ngày list."}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-kc-border/60 pt-3 text-xs">
                <span className="font-medium text-kc-accent">{item.etaLabel}</span>
                {item.initialPrice != null && item.initialPrice > 0 ? (
                  <span className="num text-kc-muted">
                    Giá dự kiến{" "}
                    {withQuoteUnit(formatTokenPrice(4, item.initialPrice))}
                  </span>
                ) : null}
              </div>
            </div>
          );

          return item.href ? (
            <Link key={item.id} href={item.href} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={item.id}>{card}</div>
          );
        })}
      </div>
    </section>
  );
}
