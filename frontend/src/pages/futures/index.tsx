"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import {
  LiveTokenChangePct,
  LiveTokenPrice,
} from "@/components/live/LiveTokenStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { QUOTE_SYMBOL } from "@/constants/quote";
import { DEFAULT_FUTURES_TOKEN_SLUG } from "@/constants/futures"; // label hiển thị
import useFetchApi from "@/hooks/useFetchApi";
import { futuresPairLabel } from "@/lib/futures-markets";
import { defaultFuturesHref, futuresHref } from "@/lib/token-routes";
import type { ITokenCrypto } from "@/types/token.type";
import { debounce } from "lodash";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

type FuturesMarketToken = ITokenCrypto & {
  futuresMaxLeverage?: number;
  futuresEnabled?: boolean;
};

const FuturesMarketsPage = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: markets, loading, refetch } = useFetchApi<FuturesMarketToken[]>(
    "/futures/markets"
  );

  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearch(value), 300),
    []
  );

  const filtered = useMemo(() => {
    const list = markets ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.symbol?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q)
    );
  }, [markets, search]);

  return (
    <div className="min-h-screen px-4 pb-16 pt-8 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="accent" className="mb-2">
              Futures
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-kc-fg sm:text-3xl">
              Perpetual · {QUOTE_SYMBOL}-M
            </h1>
            <p className="mt-1 text-sm text-kc-muted">
              Cùng danh sách alt với spot (trừ {QUOTE_SYMBOL}). Chọn cặp để
              mở Long/Short.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-80">
            <Input
              placeholder="Tìm theo tên hoặc ký hiệu…"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            <Button
              variant="secondary"
              type="button"
              onClick={() => refetch()}
              size="sm"
            >
              Làm mới
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-kc-border bg-kc-elevated/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-kc-border bg-kc-surface/60 text-xs uppercase tracking-wide text-kc-muted">
                    <th className="px-3 py-3 font-medium">Cặp</th>
                    <th className="px-3 py-3 font-medium">Giá</th>
                    <th className="px-3 py-3 font-medium">24h %</th>
                    <th className="px-3 py-3 font-medium">Đòn bẩy tối đa</th>
                    <th className="px-3 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-kc-border">
                        <td colSpan={5} className="px-3 py-3">
                          <Skeleton className="h-4 w-full max-w-xs" />
                        </td>
                      </tr>
                    ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-kc-muted"
                      >
                        Không có cặp futures. Chạy seed spot hoặc{" "}
                        <code className="text-xs">sync-futures-markets.js</code>
                        .
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filtered.map((crypto) => {
                      const href = futuresHref(crypto);
                      return (
                        <tr
                          key={crypto.id}
                          className="cursor-pointer border-b border-kc-border transition hover:bg-white/[0.03]"
                          onClick={() => router.push(href)}
                        >
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
                                <div className="font-medium text-kc-fg">
                                  {futuresPairLabel(crypto)}
                                </div>
                                <div className="text-xs text-kc-muted">
                                  {crypto.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <LiveTokenPrice token={crypto} />
                          <LiveTokenChangePct
                            token={crypto}
                            field="priceChange24h"
                          />
                          <td className="num px-3 py-3 text-violet-300">
                            {crypto.futuresMaxLeverage ?? 10}x
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={href}
                              className="text-xs font-medium text-kc-accent hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Giao dịch →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!loading && (markets?.length ?? 0) > 0 && (
          <p className="mt-4 text-center text-xs text-kc-muted">
            Hoặc mở nhanh{" "}
            <Link
              href={defaultFuturesHref()}
              className="text-kc-accent hover:underline"
            >
              {DEFAULT_FUTURES_TOKEN_SLUG}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default FuturesMarketsPage;
