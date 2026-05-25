"use client";

import DbTokenPriceChart from "@/components/charts/DbTokenPriceChart";
import { ORDER_BOOK_PANEL_HEIGHT_PX } from "@/constants/order-book";
import { Skeleton } from "@/components/ui/skeleton";
import useAuth from "@/hooks/useAuth";
import useGlobalTradingNotify from "@/hooks/useGlobalTradingNotify";
import useMyOrderFillNotify from "@/hooks/useMyOrderFillNotify";
import PriceAlertPanel from "@/components/notifications/PriceAlertPanel";
import { MarketLiveProvider, useLiveTicker, useSmoothedPrice } from "@/context/market-live-context";
import {
  LivePairTradePriceBlock,
  LivePairTradeSubtitle,
} from "@/components/live/LiveTokenStats";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import useFetchApi from "@/hooks/useFetchApi";
import useLiveFetch from "@/hooks/useLiveFetch";
import useMutation from "@/hooks/useMutation";
import { ITokenCrypto, ITokenCryptoLog } from "@/types/token.type";
import Summary from "@/modules/trade/components/main/summary";
import HistoryOrder from "@/modules/trade/components/history-order";
import MyOrder from "@/modules/trade/components/my-order";
import SetOrder from "@/modules/trade/components/set-order";
import ViewVolumeOrder from "@/modules/trade/components/view-volume-order";
import { DEFAULT_TRADE_TOKEN_SLUG } from "@/constants/trade";
import { tokenCryptoApiPath } from "@/lib/token-routes";
import { QUOTE_SYMBOL, withQuoteUnit } from "@/constants/quote";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { BiStar } from "react-icons/bi";
import { FaChevronLeft, FaStar, FaSyncAlt } from "react-icons/fa";
import { HiOutlineBell } from "react-icons/hi";
import { FuturesPanelModal } from "@/modules/futures/FuturesPanelModal";

function PairToolbar({
  token,
  loading,
  pairSlug,
  onRefresh,
}: {
  token: ITokenCrypto | null;
  loading: boolean;
  pairSlug: string;
  onRefresh: () => void;
}) {
  const { watchList, isLogin, updateUserInfo } = useAuth();
  const { mutate: toggleWatch } = useMutation("POST", "/users/watch-list");
  const symbol = token?.symbol ?? pairSlug.toUpperCase();
  const logoSrc =
    token?.logo ||
    (token?.symbol
      ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(token.symbol)}`
      : null);
  const inWatchlist = token?.id ? watchList?.includes(token.id) : false;

  const watchCoin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!token?.id || !isLogin) {
      toast.info("Đăng nhập để lưu vào danh sách theo dõi.");
      return;
    }
    const response = await toggleWatch([token.id] as never);
    if (response && typeof response === "object" && "success" in response) {
      const r = response as { success?: boolean; data?: { message?: string } };
      if (r.success) {
        toast.success(r.data?.message ?? "Đã cập nhật danh sách theo dõi");
        updateUserInfo();
      }
    }
  };

  if (loading && !token) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 lg:px-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-1 items-start gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="px-3 py-8 text-center lg:px-4">
        <p className="text-sm font-medium text-kc-fg">Không tìm thấy cặp giao dịch</p>
        <p className="mt-1 text-xs text-kc-muted">
          Kiểm tra ký hiệu hoặc quay lại thị trường. Nếu môi trường mới, hãy chạy
          seed backend để tạo token{" "}
          <span className="num font-medium text-kc-fg">{DEFAULT_TRADE_TOKEN_SLUG}</span>.
        </p>
        <Link
          href="/token/list"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-kc-accent hover:text-kc-accent-hover"
        >
          <FaChevronLeft className="h-3 w-3" /> Thị trường
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 lg:px-4">
      <button
        type="button"
        onClick={watchCoin}
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kc-border bg-kc-surface transition-colors",
          "hover:border-kc-border-strong hover:bg-kc-elevated"
        )}
        aria-label={inWatchlist ? "Bỏ khỏi danh sách theo dõi" : "Thêm vào danh sách theo dõi"}
      >
        {inWatchlist ? (
          <FaStar className="h-4 w-4 text-kc-accent" />
        ) : (
          <BiStar className="h-4 w-4 text-kc-fg" />
        )}
      </button>

      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-kc-border object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-kc-border bg-kc-surface text-sm font-bold text-kc-accent">
          {symbol.slice(0, 2)}
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-kc-fg sm:text-xl">
            <span className="num">{symbol}</span>
            <span className="text-kc-fg">/{QUOTE_SYMBOL}</span>
          </h1>
          {token.id ? <LivePairTradeSubtitle token={token} /> : null}
        </div>
        {token.id ? <LivePairTradePriceBlock token={token} /> : null}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="ml-1 hidden shrink-0 rounded-lg border border-kc-border bg-kc-surface p-2 text-kc-muted transition-colors hover:border-kc-border-strong hover:text-kc-fg sm:inline-flex"
        title="Làm mới"
        aria-label="Làm mới"
      >
        <FaSyncAlt className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TradeTerminal({
  pairSlug,
  seedToken,
}: {
  pairSlug: string;
  seedToken: ITokenCrypto | null;
}) {
  const [activeOrderTab, setActiveOrderTab] = useState<"orders" | "history">(
    "orders"
  );
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"Chart" | "Summary">(
    "Chart"
  );
  const tokenPath = pairSlug ? tokenCryptoApiPath(pairSlug) : "";
  const {
    data: cryptoBase,
    refetch: refetchCryptoData,
    loading: tokenLoading,
    error: tokenLoadError,
  } = useFetchApi<ITokenCrypto>(tokenPath);
  const cryptoData = cryptoBase ?? seedToken;
  const tickerPatch = useLiveTicker(cryptoData?.id);
  const chartPatch = useSmoothedPrice(cryptoData?.id, "chart");
  const liveCrypto = useMemo(
    () => applyTickerPatch(cryptoData, tickerPatch) ?? cryptoData,
    [cryptoData, tickerPatch]
  );
  const chartSpotPrice =
    chartPatch?.price ?? liveCrypto?.price ?? cryptoData?.price;
  const logPath =
    cryptoData?.id != null ? `/crypto-logs/${cryptoData.id}` : "";
  const {
    data: logCryptoData,
    refetch: refetchLogData,
    loading: logLoading,
  } = useLiveFetch<ITokenCryptoLog[]>(logPath, {
    stream: ["logs", "trades"],
  });
  const { user, isLogin, updateUserInfo } = useAuth();
  const skipFillToastUntilRef = useRef(0);
  const refetchSpotOrdersRef = useRef<(() => void) | null>(null);

  const handleOrderFilled = useCallback(
    (opts?: { silent?: boolean }) => {
      updateUserInfo();
      if (
        opts?.silent ||
        Date.now() < skipFillToastUntilRef.current
      ) {
        return;
      }
      toast.success("Lệnh đã khớp!");
    },
    [updateUserInfo]
  );

  useMyOrderFillNotify({
    tokenId: cryptoData?.id,
    userId: isLogin ? user?.id : undefined,
    onFilled: handleOrderFilled,
  });

  useGlobalTradingNotify({
    enabled: Boolean(isLogin),
    onTradingEvent: updateUserInfo,
  });

  const tokenUnavailable =
    Boolean(pairSlug) && !tokenLoading && !cryptoData?.id;

  const renderMainTabContent = () => {
    if (activeMainTab === "Chart") {
      if (tokenUnavailable) {
        return (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-kc-muted lg:min-h-[400px]">
            <p>Không tìm thấy cặp {pairSlug.toUpperCase()}.</p>
            {tokenLoadError ? (
              <p className="text-xs text-kc-down">{tokenLoadError}</p>
            ) : null}
            <Link
              href="/token/list"
              className="text-kc-accent hover:underline"
            >
              Xem thị trường
            </Link>
          </div>
        );
      }
      if (!cryptoData?.id) {
        return (
          <div className="flex min-h-[360px] items-center justify-center px-4 text-sm text-kc-muted lg:min-h-[400px]">
            Chọn cặp hợp lệ để xem biểu đồ.
          </div>
        );
      }
      return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
          <DbTokenPriceChart
            logs={logCryptoData}
            spotPrice={chartSpotPrice}
            loading={logLoading}
            fillHeight
            viewportMode="recent-bars"
            className="h-full w-full"
          />
        </div>
      );
    }
    return <Summary token={cryptoData ?? undefined} />;
  };

  const renderOrderTabContent = (token: ITokenCrypto) => {
    if (activeOrderTab === "orders") return <ViewVolumeOrder token={token} />;
    return <HistoryOrder tokenId={token.id} symbol={token.symbol} />;
  };

  const fetchApiAll = useCallback(() => {
    refetchCryptoData();
    void refetchLogData();
    void updateUserInfo();
    refetchSpotOrdersRef.current?.();
  }, [refetchCryptoData, refetchLogData, updateUserInfo]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-kc-bg">
      <div className="border-b border-kc-border bg-gradient-to-b from-kc-elevated to-kc-bg">
        <PairToolbar
          token={cryptoData}
          loading={tokenLoading}
          pairSlug={pairSlug}
          onRefresh={() => {
            refetchCryptoData();
            void refetchLogData();
            updateUserInfo();
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)_minmax(260px,300px)] lg:items-stretch lg:gap-3 lg:p-3">
        {/* Biểu đồ — cột 1 */}
        <section
          data-tour="trade-chart"
          className={clsx(
            "order-1 flex min-w-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
            "ring-1 ring-white/[0.04]"
          )}
          style={{
            height: ORDER_BOOK_PANEL_HEIGHT_PX,
            maxHeight: ORDER_BOOK_PANEL_HEIGHT_PX,
          }}
        >
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 border-b border-kc-border bg-kc-surface/40 px-3 py-2.5 sm:px-4">
            {(["Chart", "Summary"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeMainTab === tab
                    ? "bg-kc-accent/15 text-kc-accent"
                    : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
                )}
                onClick={() => setActiveMainTab(tab)}
              >
                {tab === "Chart" ? "Biểu đồ" : "Tổng quan"}
              </button>
            ))}
            <Link
              href="/token/list"
              className="ml-auto text-xs font-medium text-kc-muted hover:text-kc-fg lg:hidden"
            >
              ← Thị trường
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderMainTabContent()}
          </div>
        </section>

        {/* Sổ lệnh — mobile sau form (order-3), desktop cột 2 */}
        <section
          data-tour="trade-orderbook"
          className={clsx(
            "order-3 flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc lg:order-2",
            "ring-1 ring-white/[0.04]"
          )}
          style={{
            height: ORDER_BOOK_PANEL_HEIGHT_PX,
            maxHeight: ORDER_BOOK_PANEL_HEIGHT_PX,
          }}
        >
          <div className="shrink-0 border-b border-kc-border bg-kc-surface/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(["orders", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveOrderTab(tab)}
                    className={clsx(
                      "rounded-md px-2.5 py-1 text-xs font-semibold sm:text-sm",
                      activeOrderTab === tab
                        ? "bg-white/[0.06] text-kc-accent"
                        : "text-kc-muted hover:text-kc-fg"
                    )}
                  >
                    {tab === "orders" ? "Sổ lệnh" : "Lịch sử"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {cryptoData ? renderOrderTabContent(cryptoData) : (
              <p className="p-4 text-center text-xs text-kc-muted">
                Đang tải sổ lệnh…
              </p>
            )}
          </div>
        </section>

        {/* Đặt lệnh — cố định chiều cao, không sticky */}
        <aside
          className={clsx(
            "order-2 w-full shrink-0 lg:order-3 lg:col-start-3 lg:row-start-1 lg:self-start"
          )}
        >
          {cryptoData ? (
            <div
              data-tour="trade-order"
              className={clsx(
                "flex w-full flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
                "ring-1 ring-white/[0.04]"
              )}
              style={{
                height: ORDER_BOOK_PANEL_HEIGHT_PX,
                maxHeight: ORDER_BOOK_PANEL_HEIGHT_PX,
              }}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-kc-border bg-kc-surface/40 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-kc-fg">Đặt lệnh</p>
                  <p className="text-[10px] text-kc-muted">Spot · Limit / Market</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPriceAlertOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-kc-border bg-kc-bg/80 px-2 py-1.5 text-[10px] font-medium text-kc-muted transition hover:border-kc-accent/30 hover:text-kc-accent"
                >
                  <HiOutlineBell className="h-3.5 w-3.5" />
                  Cảnh báo
                </button>
              </div>
              <SetOrder
                token={cryptoData}
                refetch={fetchApiAll}
                onOrderPlaced={() => {
                  skipFillToastUntilRef.current = Date.now() + 2500;
                }}
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-xl border border-dashed border-kc-border bg-kc-surface/30 p-6 text-center text-sm text-kc-muted"
              style={{
                height: ORDER_BOOK_PANEL_HEIGHT_PX,
                maxHeight: ORDER_BOOK_PANEL_HEIGHT_PX,
              }}
            >
              Đang tải bảng lệnh…
            </div>
          )}

          <FuturesPanelModal
            open={priceAlertOpen}
            onClose={() => setPriceAlertOpen(false)}
            title="Cảnh báo giá"
            subtitle={
              cryptoData?.symbol
                ? `${cryptoData.symbol}/${QUOTE_SYMBOL} · Spot`
                : "Spot"
            }
            size="lg"
          >
            {cryptoData ? (
              <PriceAlertPanel
                tokenId={cryptoData.id}
                marketKind="spot"
                currentPrice={cryptoData.price}
                symbol={cryptoData.symbol ?? cryptoData.name ?? undefined}
              />
            ) : null}
          </FuturesPanelModal>
        </aside>

        {/* Lệnh của tôi — full width, luôn cuối */}
        <section
          data-tour="trade-my-orders"
          className={clsx(
            "order-4 overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc lg:col-span-3",
            "ring-1 ring-white/[0.04]"
          )}
        >
          <div className="border-b border-kc-border bg-kc-surface/40 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-kc-muted">
              Lệnh của tôi
            </span>
          </div>
          <MyOrder
            refetch={fetchApiAll}
            onRegisterRefetch={(fn) => {
              refetchSpotOrdersRef.current = fn;
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default function TradeSpotPage() {
  const router = useRouter();
  const pairSlug =
    typeof router.query.name === "string" ? router.query.name : "";
  const tokenPath = pairSlug ? tokenCryptoApiPath(pairSlug) : "";
  const { data: bootstrap } = useFetchApi<ITokenCrypto>(tokenPath);
  const tokenId = bootstrap?.id ?? null;

  if (!pairSlug) {
    return null;
  }

  return (
    <MarketLiveProvider tokenId={tokenId}>
      <TradeTerminal pairSlug={pairSlug} seedToken={bootstrap ?? null} />
    </MarketLiveProvider>
  );
}
