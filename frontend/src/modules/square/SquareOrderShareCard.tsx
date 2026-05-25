"use client";

import { useLiveTicker } from "@/context/market-live-context";
import { cn } from "@/lib/cn";
import { tradeHrefFromSlug } from "@/lib/token-routes";
import { resolveSquareEmbedPnlRoi } from "@/modules/square/square-embed-pnl";
import type { SquarePostEmbed } from "@/types/square.type";
import { formatSignedKcAmount } from "@/utils/format-number";
import Link from "next/link";
import { useMemo } from "react";
import { HiOutlineExternalLink } from "react-icons/hi";

function statChip(up: boolean) {
  return cn(
    "num inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold tabular-nums",
    up
      ? "border-kc-up/35 bg-kc-up/12 text-kc-up"
      : "border-kc-down/35 bg-kc-down/12 text-kc-down"
  );
}

function PnlRoiRow({
  pnlKc,
  roiPercent,
}: {
  pnlKc: number;
  roiPercent: number;
}) {
  const pnlUp = pnlKc >= 0;
  const roiUp = roiPercent >= 0;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className={statChip(pnlUp)}>
        PnL {pnlUp && pnlKc > 0 ? "+" : ""}
        {formatSignedKcAmount(pnlKc, 2)} KC
      </span>
      <span className={statChip(roiUp)}>
        ROI {roiUp && roiPercent > 0 ? "+" : ""}
        {roiPercent.toFixed(2)}%
      </span>
    </div>
  );
}

type Props = {
  kind: "order_spot" | "order_futures";
  embed: SquarePostEmbed;
};

export function SquareOrderShareCard({ kind, embed }: Props) {
  const ticker = useLiveTicker(embed.tokenId ?? null);
  const stats = useMemo(
    () => resolveSquareEmbedPnlRoi(kind, embed, ticker?.price),
    [kind, embed, ticker?.price]
  );

  if (kind === "order_spot") {
    const spotBuy =
      embed.type === "buy" || String(embed.type).toLowerCase() === "buy";
    return (
      <Link
        href={tradeHrefFromSlug(
          String(embed.pair ?? embed.symbol ?? "slr-kc")
        )}
        className={cn(
          "mb-3 flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5 transition",
          spotBuy
            ? "border-kc-up/20 bg-kc-up/5 hover:bg-kc-up/10"
            : "border-kc-down/20 bg-kc-down/5 hover:bg-kc-down/10"
        )}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-kc-muted">
            Spot · {String(embed.status ?? "pending")}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-tight text-kc-fg">
            <span className={spotBuy ? "text-kc-up" : "text-kc-down"}>
              {String(embed.type ?? "").toUpperCase()}
            </span>{" "}
            {embed.symbol}
          </p>
          <p className="num mt-0.5 text-[11px] text-kc-muted">
            @ {embed.price} KC · còn {embed.openQuantity ?? embed.quantity}
          </p>
          {stats ? (
            <PnlRoiRow pnlKc={stats.pnlKc} roiPercent={stats.roiPercent} />
          ) : (
            <p className="mt-1 text-[11px] text-kc-muted">PnL / ROI đang tải…</p>
          )}
        </div>
        <HiOutlineExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-kc-muted" />
      </Link>
    );
  }

  const isLong =
    embed.side === "long" || String(embed.side).toLowerCase() === "long";

  return (
    <Link
      href={`/futures?token=${embed.tokenId ?? ""}`}
      className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 transition hover:bg-violet-500/10"
    >
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-violet-300/80">
          Futures
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-tight text-kc-fg">
          <span className={isLong ? "text-kc-up" : "text-kc-down"}>
            {String(embed.side ?? "").toUpperCase()}
          </span>{" "}
          <span className="text-violet-300">{embed.symbol}</span>
          <span className="num ml-1 text-[11px] font-normal text-kc-muted">
            ×{embed.leverage}
          </span>
        </p>
        <p className="num mt-0.5 text-[11px] text-kc-muted">
          Size {embed.size} · entry {embed.entryPrice}
        </p>
        {stats ? (
          <PnlRoiRow pnlKc={stats.pnlKc} roiPercent={stats.roiPercent} />
        ) : (
          <p className="mt-1 text-[11px] text-kc-muted">PnL / ROI đang tải…</p>
        )}
      </div>
      <HiOutlineExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-kc-muted" />
    </Link>
  );
}
