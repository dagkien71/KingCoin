"use client";

import DbTokenPriceChart from "@/components/charts/DbTokenPriceChart";
import { CHART_LOG_FETCH_LIMIT } from "@/constants/chart-layout";
import {
  TRADE_BOOK_SECTION_CLASS,
  TRADE_CHART_SECTION_CLASS,
  TRADE_MY_ORDERS_SECTION_CLASS,
  TRADE_ORDER_ASIDE_CLASS,
  TRADE_PANEL_HEIGHT_CLASS,
  TRADE_TERMINAL_GRID_CLASS,
} from "@/constants/trade-layout";
import { Skeleton } from "@/components/ui/skeleton";
import PriceAlertPanel from "@/components/notifications/PriceAlertPanel";
import useAuth from "@/hooks/useAuth";
import useGlobalTradingNotify from "@/hooks/useGlobalTradingNotify";
import { MarketLiveProvider, useLiveTicker, useSmoothedPrice } from "@/context/market-live-context";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import useFetchApi from "@/hooks/useFetchApi";
import { tokenCryptoApiPath } from "@/lib/token-routes";
import useLiveFetch from "@/hooks/useLiveFetch";
import { FuturesOrderPanel } from "@/modules/futures/FuturesOrderPanel";
import { FuturesPanelModal } from "@/modules/futures/FuturesPanelModal";
import { FuturesPairToolbar } from "@/modules/futures/FuturesPairToolbar";
import { FuturesMyPanel } from "@/modules/futures/FuturesMyPanel";
import { FuturesPairSelect } from "@/modules/futures/FuturesPairSelect";
import HistoryOrder from "@/modules/trade/components/history-order";
import Summary from "@/modules/trade/components/main/summary";
import ViewVolumeOrder from "@/modules/trade/components/view-volume-order";
import type { FuturesConfig } from "@/types/futures.type";
import type { ITokenCrypto, ITokenCryptoLog } from "@/types/token.type";
import { isStablecoinToken } from "@/types/token.type";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineBell } from "react-icons/hi";

function FuturesTerminalInner({
  pairSlug,
  seedToken,
}: {
  pairSlug: string;
  seedToken: ITokenCrypto | null;
}) {
  const [posTick, setPosTick] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<"Chart" | "Summary">("Chart");
  const [activeBookTab, setActiveBookTab] = useState<"orders" | "history">(
    "orders"
  );
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);

  const tokenPath = pairSlug ? `/token-crypto/${encodeURIComponent(pairSlug)}` : "";
  const {
    data: cryptoBase,
    refetch: refetchToken,
    loading: tokenLoading,
  } = useFetchApi<ITokenCrypto>(tokenPath);
  const cryptoData = cryptoBase ?? seedToken;

  const configUrl = cryptoData?.id ? `/futures/config/${cryptoData.id}` : "";
  const markUrl = cryptoData?.id
    ? `/futures/mark-price?tokenId=${encodeURIComponent(cryptoData.id)}`
    : "";
  const { data: config, refetch: refetchConfig } =
    useFetchApi<FuturesConfig>(configUrl);
  const { data: markData, refetch: refetchMark } = useFetchApi<{
    markPrice: number;
  }>(markUrl, {
    refreshInterval: cryptoData?.id ? 60_000 : undefined,
    silentOnPoll: true,
  });

  const tickerPatch = useLiveTicker(cryptoData?.id ?? null);
  const chartPatch = useSmoothedPrice(cryptoData?.id ?? null, "chart");
  const liveToken = useMemo(
    () =>
      cryptoData ? applyTickerPatch(cryptoData, tickerPatch) ?? cryptoData : null,
    [cryptoData, tickerPatch]
  );

  const liveSpot =
    liveToken?.price != null && liveToken.price > 0
      ? liveToken.price
      : null;
  const markPrice = liveSpot ?? markData?.markPrice ?? cryptoData?.price ?? 0;
  const chartSpotPrice = chartPatch?.price ?? markPrice;

  const logPath =
    cryptoData?.id != null
      ? `/crypto-logs/${cryptoData.id}?limit=${CHART_LOG_FETCH_LIMIT}`
      : "";
  const {
    data: logCryptoData,
    refetch: refetchLogData,
    loading: logLoading,
  } = useLiveFetch<ITokenCryptoLog[]>(logPath, {
    stream: ["logs", "trades"],
  });

  const { updateUserInfo, isLogin } = useAuth();

  const onPositionChange = useCallback(() => {
    setPosTick((n) => n + 1);
    updateUserInfo();
    void refetchMark();
  }, [updateUserInfo, refetchMark]);

  useGlobalTradingNotify({
    enabled: isLogin,
    onTradingEvent: onPositionChange,
  });

  const refreshAll = useCallback(() => {
    refetchToken();
    refetchConfig();
    void refetchLogData();
    void refetchMark();
    updateUserInfo();
  }, [
    refetchToken,
    refetchConfig,
    refetchLogData,
    refetchMark,
    updateUserInfo,
  ]);

  if (!tokenLoading && cryptoData && isStablecoinToken(cryptoData)) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-kc-bg px-4">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-kc-fg">
            KC không có hợp đồng perpetual
          </p>
          <p className="mt-2 text-xs text-kc-muted">
            Futures chỉ hỗ trợ alt/KC. Chọn cặp từ danh sách.
          </p>
          <Link
            href="/futures"
            className="mt-4 inline-block text-sm font-medium text-kc-accent hover:underline"
          >
            Danh sách Futures
          </Link>
        </div>
      </div>
    );
  }

  const renderMainTabContent = () => {
    if (activeMainTab === "Chart") {
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

  const renderBookTabContent = (token: ITokenCrypto) => {
    if (activeBookTab === "orders") {
      return <ViewVolumeOrder token={token} />;
    }
    return <HistoryOrder tokenId={token.id} symbol={token.symbol} />;
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-kc-bg">
      <div className="border-b border-kc-border bg-gradient-to-b from-kc-elevated to-kc-bg">
        <FuturesPairToolbar
          token={cryptoData}
          loading={tokenLoading}
          pairSlug={pairSlug}
          markPrice={markPrice}
          onRefresh={refreshAll}
        />
        <div className="border-t border-kc-border/60 px-3 pb-2 md:hidden">
          <FuturesPairSelect
            currentTokenId={cryptoData?.id}
            className="w-full rounded-lg border border-kc-border bg-kc-surface px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div className={TRADE_TERMINAL_GRID_CLASS}>
        {/* Biểu đồ */}
        <section
          className={clsx(
            TRADE_CHART_SECTION_CLASS,
            TRADE_PANEL_HEIGHT_CLASS,
            "flex min-w-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
            "ring-1 ring-white/[0.04]"
          )}
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
              href="/futures"
              className="ml-auto text-xs font-medium text-kc-muted hover:text-kc-fg md:hidden"
            >
              ← Danh sách
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderMainTabContent()}
          </div>
        </section>

        {/* Sổ lệnh spot (mark reference) */}
        <section
          className={clsx(
            TRADE_BOOK_SECTION_CLASS,
            TRADE_PANEL_HEIGHT_CLASS,
            "flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
            "ring-1 ring-white/[0.04] md:min-h-0 md:h-full md:max-h-none xl:max-h-[620px]"
          )}
        >
          <div className="shrink-0 border-b border-kc-border bg-kc-surface/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(["orders", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveBookTab(tab)}
                    className={clsx(
                      "rounded-md px-2.5 py-1 text-xs font-semibold sm:text-sm",
                      activeBookTab === tab
                        ? "bg-white/[0.06] text-kc-accent"
                        : "text-kc-muted hover:text-kc-fg"
                    )}
                  >
                    {tab === "orders" ? "Sổ lệnh" : "Lịch sử"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-kc-muted">Spot · mark</span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {cryptoData ? (
              renderBookTabContent(cryptoData)
            ) : (
              <p className="p-4 text-center text-xs text-kc-muted">
                Đang tải sổ lệnh…
              </p>
            )}
          </div>
        </section>

        {/* Mở vị thế — nằm trong layout, cuộn cùng trang */}
        <aside className={clsx(TRADE_ORDER_ASIDE_CLASS, "w-full shrink-0")}>
          {cryptoData && liveToken ? (
            <div
              className={clsx(
                TRADE_PANEL_HEIGHT_CLASS,
                "flex w-full flex-col overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
                "ring-1 ring-white/[0.04] md:min-h-0 md:h-full md:max-h-none xl:max-h-[620px]"
              )}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-kc-border bg-kc-surface/40 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-kc-fg">Mở vị thế</p>
                  <p className="text-[10px] text-kc-muted">Isolated · Market</p>
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
              <FuturesOrderPanel
                token={liveToken}
                config={config}
                markPrice={markPrice}
                onSuccess={onPositionChange}
              />
            </div>
          ) : (
            <div
              className={clsx(
                TRADE_PANEL_HEIGHT_CLASS,
                "flex items-center justify-center rounded-xl border border-dashed border-kc-border bg-kc-surface/30 p-6 text-center text-sm text-kc-muted"
              )}
            >
              {tokenLoading ? (
                <Skeleton className="mx-auto h-8 w-32" />
              ) : (
                "Đang tải form futures…"
              )}
            </div>
          )}

          <FuturesPanelModal
            open={priceAlertOpen}
            onClose={() => setPriceAlertOpen(false)}
            title="Cảnh báo giá"
            subtitle={
              liveToken?.symbol
                ? `${liveToken.symbol}/KC · Futures`
                : "Futures"
            }
            size="lg"
          >
            {liveToken ? (
              <PriceAlertPanel
                tokenId={liveToken.id}
                marketKind="futures"
                currentPrice={markPrice}
                symbol={liveToken.symbol ?? liveToken.name ?? undefined}
              />
            ) : null}
          </FuturesPanelModal>
        </aside>

        {/* Vị thế của tôi */}
        <section
          className={clsx(
            TRADE_MY_ORDERS_SECTION_CLASS,
            "overflow-hidden rounded-xl border border-kc-border bg-kc-elevated shadow-kc",
            "ring-1 ring-white/[0.04]"
          )}
        >
          <div className="border-b border-kc-border bg-gradient-to-r from-kc-surface/60 via-kc-surface/40 to-transparent px-4 py-3">
            <p className="text-sm font-bold text-kc-fg">Vị thế của tôi</p>
            <p className="mt-0.5 text-[10px] text-kc-muted">
              Theo dõi PnL, margin và lịch sử futures
            </p>
          </div>
          <div className="p-3 sm:p-5">
            <FuturesMyPanel
              tokenId={cryptoData?.id}
              refreshKey={posTick}
              onRefetch={onPositionChange}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function FuturesTerminal() {
  const router = useRouter();
  const pairSlug = typeof router.query.name === "string" ? router.query.name : "";
  const tokenPath = pairSlug ? tokenCryptoApiPath(pairSlug) : "";
  const { data: bootstrap } = useFetchApi<ITokenCrypto>(tokenPath);
  const tokenId = bootstrap?.id ?? null;

  if (!pairSlug) {
    return null;
  }

  return (
    <MarketLiveProvider tokenId={tokenId}>
      <FuturesTerminalInner pairSlug={pairSlug} seedToken={bootstrap ?? null} />
    </MarketLiveProvider>
  );
}
