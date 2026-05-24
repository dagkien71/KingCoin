"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import { useLiveTokenDisplay } from "@/hooks/useLiveTokenDisplay";
import { tradeHref } from "@/lib/token-routes";
import type { ITokenCrypto } from "@/types/token.type";
import { formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import Link from "next/link";
import { cn } from "@/lib/cn";

function MoverRow({
  token,
  rank,
}: {
  token: ITokenCrypto;
  rank: number;
}) {
  const { live } = useLiveTokenDisplay(token);
  const ch = live.priceChange24h;
  const isUp = ch != null && ch >= 0;

  return (
    <Link
      href={tradeHref(token)}
      className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]"
    >
      <span className="num w-4 shrink-0 text-[10px] text-kc-muted">{rank}</span>
      <TokenLogo
        logo={token.logo}
        symbol={token.symbol}
        name={token.name}
        id={token.id}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-kc-fg">{token.symbol}</p>
        <p className="num truncate text-[10px] text-kc-muted">
          {withQuoteUnit(formatTokenPrice(token.decimals ?? 4, live.price ?? 0))}
        </p>
      </div>
      <span
        className={cn(
          "num shrink-0 text-xs font-bold",
          ch == null ? "text-kc-muted" : isUp ? "text-kc-up" : "text-kc-down"
        )}
      >
        {ch == null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
      </span>
    </Link>
  );
}

export default function MarketMoversPanel({
  gainers,
  losers,
}: {
  gainers: ITokenCrypto[];
  losers: ITokenCrypto[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-kc-border bg-kc-elevated/80 p-3 ring-1 ring-white/[0.03]">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-kc-up">
          Top tăng 24h
        </h3>
        <div className="space-y-0.5">
          {gainers.length ? (
            gainers.map((t, i) => <MoverRow key={t.id} token={t} rank={i + 1} />)
          ) : (
            <p className="py-4 text-center text-xs text-kc-muted">Chưa có dữ liệu</p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-kc-border bg-kc-elevated/80 p-3 ring-1 ring-white/[0.03]">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-kc-down">
          Top giảm 24h
        </h3>
        <div className="space-y-0.5">
          {losers.length ? (
            losers.map((t, i) => <MoverRow key={t.id} token={t} rank={i + 1} />)
          ) : (
            <p className="py-4 text-center text-xs text-kc-muted">Chưa có dữ liệu</p>
          )}
        </div>
      </div>
    </div>
  );
}
