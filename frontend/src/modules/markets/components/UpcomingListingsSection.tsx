"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import { CountdownMini } from "@/modules/markets/components/ListingCountdown";
import type { IUpcomingListing } from "@/types/upcoming-listing.type";
import { formatListingDate } from "@/types/upcoming-listing.type";
import { formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { upcomingDetailPath } from "@/lib/token-routes";
import { useState } from "react";
import { HiOutlineBell, HiOutlineSparkles } from "react-icons/hi";
import { toast } from "react-toastify";

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-emerald-400",
  review: "bg-amber-400",
  announced: "bg-sky-400",
};

function NotifyIcon({ symbol }: { symbol: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      title={on ? "Đã đăng ký nhắc" : "Nhắc khi list"}
      aria-label={on ? "Đã đăng ký nhắc" : "Nhắc khi list"}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition",
        on
          ? "bg-kc-accent/15 text-kc-accent"
          : "text-kc-muted hover:bg-kc-surface hover:text-kc-accent"
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn((v) => !v);
        toast.info(
          on
            ? `Đã tắt nhắc ${symbol}`
            : `Sẽ nhắc khi ${symbol} lên sàn (demo)`
        );
      }}
    >
      <HiOutlineBell className="h-3 w-3" />
    </button>
  );
}

function UpcomingChip({
  item,
  highlight,
}: {
  item: IUpcomingListing;
  highlight?: boolean;
}) {
  const dot = STATUS_DOT[item.status] ?? STATUS_DOT.scheduled;
  const price =
    item.initialPrice != null && item.initialPrice > 0
      ? withQuoteUnit(formatTokenPrice(4, item.initialPrice))
      : null;
  const dateLabel = formatListingDate(item.listingAt);

  return (
    <Link
      href={upcomingDetailPath(item)}
      className={cn(
        "group relative flex min-w-[168px] max-w-[168px] shrink-0 flex-col gap-2 rounded-xl border p-2.5 transition",
        highlight
          ? "border-kc-accent/30 bg-kc-accent/[0.05] hover:border-kc-accent/45"
          : "border-kc-border bg-kc-elevated/90 hover:border-kc-accent/20 hover:bg-kc-surface/70"
      )}
    >
      {highlight ? (
        <span className="absolute right-2 top-2 text-[8px] font-bold uppercase tracking-wider text-kc-accent/80">
          ★
        </span>
      ) : null}

      <div className="flex items-center gap-2 pr-4">
        <TokenLogo
          logo={item.logo}
          symbol={item.symbol}
          name={item.name}
          id={item.id}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-xs font-semibold text-kc-fg">
              {item.symbol}
            </p>
            <span className={cn("h-1 w-1 shrink-0 rounded-full", dot)} />
          </div>
          <p className="truncate text-[10px] leading-tight text-kc-muted">
            {item.name}
          </p>
        </div>
      </div>

      <CountdownMini targetIso={item.listingAt} />

      <div className="flex items-end justify-between gap-1 border-t border-kc-border/40 pt-2">
        <div className="min-w-0">
          {price ? (
            <p className="num truncate text-[11px] font-medium text-kc-fg">
              {price}
            </p>
          ) : (
            <p className="text-[10px] text-kc-muted">TBA</p>
          )}
          <p className="truncate text-[9px] text-kc-muted">{dateLabel}</p>
        </div>
        <NotifyIcon symbol={item.symbol} />
      </div>
    </Link>
  );
}

export default function UpcomingListingsSection({
  listings,
  loading,
}: {
  listings: IUpcomingListing[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section>
        <div className="mb-2.5 h-3.5 w-24 animate-pulse rounded bg-kc-surface" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[96px] min-w-[168px] shrink-0 animate-pulse rounded-xl bg-kc-surface"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!listings.length) return null;

  const featuredId = listings.find((l) => l.isFeatured)?.id ?? listings[0]?.id;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HiOutlineSparkles className="h-3.5 w-3.5 text-kc-accent" />
          <h2 className="text-sm font-bold text-kc-fg">Sắp lên sàn</h2>
          <span className="rounded-full bg-kc-surface px-1.5 py-px text-[10px] text-kc-muted">
            {listings.length}
          </span>
        </div>
        <Link
          href="/issuer"
          className="text-[10px] text-kc-muted hover:text-kc-accent"
        >
          Phát hành →
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
        {listings.map((item) => (
          <UpcomingChip
            key={item.id}
            item={item}
            highlight={item.id === featuredId}
          />
        ))}
      </div>
    </section>
  );
}
