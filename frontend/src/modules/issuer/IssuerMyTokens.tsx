"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QUOTE_SYMBOL } from "@/constants/quote";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useAccumulatedPaginated from "@/hooks/useAccumulatedPaginated";
import { ListLoadMore } from "@/components/ui/ListLoadMore";
import type { PaginatedPayload } from "@/lib/unwrap-paginated";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { tokenDetailPath, tradeHref } from "@/lib/token-routes";
import type { ITokenCrypto } from "@/types/token.type";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { HiOutlinePlusCircle } from "react-icons/hi";
import type { IListingRequest } from "@/types/listing-request.type";
import {
  LISTING_REQUEST_STATUS_LABEL,
  LISTING_REQUEST_STATUS_TONE,
} from "@/types/listing-request.type";
import { cn } from "@/lib/cn";

export function IssuerMyTokens() {
  const router = useRouter();
  const { isLogin } = useAuth();
  const [page, setPage] = useState(1);
  const { data: pagedRaw, loading, setQueryParams } = useFetchApi<
    PaginatedPayload<ITokenCrypto> | ITokenCrypto[]
  >(isLogin ? "/token-crypto" : "", {
    defaultParams: { page: 1, perPage: 20, orderBy: "createdAt:desc" },
  });

  useEffect(() => {
    setQueryParams({ page, perPage: 20, orderBy: "createdAt:desc" });
  }, [page, setQueryParams]);

  const { items: tokens, hasMore, total } = useAccumulatedPaginated(
    pagedRaw,
    page
  );
  const { data: requestsRaw, loading: requestsLoading } = useFetchApi<
    IListingRequest[]
  >(isLogin ? "/listing-requests/mine" : "");
  const requests = requestsRaw ?? [];
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-kc-fg">Token của tôi</h1>
          <p className="mt-1 text-sm text-kc-muted">
            Token đã lên sàn và yêu cầu niêm yết đang chờ duyệt
            {total > 0 ? ` · ${tokens.length}/${total} token` : ""}.
          </p>
        </div>
        <Button
          type="button"
          className="bg-emerald-600 hover:bg-emerald-500"
          onClick={() => router.push("/issuer/create")}
        >
          <HiOutlinePlusCircle className="h-5 w-5" />
          Phát hành mới
        </Button>
      </div>

      {pendingRequests.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-300/90">
            Chờ admin duyệt ({pendingRequests.length})
          </h2>
          <ul className="space-y-2">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <TokenIdentity
                    logo={r.logo}
                    symbol={r.symbol}
                    name={r.name}
                    id={r.id}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-kc-fg">{r.symbol}</p>
                    <p className="text-xs text-kc-muted">{r.name}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    LISTING_REQUEST_STATUS_TONE.pending
                  )}
                >
                  {LISTING_REQUEST_STATUS_LABEL.pending}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading || requestsLoading ? (
        <p className="text-sm text-kc-muted">Đang tải…</p>
      ) : tokens.length === 0 ? (
        <Card className="border-dashed border-kc-border/60">
          <CardContent className="py-12 text-center text-sm text-kc-muted">
            Chưa có token đã list.{" "}
            <Link href="/issuer/create" className="text-emerald-400 hover:underline">
              Gửi yêu cầu niêm yết
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tokens.map((t) => (
            <li key={t.id}>
              <Card className="border-kc-border/50 bg-[#0d141f]/60 transition-colors hover:border-emerald-500/25">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIdentity
                      logo={t.logo}
                      symbol={t.symbol}
                      name={t.name}
                      id={t.id}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-kc-fg">
                        {t.name}{" "}
                        <span className="text-kc-muted">({t.symbol})</span>
                      </p>
                      <p className="text-xs text-kc-muted">
                        Giá {t.price?.toLocaleString()} {QUOTE_SYMBOL}
                        {t.marketCap != null
                          ? ` · vốn hoá ${t.marketCap.toLocaleString()} ${QUOTE_SYMBOL}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(tokenDetailPath(t.id))}
                    >
                      Chi tiết
                    </Button>
                    {t.symbol ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(tradeHref(t))
                        }
                      >
                        Giao dịch
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ListLoadMore
        hasMore={hasMore}
        loading={loading}
        onLoadMore={() => setPage((p) => p + 1)}
      />
    </div>
  );
}
