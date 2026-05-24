import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveAssetQuotePrice } from "@/components/live/LiveTokenStats";
import { QUOTE_SYMBOL } from "@/constants/quote";
import { useMarketLive } from "@/context/market-live-context";
import { NAV_PRICE_DEBOUNCE_MS } from "@/constants/live-display";
import useAuth from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import useFetchApi from "@/hooks/useFetchApi";
import useLiveFetch from "@/hooks/useLiveFetch";
import { ledgerEntryLabel } from "@/lib/ledger-labels";
import { tradeHref } from "@/lib/token-routes";
import { AccountQuickLinks } from "@/modules/account/components/AccountQuickLinks";
import { AllocationDonut } from "@/modules/account/components/AllocationDonut";
import { buildPortfolio, formatPnLLine } from "@/modules/account/portfolio";
import type { IBalanceSnapshot, ILedgerEntry } from "@/types/trade.type";
import { ITokenCrypto } from "@/types/token.type";
import { formatTokenPrice } from "@/utils/format-number";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const MIN_VALUE_KC = 0.01;

function maskValue(hidden: boolean, value: string): string {
  return hidden ? "******" : value;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [hideSmallAssets, setHideSmallAssets] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);

  /** Giá thị trường mọi mã (SLR, …) — không dùng /token-crypto (chỉ token user tạo). */
  const { data: coins } = useFetchApi<ITokenCrypto[]>("/token-crypto/all");
  const { data: balances, loading: balancesLoading } =
    useLiveFetch<IBalanceSnapshot>("/users/me/balances", {
      stream: "trades",
    });
  const { data: ledgerRaw } = useLiveFetch<{ data: ILedgerEntry[] }>(
    "/users/me/ledger",
    { stream: "trades" }
  );
  const { data: quests } = useFetchApi<
    { id: string; completed: boolean }[] | null
  >("/quests");

  const { tickers } = useMarketLive();
  const tickersForNav = useDebouncedValue(tickers, NAV_PRICE_DEBOUNCE_MS);
  const ledgerEntries = ledgerRaw?.data ?? [];

  const tokensById = useMemo(() => {
    const m = new Map<string, ITokenCrypto>();
    for (const c of coins ?? []) {
      if (c.id) m.set(c.id, c);
    }
    return m;
  }, [coins]);

  const livePriceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const [id, patch] of Object.entries(tickersForNav)) {
      if (patch.price != null && patch.price > 0) m.set(id, patch.price);
    }
    return m;
  }, [tickersForNav]);

  const portfolio = useMemo(
    () =>
      buildPortfolio(
        balances ?? undefined,
        tokensById,
        livePriceById,
        hideSmallAssets ? MIN_VALUE_KC : 0
      ),
    [balances, tokensById, livePriceById, hideSmallAssets]
  );

  const dailyPnL = formatPnLLine(user?.dailyPnL, user?.dailyPnLPercent);
  const weeklyPnL = formatPnLLine(user?.weeklyPnL, user?.weeklyPnLPercent);

  const pendingQuests = (quests ?? []).filter((q) => !q.completed).length;

  const filteredHoldings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return portfolio.holdings;
    return portfolio.holdings.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.symbol.toLowerCase().includes(q)
    );
  }, [portfolio.holdings, searchTerm]);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-kc-bg text-kc-fg">
      <div className="container mx-auto max-w-6xl p-4 pb-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tổng quát</h1>
            <p className="mt-1 text-sm text-kc-muted">
              Xin chào{" "}
              <span className="text-kc-fg">
                {user?.username ?? user?.email ?? "bạn"}
              </span>
              {memberSince ? ` · Thành viên từ ${memberSince}` : null}
            </p>
          </div>
          <AccountQuickLinks />
        </div>

        {pendingQuests > 0 ? (
          <div className="mb-4 rounded-xl border border-kc-accent/40 bg-kc-accent/10 px-4 py-3 text-sm">
            Bạn có{" "}
            <strong className="text-kc-accent">{pendingQuests}</strong> nhiệm vụ
            chưa nhận thưởng.{" "}
            <Link href="/quest" className="font-medium text-kc-accent underline">
              Xem nhiệm vụ →
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="num text-3xl font-bold tracking-tight">
                      {maskValue(
                        hideBalances,
                        formatTokenPrice(2, portfolio.totalKc)
                      )}
                      <span className="ml-1 text-sm font-normal text-kc-muted">
                        {QUOTE_SYMBOL}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="shrink-0 text-kc-muted transition hover:text-kc-fg"
                      aria-label={hideBalances ? "Hiện số dư" : "Ẩn số dư"}
                      onClick={() => setHideBalances((v) => !v)}
                    >
                      {hideBalances ? (
                        <FaEyeSlash className="h-4 w-4" />
                      ) : (
                        <FaEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-kc-muted">
                    KC:{" "}
                    {maskValue(
                      hideBalances,
                      formatTokenPrice(2, portfolio.quoteKc)
                    )}{" "}
                    · Altcoin:{" "}
                    {maskValue(
                      hideBalances,
                      formatTokenPrice(2, portfolio.altValueKc)
                    )}
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-kc-muted">
                      Lãi/lỗ NAV ước tính (so với đầu ngày / đầu tuần, quy KC)
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-kc-muted">Hôm nay</span>
                      <span
                        className={`num font-medium ${
                          dailyPnL.positive ? "text-kc-up" : "text-kc-down"
                        }`}
                      >
                        {hideBalances ? "******" : dailyPnL.text}
                      </span>
                      <span className="text-kc-muted">· Tuần</span>
                      <span
                        className={`num font-medium ${
                          weeklyPnL.positive ? "text-kc-up" : "text-kc-down"
                        }`}
                      >
                        {hideBalances ? "******" : weeklyPnL.text}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled
                    title="Mô phỏng — không hỗ trợ nạp fiat/on-chain"
                  >
                    Nạp tiền
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => router.push("/convert")}
                  >
                    Chuyển đổi
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => router.push("/trade")}
                  >
                    Giao dịch
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    disabled
                    title="Mô phỏng — không hỗ trợ rút fiat/on-chain"
                  >
                    Rút tiền
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => router.push("/wallet")}
                  >
                    Ví chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Tài sản đang nắm</CardTitle>
                  <p className="mt-1 text-xs text-kc-muted">
                    Chỉ token trong ví — không phải toàn thị trường
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <input
                    className="w-full rounded-lg border border-kc-border bg-kc-elevated px-3 py-2 text-sm text-kc-fg placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-accent sm:w-56"
                    placeholder="Tìm trong ví"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-kc-muted">
                    <input
                      className="h-4 w-4 rounded border-kc-border bg-kc-elevated text-kc-accent focus:ring-kc-accent"
                      type="checkbox"
                      checked={hideSmallAssets}
                      onChange={(e) => setHideSmallAssets(e.target.checked)}
                    />
                    Ẩn &lt; {MIN_VALUE_KC} KC
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between gap-3 border-b border-kc-border/80 py-3 text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-kc-accent/40 bg-kc-accent/15 text-xs font-bold text-kc-accent">
                      KC
                    </div>
                    <div>
                      <div>KingCoin ({QUOTE_SYMBOL})</div>
                      <div className="text-xs font-normal text-kc-muted">
                        Số dư quote
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num font-semibold">
                      {maskValue(
                        hideBalances,
                        formatTokenPrice(4, portfolio.quoteKc)
                      )}
                    </div>
                    <div className="text-xs text-kc-muted">
                      {portfolio.kcSharePct.toFixed(1)}% danh mục
                    </div>
                  </div>
                </div>

                {balancesLoading ? (
                  <p className="py-6 text-center text-sm text-kc-muted">
                    Đang tải số dư…
                  </p>
                ) : null}

                {filteredHoldings.map((h) => {
                  const meta = tokensById.get(h.tokenId);
                  const tradeLink = meta
                    ? tradeHref(meta)
                    : h.symbol
                      ? tradeHref({
                          id: h.tokenId,
                          name: null,
                          symbol: h.symbol,
                        })
                      : null;
                  const row = (
                    <div className="flex items-center justify-between gap-3 border-b border-kc-border/80 py-3 last:border-0">
                      <div className="flex min-w-0 items-center gap-3">
                        {h.logo ? (
                          <img
                            alt=""
                            className="h-9 w-9 rounded-lg border border-kc-border object-cover"
                            src={h.logo}
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-kc-border bg-kc-surface text-xs font-semibold text-kc-accent">
                            {h.symbol?.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {h.name} ({h.symbol})
                          </div>
                          <div className="num text-xs text-kc-muted">
                            {maskValue(
                              hideBalances,
                              formatTokenPrice(4, h.amount)
                            )}{" "}
                            ·{" "}
                            {meta ? (
                              <LiveAssetQuotePrice
                                token={meta}
                                className="num inline text-xs text-kc-muted"
                              />
                            ) : (
                              formatTokenPrice(4, h.priceKc)
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num font-semibold">
                          {maskValue(
                            hideBalances,
                            formatTokenPrice(2, h.valueKc)
                          )}{" "}
                          <span className="text-xs font-normal text-kc-muted">
                            KC
                          </span>
                        </div>
                        <div className="text-xs text-kc-muted">
                          {h.sharePct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                  return tradeLink ? (
                    <Link
                      key={h.tokenId}
                      href={tradeLink}
                      className="block transition hover:bg-white/[0.02]"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={h.tokenId}>{row}</div>
                  );
                })}

                {!balancesLoading &&
                !filteredHoldings.length &&
                portfolio.quoteKc < MIN_VALUE_KC ? (
                  <div className="py-8 text-center text-sm text-kc-muted">
                    <p>Chưa có altcoin trong ví.</p>
                    <Link
                      href="/quest"
                      className="mt-2 inline-block text-kc-accent hover:underline"
                    >
                      Làm nhiệm vụ nhận KC →
                    </Link>
                  </div>
                ) : null}

                {!balancesLoading && filteredHoldings.length > 0 ? (
                  <p className="pt-2 text-center text-xs text-kc-muted">
                    <Link href="/markets" className="text-kc-accent hover:underline">
                      Xem thị trường
                    </Link>{" "}
                    để khám phá thêm token
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationDonut
                  slices={[
                    {
                      label: QUOTE_SYMBOL,
                      pct: portfolio.kcSharePct,
                      color: "rgb(var(--kc-accent-rgb, 234 179 8))",
                    },
                    {
                      label: "Altcoin",
                      pct: portfolio.altSharePct,
                      color: "rgb(96 165 250)",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Giao dịch gần đây</CardTitle>
                <Link
                  href="/wallet"
                  className="text-xs font-medium text-kc-accent hover:underline"
                >
                  Xem tất cả
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {ledgerEntries.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-2 border-b border-kc-border/80 pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <span className="block text-kc-fg">
                        {ledgerEntryLabel(e.refType, e.note)}
                      </span>
                      <span className="text-xs text-kc-muted">
                        {new Date(e.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <span
                      className={`num shrink-0 font-semibold ${
                        e.amount >= 0 ? "text-kc-up" : "text-kc-down"
                      }`}
                    >
                      {hideBalances
                        ? "******"
                        : `${e.amount >= 0 ? "+" : ""}${formatTokenPrice(2, e.amount)} ${e.currency}`}
                    </span>
                  </div>
                ))}
                {!ledgerEntries.length ? (
                  <p className="text-sm text-kc-muted">Chưa có biến động ví.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
