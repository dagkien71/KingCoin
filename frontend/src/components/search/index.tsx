"use client";

import { PriceFlash } from "@/components/live/PriceFlash";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { QUOTE_SYMBOL, withQuoteUnit } from "@/constants/quote";
import { useLiveTokenDisplay } from "@/hooks/useLiveTokenDisplay";
import useFetchApi from "@/hooks/useFetchApi";
import { filterSpotTokensForFutures } from "@/lib/futures-markets";
import { futuresHref, tradeHref } from "@/lib/token-routes";
import { ITokenCrypto } from "@/types/token.type";
import { formatTokenPrice } from "@/utils/format-number";
import clsx from "clsx";
import { useRouter } from "next/router";
import React, { memo, useEffect, useMemo, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";

type MarketMode = "spot" | "futures";

function formatChangePct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const n = Number(value);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const SearchResultRow = memo(function SearchResultRow({
  token,
  mode,
  onSelect,
}: {
  token: ITokenCrypto;
  mode: MarketMode;
  onSelect: () => void;
}) {
  const { live, flash } = useLiveTokenDisplay(token);
  const ch24 = live.priceChange24h;
  const isUp = ch24 == null || Number(ch24) >= 0;
  const pairLabel = `${token.symbol ?? token.name}/${QUOTE_SYMBOL}`;
  const modeLabel = mode === "spot" ? "Spot" : "Perp";

  return (
    <li>
      <button
        type="button"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06]"
        onClick={onSelect}
      >
        <div className="min-w-0">
          <TokenIdentity
            logo={token.logo}
            symbol={token.symbol}
            name={token.name}
            id={token.id}
            size="sm"
            nameFirst
            className="max-w-none [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal [&_.truncate]:text-clip"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-kc-muted">
              {pairLabel}
            </span>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                mode === "spot"
                  ? "bg-kc-accent/15 text-kc-accent"
                  : "bg-violet-500/15 text-violet-300"
              )}
            >
              {modeLabel}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-xs font-semibold text-kc-fg">
            <PriceFlash flash={flash}>
              {withQuoteUnit(
                formatTokenPrice(token.decimals ?? 4, live.price ?? token.price ?? 0)
              )}
            </PriceFlash>
          </p>
          <p
            className={clsx(
              "num text-[10px] font-medium",
              ch24 == null ? "text-kc-muted" : isUp ? "text-kc-up" : "text-kc-down"
            )}
          >
            {formatChangePct(ch24)}
            <span className="ml-1 text-kc-muted/80">24h</span>
          </p>
        </div>
      </button>
    </li>
  );
});

const SearchForm: React.FC = () => {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<MarketMode>("spot");
  const { data: tokens } = useFetchApi<ITokenCrypto[]>("/token-crypto/all");

  useEffect(() => {
    if (router.pathname.startsWith("/futures")) {
      setMode("futures");
    } else if (router.pathname.startsWith("/trade")) {
      setMode("spot");
    }
  }, [router.pathname]);

  const pool = useMemo(() => {
    const all = tokens ?? [];
    return mode === "futures" ? filterSpotTokensForFutures(all) : all;
  }, [tokens, mode]);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !pool.length) return [];
    return pool
      .filter((t) =>
        `${t.name ?? ""} ${t.symbol ?? ""}`.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [q, pool]);

  const navigate = (t: ITokenCrypto, targetMode: MarketMode = mode) => {
    setQ("");
    router.push(targetMode === "futures" ? futuresHref(t) : tradeHref(t));
  };

  const showDropdown = q.trim().length > 0;

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches[0]) navigate(matches[0]);
        }}
        className="relative w-full"
      >
        <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kc-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full rounded-lg border border-kc-border bg-kc-elevated py-2 pl-10 pr-3 text-sm text-kc-fg placeholder:text-kc-muted focus:border-kc-border-strong focus:outline-none focus:ring-1 focus:ring-kc-accent/40"
          placeholder="Tìm token, cặp…"
          autoComplete="off"
        />
      </form>

      {showDropdown ? (
        <div className="absolute left-0 top-full z-[70] mt-1 w-[360px] overflow-hidden rounded-lg border border-kc-border bg-kc-elevated shadow-kc">
          <div className="flex items-center justify-between gap-2 border-b border-kc-border bg-kc-surface/50 px-2 py-1.5">
            <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-kc-muted">
              Thị trường
            </span>
            <div className="flex rounded-md bg-kc-bg p-0.5 ring-1 ring-kc-border/60">
              {(["spot", "futures"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={clsx(
                    "rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition",
                    mode === m
                      ? m === "spot"
                        ? "bg-kc-accent/20 text-kc-accent"
                        : "bg-violet-500/20 text-violet-300"
                      : "text-kc-muted hover:text-kc-fg"
                  )}
                >
                  {m === "spot" ? "Spot" : "Futures"}
                </button>
              ))}
            </div>
          </div>

          {matches.length > 0 ? (
            <ul className="max-h-72 overflow-auto py-1">
              {matches.map((t) => (
                <SearchResultRow
                  key={t.id}
                  token={t}
                  mode={mode}
                  onSelect={() => navigate(t)}
                />
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-center text-xs text-kc-muted">
              Không tìm thấy token{mode === "futures" ? " futures" : ""}.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SearchForm;
