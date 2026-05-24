"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import {
  LiveTokenChangePct,
  LiveTokenPrice,
  LiveTokenVol24,
} from "@/components/live/LiveTokenStats";
import type { ITokenCrypto } from "@/types/token.type";
import { isStablecoinToken } from "@/types/token.type";
import { formatTotalSupply } from "@/utils/format-number";
import { futuresHref, tokenDetailPath, tradeHref } from "@/lib/token-routes";
import Link from "next/link";
import { useRouter } from "next/router";
import { BiStar } from "react-icons/bi";
import { FaSortDown, FaSortUp, FaStar } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const columns = [
  { label: "", field: "rating", sortable: false },
  { label: "#", field: "rank", sortable: true },
  { label: "Token", field: "name", sortable: true },
  { label: "Giá", field: "price", sortable: true },
  { label: "1h", field: "priceChange1h", sortable: true },
  { label: "24h", field: "priceChange24h", sortable: true },
  { label: "7d", field: "priceChange7d", sortable: true },
  { label: "Vốn hóa", field: "marketCap", sortable: true },
  { label: "Vol 24h", field: "volume24h", sortable: true },
  { label: "Lưu hành", field: "circulatingSupply", sortable: false },
  { label: "", field: "actions", sortable: false },
];

type Props = {
  tokens: ITokenCrypto[];
  loading: boolean;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  watchList?: string[];
  onToggleWatch: (e: React.MouseEvent, tokenId: string) => void;
};

export default function MarketTokenTable({
  tokens,
  loading,
  sortColumn,
  sortDirection,
  onSort,
  watchList,
  onToggleWatch,
}: Props) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border border-kc-border bg-kc-elevated/80 ring-1 ring-white/[0.03]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-kc-border bg-kc-surface/60 text-[11px] uppercase tracking-wide text-kc-muted">
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={cn(
                    "whitespace-nowrap px-3 py-3 font-medium",
                    column.sortable && "cursor-pointer transition hover:text-kc-fg"
                  )}
                  onClick={() =>
                    column.sortable ? onSort(column.field) : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {column.label}
                    {column.sortable &&
                      sortColumn === column.field &&
                      (sortDirection === "asc" ? (
                        <FaSortUp className="text-kc-accent" />
                      ) : (
                        <FaSortDown className="text-kc-accent" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-kc-border">
                  {columns.map((c) => (
                    <td key={c.field} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-[6rem]" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && !tokens.length && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-kc-muted"
                >
                  Không có token trong nhóm này.
                </td>
              </tr>
            )}
            {!loading &&
              tokens.map((crypto) => (
                <tr
                  key={crypto.id}
                  className="cursor-pointer border-b border-kc-border transition hover:bg-white/[0.03]"
                  onClick={() =>
                    crypto?.id && router.push(tokenDetailPath(crypto.id))
                  }
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="rounded p-2 text-kc-muted hover:bg-white/[0.06] hover:text-kc-accent"
                      onClick={(e) => onToggleWatch(e, crypto.id)}
                      aria-label="Watchlist"
                    >
                      {watchList?.includes(crypto.id) ? (
                        <FaStar className="text-kc-accent" />
                      ) : (
                        <BiStar className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="num px-3 py-3 text-kc-muted">
                    {crypto.rank ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <TokenLogo
                        logo={crypto.logo}
                        symbol={crypto.symbol}
                        name={crypto.name}
                        id={crypto.id}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 font-medium text-kc-fg">
                          {crypto.name || "—"}
                          {crypto.isVerified ? (
                            <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[9px] font-bold text-sky-300">
                              ✓
                            </span>
                          ) : null}
                          {isStablecoinToken(crypto) && (
                            <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                              Stable
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-kc-muted">
                          {crypto.symbol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <LiveTokenPrice token={crypto} />
                  <LiveTokenChangePct token={crypto} field="priceChange1h" />
                  <LiveTokenChangePct token={crypto} field="priceChange24h" />
                  <LiveTokenChangePct token={crypto} field="priceChange7d" />
                  <td className="num px-3 py-3 text-kc-muted">
                    {crypto.marketCap != null
                      ? crypto.marketCap.toLocaleString("vi-VN", {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <LiveTokenVol24 token={crypto} />
                  <td className="num px-3 py-3 text-kc-muted">
                    {formatTotalSupply(crypto.circulatingSupply)}
                  </td>
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={tradeHref(crypto)}
                        className="whitespace-nowrap rounded-md bg-kc-accent/15 px-2 py-1 text-[10px] font-semibold text-kc-accent hover:bg-kc-accent/25"
                      >
                        Trade
                      </Link>
                      {!isStablecoinToken(crypto) ? (
                        <Link
                          href={futuresHref(crypto)}
                          className="whitespace-nowrap rounded-md border border-violet-500/30 px-2 py-1 text-[10px] font-medium text-violet-300 hover:bg-violet-500/10"
                        >
                          Fut
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
