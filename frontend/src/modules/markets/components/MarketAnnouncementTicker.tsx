"use client";

import Link from "next/link";
import { MARKET_ANNOUNCEMENTS } from "@/modules/markets/market-announcements";
import { cn } from "@/lib/cn";

const TAG_STYLE: Record<
  (typeof MARKET_ANNOUNCEMENTS)[number]["tag"],
  string
> = {
  hot: "bg-orange-500/20 text-orange-300",
  new: "bg-emerald-500/20 text-emerald-300",
  info: "bg-sky-500/20 text-sky-300",
  futures: "bg-violet-500/20 text-violet-300",
  quest: "bg-kc-accent/20 text-kc-accent",
};

const TAG_LABEL: Record<(typeof MARKET_ANNOUNCEMENTS)[number]["tag"], string> =
  {
    hot: "Hot",
    new: "Mới",
    info: "Thông báo",
    futures: "Futures",
    quest: "Quest",
  };

export default function MarketAnnouncementTicker() {
  const items = [...MARKET_ANNOUNCEMENTS, ...MARKET_ANNOUNCEMENTS];

  return (
    <div className="relative overflow-hidden border-b border-kc-border bg-kc-surface/50">
      <div className="flex animate-marquee whitespace-nowrap py-2">
        {items.map((a, i) => {
          const inner = (
            <span className="mx-4 inline-flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  TAG_STYLE[a.tag]
                )}
              >
                {TAG_LABEL[a.tag]}
              </span>
              <span className="text-kc-muted">{a.text}</span>
            </span>
          );
          return a.href ? (
            <Link key={`${a.id}-${i}`} href={a.href} className="hover:text-kc-fg">
              {inner}
            </Link>
          ) : (
            <span key={`${a.id}-${i}`}>{inner}</span>
          );
        })}
      </div>
    </div>
  );
}
