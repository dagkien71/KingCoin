"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import { useLiveTokenDisplay } from "@/hooks/useLiveTokenDisplay";
import { tradeHref } from "@/lib/token-routes";
import type { ITokenCrypto } from "@/types/token.type";
import { formatMarketCap, formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import Link from "next/link";
import { HiOutlineFire } from "react-icons/hi";
import { cn } from "@/lib/cn";

function HotTokenCard({ token }: { token: ITokenCrypto }) {
  const { live } = useLiveTokenDisplay(token);
  const ch = live.priceChange24h;
  const isUp = ch == null || ch >= 0;

  return (
    <Link
      href={tradeHref(token)}
      className="group flex min-w-[168px] shrink-0 flex-col gap-2 rounded-xl border border-kc-border bg-kc-elevated/90 p-3 transition hover:border-kc-accent/30 hover:bg-kc-surface/80"
    >
      <div className="flex items-center gap-2">
        <TokenLogo
          logo={token.logo}
          symbol={token.symbol}
          name={token.name}
          id={token.id}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-kc-fg">
            {token.symbol}
          </p>
          <p className="truncate text-[10px] text-kc-muted">{token.name}</p>
        </div>
        <HiOutlineFire className="h-4 w-4 shrink-0 text-orange-400/80" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="num text-sm font-medium text-kc-fg">
          {withQuoteUnit(formatTokenPrice(token.decimals ?? 4, live.price ?? 0))}
        </span>
        <span
          className={cn(
            "num text-xs font-semibold",
            ch == null ? "text-kc-muted" : isUp ? "text-kc-up" : "text-kc-down"
          )}
        >
          {ch == null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
        </span>
      </div>
      <p className="text-[10px] text-kc-muted">
        Vol 24h: {formatMarketCap(token.volumes?.volume24h)}
      </p>
    </Link>
  );
}

export default function MarketHotRow({ tokens }: { tokens: ITokenCrypto[] }) {
  if (!tokens.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-kc-fg">Hot — khối lượng & biến động</h2>
          <p className="text-xs text-kc-muted">Cập nhật theo vol 24h × % thay đổi</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {tokens.map((t) => (
          <HotTokenCard key={t.id} token={t} />
        ))}
      </div>
    </section>
  );
}
