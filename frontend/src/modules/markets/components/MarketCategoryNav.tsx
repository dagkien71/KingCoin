"use client";

import {
  MARKET_CATEGORIES,
  type MarketCategoryId,
  categoryCount,
} from "@/modules/markets/market-hub-utils";
import type { ITokenCrypto } from "@/types/token.type";
import { cn } from "@/lib/cn";

type Props = {
  active: MarketCategoryId;
  onChange: (id: MarketCategoryId) => void;
  tokens: ITokenCrypto[];
  watchList?: string[];
};

export default function MarketCategoryNav({
  active,
  onChange,
  tokens,
  watchList,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {MARKET_CATEGORIES.map((cat) => {
          const count = categoryCount(tokens, cat.id, watchList);
          const disabled = cat.id === "watchlist" && !watchList?.length;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active === cat.id
                  ? "bg-kc-accent/15 text-kc-accent ring-1 ring-kc-accent/30"
                  : "bg-kc-surface/60 text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              {cat.label}
              <span
                className={cn(
                  "num rounded-md px-1.5 py-0.5 text-[10px]",
                  active === cat.id
                    ? "bg-kc-accent/20 text-kc-accent"
                    : "bg-white/[0.06] text-kc-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-kc-muted">
        {MARKET_CATEGORIES.find((c) => c.id === active)?.description}
      </p>
    </div>
  );
}
