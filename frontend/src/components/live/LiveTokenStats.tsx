"use client";

import { PriceFlash } from "@/components/live/PriceFlash";
import { useLiveTokenDisplay } from "@/hooks/useLiveTokenDisplay";
import type { ITokenCrypto } from "@/types/token.type";
import {
  formatInputPrice,
  formatMarketCap,
  formatTokenPrice,
} from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import clsx from "clsx";
import { memo } from "react";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";

type TokenSlice = Pick<
  ITokenCrypto,
  | "id"
  | "decimals"
  | "price"
  | "priceChange1h"
  | "priceChange24h"
  | "priceChange7d"
  | "volumes"
>;

type ChangeField = "priceChange1h" | "priceChange24h" | "priceChange7d";

function formatChangePct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const n = Number(value);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export const LiveTokenChangePct = memo(function LiveTokenChangePct({
  token,
  field,
  className = "num px-3 py-3",
}: {
  token: Pick<ITokenCrypto, "id" | ChangeField>;
  field: ChangeField;
  className?: string;
}) {
  const { live } = useLiveTokenDisplay(token as TokenSlice);
  const ch = live[field];
  const isUp = ch == null || Number(ch) >= 0;
  return (
    <td
      className={clsx(
        className,
        ch == null ? "text-kc-muted" : isUp ? "text-kc-up" : "text-kc-down"
      )}
    >
      {formatChangePct(ch)}
    </td>
  );
});

export const LiveTokenPrice = memo(function LiveTokenPrice({
  token,
  className = "num px-3 py-3 text-kc-fg",
}: {
  token: Pick<ITokenCrypto, "id" | "decimals" | "price">;
  className?: string;
}) {
  const { live, flash } = useLiveTokenDisplay(token);
  return (
    <td className={className}>
      <PriceFlash flash={flash}>
        {withQuoteUnit(formatTokenPrice(token.decimals ?? 8, live.price ?? 0))}
      </PriceFlash>
    </td>
  );
});

export const LiveTokenVol24 = memo(function LiveTokenVol24({
  token,
  className = "num px-3 py-3 text-kc-muted",
}: {
  token: Pick<ITokenCrypto, "id" | "decimals" | "volumes">;
  className?: string;
}) {
  const { live } = useLiveTokenDisplay(token);
  const vol = live.volumes?.volume24h;
  return (
    <td className={className}>
      {vol != null ? withQuoteUnit(formatTokenPrice(0, vol)) : "—"}
    </td>
  );
});

type PairHeaderToken = TokenSlice & {
  name?: string | null;
  marketCap?: number | null;
};

export const LivePairTradeSubtitle = memo(function LivePairTradeSubtitle({
  token,
}: {
  token: Pick<ITokenCrypto, "id" | "name" | "priceChange24h">;
}) {
  const { live } = useLiveTokenDisplay(token);
  const ch24 = live.priceChange24h;
  const isUp = ch24 == null || Number(ch24) >= 0;
  const label = token.name?.trim() || "token";

  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs text-kc-muted">
      <span>Giá {label}</span>
      {isUp ? (
        <FaArrowUp className="h-2.5 w-2.5 shrink-0 text-kc-up" aria-hidden />
      ) : (
        <FaArrowDown className="h-2.5 w-2.5 shrink-0 text-kc-down" aria-hidden />
      )}
    </p>
  );
});

export const LivePairTradePriceBlock = memo(function LivePairTradePriceBlock({
  token,
}: {
  token: PairHeaderToken;
}) {
  const { live, flash } = useLiveTokenDisplay(token as TokenSlice);
  const price = live.price ?? 0;
  const ch24 = live.priceChange24h;
  const isUp = ch24 == null || Number(ch24) >= 0;

  return (
    <div className="shrink-0 leading-tight">
      <PriceFlash
        flash={flash}
        className={clsx(
          "num text-base font-semibold tracking-tight sm:text-lg",
          !flash && (isUp ? "text-kc-up" : "text-kc-down")
        )}
      >
        {live.price != null ? formatInputPrice(price) : "—"}
      </PriceFlash>
      <div className="num mt-0.5 text-xs font-medium text-kc-fg">
        {token.marketCap != null ? formatMarketCap(token.marketCap) : "—"}
      </div>
    </div>
  );
});

export function LiveToolbarPrice({ token }: { token: TokenSlice }) {
  const { live, flash } = useLiveTokenDisplay(token);
  const dec = live.decimals ?? 8;
  const price = live.price;
  const ch24 = live.priceChange24h;

  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-3">
      <PriceFlash
        flash={flash}
        className="num text-2xl font-semibold tracking-tight text-kc-fg sm:text-3xl"
      >
        {price != null ? withQuoteUnit(formatTokenPrice(dec, price)) : "—"}
      </PriceFlash>
      {ch24 != null && !Number.isNaN(ch24) ? (
        <span
          className={clsx(
            "num text-sm font-semibold",
            ch24 >= 0 ? "text-kc-up" : "text-kc-down"
          )}
        >
          {ch24 >= 0 ? "+" : ""}
          {typeof ch24 === "number" ? ch24.toFixed(2) : ch24}%{" "}
          <span className="font-normal text-kc-muted">24h</span>
        </span>
      ) : null}
    </div>
  );
}

export const LiveAssetQuotePrice = memo(function LiveAssetQuotePrice({
  token,
  className = "num text-xs text-kc-muted",
}: {
  token: Pick<ITokenCrypto, "id" | "decimals" | "price">;
  className?: string;
}) {
  const { live, flash } = useLiveTokenDisplay(token);
  return (
    <div className={className}>
      <PriceFlash flash={flash}>
        {withQuoteUnit(formatTokenPrice(token.decimals ?? 0, live.price ?? 0))}
      </PriceFlash>
    </div>
  );
});

export function LiveToolbarVol24({ token }: { token: TokenSlice }) {
  const { live } = useLiveTokenDisplay(token);
  const vol24 = live.volumes?.volume24h;
  return (
    <div className="min-w-[5.5rem]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-kc-muted">
        KL 24h
      </div>
      <div className="num text-sm font-medium text-kc-fg">
        {vol24 != null ? withQuoteUnit(formatTokenPrice(0, vol24)) : "—"}
      </div>
    </div>
  );
}
