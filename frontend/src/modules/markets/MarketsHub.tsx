"use client";

import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import MarketAnnouncementTicker from "@/modules/markets/components/MarketAnnouncementTicker";
import MarketCategoryNav from "@/modules/markets/components/MarketCategoryNav";
import MarketHotRow from "@/modules/markets/components/MarketHotRow";
import MarketMoversPanel from "@/modules/markets/components/MarketMoversPanel";
import MarketOverviewStrip from "@/modules/markets/components/MarketOverviewStrip";
import MarketTokenTable from "@/modules/markets/components/MarketTokenTable";
import UpcomingListingsSection from "@/modules/markets/components/UpcomingListingsSection";
import {
  computeMarketOverview,
  filterByCategory,
  getHotTokens,
  getTopGainers,
  getTopLosers,
  filterByAssetCategory,
  type MarketCategoryId,
} from "@/modules/markets/market-hub-utils";
import type { ITokenCrypto } from "@/types/token.type";
import type { IUpcomingListing } from "@/types/upcoming-listing.type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlineSparkles,
} from "react-icons/hi";
import { TOKEN_ASSET_CATEGORIES } from "@/lib/token-categories";
import { toast } from "react-toastify";

export default function MarketsHub() {
  const [category, setCategory] = useState<MarketCategoryId>("all");
  const [assetCategory, setAssetCategory] = useState("all");
  const [searchLocal, setSearchLocal] = useState("");
  const [sortColumn, setSortColumn] = useState("marketCap");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { watchList, updateUserInfo, isLogin } = useAuth();
  const {
    data: coins,
    setQueryParams,
    refetch,
    loading,
  } = useFetchApi<ITokenCrypto[]>("/token-crypto/all", {
    defaultParams: { orderBy: `${sortColumn}:${sortDirection}` },
  });
  const { data: upcomingRaw, loading: upcomingLoading } = useFetchApi<
    IUpcomingListing[]
  >("/token-crypto/upcoming/listings");
  const { mutate } = useMutation("POST", "/users/watch-list");

  const debouncedSearch = useMemo(
    () => debounce((value: string) => setQueryParams({ name: value }), 400),
    [setQueryParams]
  );

  const allTokens = coins ?? [];

  const overview = useMemo(
    () => computeMarketOverview(allTokens),
    [allTokens]
  );

  const hotTokens = useMemo(() => getHotTokens(allTokens, 8), [allTokens]);
  const gainers = useMemo(() => getTopGainers(allTokens, 5), [allTokens]);
  const losers = useMemo(() => getTopLosers(allTokens, 5), [allTokens]);
  const upcomingListings = upcomingRaw ?? [];

  const filteredTokens = useMemo(() => {
    let list = filterByAssetCategory(
      filterByCategory(allTokens, category, watchList),
      assetCategory
    );
    const q = searchLocal.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          `${t.name ?? ""} ${t.symbol ?? ""}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTokens, category, assetCategory, watchList, searchLocal]);

  const handleSort = (column: string) => {
    if (column === "rating" || column === "actions") return;
    let direction: "asc" | "desc";
    if (sortColumn === column) {
      direction = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(direction);
    } else {
      setSortColumn(column);
      direction =
        column === "marketCap" ||
        column === "price" ||
        column.startsWith("priceChange") ||
        column === "volume24h"
          ? "desc"
          : "asc";
      setSortDirection(direction);
    }
    setQueryParams({ orderBy: `${column}:${direction}` });
  };

  const watchCoin = async (
    e: React.MouseEvent,
    tokenId: string
  ) => {
    e.stopPropagation();
    const response = await mutate([tokenId] as never);
    if (response && typeof response === "object" && "success" in response) {
      const r = response as { success?: boolean; data?: { message?: string } };
      if (r.success) {
        toast.success(r.data?.message ?? "Đã cập nhật watchlist");
        updateUserInfo();
      }
    }
  };

  const showHighlights = category === "all";

  return (
    <div className="min-h-screen bg-kc-bg">
      <MarketAnnouncementTicker />

      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {/* Hero */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge tone="accent" className="mb-3">
              KingCoin Market Hub
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-kc-fg sm:text-4xl">
              Thị trường{" "}
              <span className="text-gradient-kc">token & chỉ số</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-kc-muted sm:text-base">
              Khám phá token hot, biến động mạnh, lịch niêm yết và bảng giá live —
              giao dịch Spot/Futures ngay trên sàn mô phỏng KingCoin.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-96">
            <Input
              placeholder="Lọc nhanh theo tên / symbol…"
              value={searchLocal}
              onChange={(e) => {
                setSearchLocal(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                className="flex-1"
                onClick={() => refetch()}
              >
                <HiOutlineRefresh className="h-4 w-4" />
                Làm mới
              </Button>
              <Link
                href="/issuer"
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-kc-accent px-3 text-sm font-medium text-kc-bg shadow-kc-glow hover:bg-kc-accent-hover"
              >
                <HiOutlineSparkles className="h-4 w-4" />
                Studio
              </Link>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Quest — kiếm KC",
              desc: "Hoàn thành nhiệm vụ để có vốn trade",
              href: "/quest",
              accent: "text-kc-accent",
            },
            {
              title: "Futures",
              desc: "Long/Short với đòn bẩy (mô phỏng)",
              href: "/futures",
              accent: "text-violet-300",
            },
            {
              title: "Chuyển đổi nhanh",
              desc: "Đổi token theo giá spot KC",
              href: "/convert",
              accent: "text-emerald-300",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-kc-border bg-kc-elevated/60 px-4 py-3 transition hover:border-kc-border-strong hover:bg-kc-surface/50"
            >
              <div>
                <p className={`text-sm font-semibold ${item.accent}`}>
                  {item.title}
                </p>
                <p className="text-xs text-kc-muted">{item.desc}</p>
              </div>
              <HiOutlineArrowRight className="h-4 w-4 text-kc-muted transition group-hover:translate-x-0.5 group-hover:text-kc-fg" />
            </Link>
          ))}
        </div>

        <div className="mb-8">
          <MarketOverviewStrip overview={overview} />
        </div>

        {showHighlights ? (
          <div className="mb-8 space-y-8">
            <UpcomingListingsSection
              listings={upcomingListings}
              loading={upcomingLoading}
            />
            <MarketHotRow tokens={hotTokens} />
            <MarketMoversPanel gainers={gainers} losers={losers} />
          </div>
        ) : null}

        {/* Category + table */}
        <div className="space-y-4">
          <div
            className="sticky top-16 z-40 -mx-4 border-b border-kc-border bg-kc-bg/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6"
            data-tour="markets-list"
          >
            <MarketCategoryNav
              active={category}
              onChange={setCategory}
              tokens={allTokens}
              watchList={watchList}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-kc-muted">Hạng mục:</span>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value)}
                className="h-8 rounded-lg border border-kc-border bg-kc-surface px-2 text-xs text-kc-fg"
              >
                <option value="all">Tất cả</option>
                {TOKEN_ASSET_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {!isLogin && category === "watchlist" ? (
              <p className="mt-2 text-xs text-kc-muted">
                <Link href="/login" className="text-kc-accent hover:underline">
                  Đăng nhập
                </Link>{" "}
                để lưu watchlist.
              </p>
            ) : null}
          </div>

          <MarketTokenTable
            tokens={filteredTokens}
            loading={loading}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            watchList={watchList}
            onToggleWatch={watchCoin}
          />

          <p className="text-center text-xs text-kc-muted">
            Hiển thị {filteredTokens.length} token
            {category !== "all" ? ` · nhóm ${category}` : ""}. Giá cập nhật live.
          </p>
        </div>
      </div>
    </div>
  );
}
