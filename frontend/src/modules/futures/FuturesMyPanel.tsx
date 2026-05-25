"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QUOTE_SYMBOL } from "@/constants/quote";
import {
  liqDistancePct,
  marginHealthPct,
  marginHealthTone,
  roePercent,
} from "@/lib/futures-math";
import { futuresHref } from "@/lib/token-routes";
import { LiquidationEmphasis } from "@/modules/futures/LiquidationEmphasis";
import { FuturesTpSlModal } from "@/modules/futures/FuturesTpSlModal";
import useLiveFetch from "@/hooks/useLiveFetch";
import { useLiveFuturesPositions } from "@/hooks/useLiveFuturesPositions";
import useMutation from "@/hooks/useMutation";
import type { IBalanceSnapshot } from "@/types/trade.type";
import type {
  ClosedPositionView,
  FuturesOrderView,
  FuturesPositionView,
} from "@/types/futures.type";
import {
  formatFixedPrice,
  formatSignedKcAmount,
  formatTokenPrice,
} from "@/utils/format-number";
import clsx from "clsx";
import moment from "moment";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineShieldExclamation,
} from "react-icons/hi";
import { toast } from "react-toastify";

type Tab = "open" | "history" | "orders" | "margin";

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "open", label: "Vị thế mở", short: "Mở" },
  { id: "history", label: "Lịch sử vị thế", short: "Lịch sử" },
  { id: "orders", label: "Lệnh futures", short: "Lệnh" },
  { id: "margin", label: "Tài khoản margin", short: "Margin" },
];

const ORDER_TYPE_LABEL: Record<string, string> = {
  open_market: "Mở market",
  close_market: "Đóng market",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  closed: "Đã đóng",
  liquidated: "Thanh lý",
  filled: "Đã khớp",
  pending: "Chờ",
  canceled: "Hủy",
  rejected: "Từ chối",
};

const PRICE_DECIMALS = 4;
const DEFAULT_MAINTENANCE = 0.005;

type Props = {
  tokenId?: string;
  refreshKey?: number;
  onRefetch?: () => void;
};

export function FuturesMyPanel({ tokenId, refreshKey = 0, onRefetch }: Props) {
  const [tab, setTab] = useState<Tab>("open");

  const { data: openPos, loading: openLoading, refetch: refetchOpen } =
    useLiveFetch<FuturesPositionView[]>("/futures/positions", {
      stream: "trades",
    });

  const { data: history, loading: histLoading, refetch: refetchHist } =
    useLiveFetch<ClosedPositionView[]>("/futures/positions/history?limit=80", {
      stream: "trades",
    });

  const { data: orders, loading: ordersLoading, refetch: refetchOrders } =
    useLiveFetch<FuturesOrderView[]>("/futures/orders?limit=80", {
      stream: "trades",
    });

  const { data: balances, refetch: refetchBalances } =
    useLiveFetch<IBalanceSnapshot>("/users/me/balances", {
      stream: "trades",
    });

  const { mutate: closePos, loading: closing } = useMutation(
    "POST",
    "/futures/positions/_/close"
  );

  const openListRaw = useMemo(() => openPos ?? [], [openPos]);
  const openList = useLiveFuturesPositions(openListRaw);

  const histList = useMemo(() => {
    const all = history ?? [];
    if (!tokenId) return all;
    return all.filter((p) => p.tokenId === tokenId);
  }, [history, tokenId]);

  const orderList = useMemo(() => {
    const all = orders ?? [];
    if (!tokenId) return all;
    return all.filter((o) => o.tokenId === tokenId);
  }, [orders, tokenId]);

  const marginLocked = useMemo(
    () => openList.reduce((s, p) => s + (p.marginKc ?? 0), 0),
    [openList]
  );

  const totalUpnl = useMemo(
    () => openList.reduce((s, p) => s + p.unrealizedPnlKc, 0),
    [openList]
  );

  const totalNotional = useMemo(
    () => openList.reduce((s, p) => s + Math.abs(p.size) * p.markPrice, 0),
    [openList]
  );

  const handleClose = async (id: string) => {
    try {
      const res = await closePos(
        { size: null },
        `/futures/positions/${id}/close`
      );
      const payload =
        res && typeof res === "object" && "data" in res
          ? (res as { data?: { returnKc?: number } }).data
          : (res as { returnKc?: number } | undefined);
      const credited =
        payload?.returnKc != null ? Number(payload.returnKc) : null;
      toast.success(
        credited != null && Number.isFinite(credited)
          ? `Đã đóng vị thế — nhận ${formatTokenPrice(2, credited)} ${QUOTE_SYMBOL} về ví`
          : "Đã đóng vị thế"
      );
      void refetchOpen();
      void refetchHist();
      void refetchOrders();
      void refetchBalances();
      onRefetch?.();
    } catch {
      /* handled */
    }
  };

  const refetchAll = () => {
    void refetchOpen();
    void refetchHist();
    void refetchOrders();
  };

  useEffect(() => {
    if (refreshKey <= 0) return;
    refetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch khi có giao dịch mới từ parent
  }, [refreshKey]);

  const quoteAvailable = balances?.quoteKc ?? 0;
  const openInitialLoad = openLoading && openPos === null;
  const histInitialLoad = histLoading && history === null;
  const ordersInitialLoad = ordersLoading && orders === null;

  return (
    <div className="text-kc-fg">
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-kc-bg p-1 ring-1 ring-kc-border/70">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4",
                tab === t.id
                  ? "bg-kc-accent/15 text-kc-accent shadow-sm"
                  : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
              )}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
              {t.id === "open" && openList.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-kc-accent/20 px-1.5 py-0.5 text-[10px]">
                  {openList.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refetchAll}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-kc-border/80 px-2.5 py-2 text-[11px] font-medium text-kc-muted transition hover:border-kc-border-strong hover:text-kc-fg"
        >
          <HiOutlineRefresh className="h-3.5 w-3.5" />
          Làm mới
        </button>
      </div>

      {tab === "open" && (
        <OpenPositionsView
          list={openList}
          initialLoading={openInitialLoad}
          closing={closing}
          highlightTokenId={tokenId}
          onClose={handleClose}
          onTpSlSaved={refetchAll}
        />
      )}

      {tab === "history" && (
        <HistoryPositionsView
          list={histList}
          initialLoading={histInitialLoad}
          tokenId={tokenId}
        />
      )}

      {tab === "orders" && (
        <OrdersHistoryView
          list={orderList}
          initialLoading={ordersInitialLoad}
          tokenId={tokenId}
        />
      )}

      {tab === "margin" && (
        <MarginDashboard
          quoteAvailable={quoteAvailable}
          marginLocked={marginLocked}
          openCount={openList.length}
          totalUpnl={totalUpnl}
          totalNotional={totalNotional}
          openList={openList}
        />
      )}
    </div>
  );
}

function OpenPositionsView({
  list,
  initialLoading,
  closing,
  highlightTokenId,
  onClose,
  onTpSlSaved,
}: {
  list: FuturesPositionView[];
  initialLoading: boolean;
  closing: boolean;
  highlightTokenId?: string;
  onClose: (id: string) => void;
  onTpSlSaved?: () => void;
}) {
  if (initialLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!list.length) {
    return (
      <EmptyState
        title="Chưa có vị thế mở"
        description="Mỗi cặp có thể có Long và Short riêng; cùng chiều sẽ gộp size & giá vào."
      />
    );
  }

  return (
    <div className="space-y-3">
      {highlightTokenId && !list.some((p) => p.tokenId === highlightTokenId) ? (
        <p className="rounded-lg border border-kc-border/70 bg-kc-bg/40 px-3 py-2 text-[11px] text-kc-muted">
          Chưa có vị thế trên cặp này. Bạn có {list.length} vị thế mở trên{" "}
          {list.length === 1 ? "cặp khác" : "các cặp khác"} — xem bên dưới.
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-2">
        {list.map((p) => (
          <OpenPositionCard
            key={p.id}
            position={p}
            closing={closing}
            highlighted={
              highlightTokenId != null && p.tokenId === highlightTokenId
            }
            onClose={() => void onClose(p.id)}
            onTpSlSaved={onTpSlSaved}
          />
        ))}
      </div>
    </div>
  );
}

function OpenPositionCard({
  position: p,
  closing,
  highlighted,
  onClose,
  onTpSlSaved,
}: {
  position: FuturesPositionView;
  closing: boolean;
  highlighted?: boolean;
  onClose: () => void;
  onTpSlSaved?: () => void;
}) {
  const [tpSlOpen, setTpSlOpen] = useState(false);
  const { mutate: saveTpSl, loading: savingTpSl } = useMutation(
    "PATCH",
    "/futures/positions/_/tp-sl"
  );
  const isLong = p.side === "long";
  const up = p.unrealizedPnlKc >= 0;
  const roe = roePercent(p.unrealizedPnlKc, p.marginKc);
  const health = marginHealthPct(
    p.marginRatio,
    p.leverage,
    DEFAULT_MAINTENANCE
  );
  const tone = marginHealthTone(p.marginRatio, DEFAULT_MAINTENANCE);
  const liqDist = liqDistancePct(p.side, p.markPrice, p.liquidationPrice);
  const openedAgo = moment(p.openedAt).fromNow();

  return (
    <>
    <article
      className={clsx(
        "overflow-hidden rounded-xl border bg-gradient-to-br from-kc-bg/80 to-kc-surface/20 shadow-sm transition hover:border-kc-border-strong",
        isLong ? "border-kc-up/20" : "border-kc-down/20",
        highlighted && "ring-2 ring-kc-accent/50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-kc-border/60 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PairLink tokenId={p.tokenId} symbol={p.symbol} />
            <SidePill side={p.side} />
            <span className="num rounded-md bg-kc-bg px-1.5 py-0.5 text-[10px] font-bold text-kc-accent ring-1 ring-kc-border/60">
              {p.leverage}x
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-kc-muted">
            <HiOutlineClock className="h-3 w-3" />
            Mở {openedAgo}
          </p>
        </div>
        <div className="text-right">
          <p
            className={clsx(
              "num text-lg font-bold tabular-nums",
              up ? "text-kc-up" : "text-kc-down"
            )}
          >
            {formatSignedKcAmount(p.unrealizedPnlKc, 2)}
            <span className="ml-1 text-xs font-medium text-kc-muted">
              {QUOTE_SYMBOL}
            </span>
          </p>
          <p
            className={clsx(
              "num text-xs font-semibold",
              up ? "text-kc-up/80" : "text-kc-down/80"
            )}
          >
            ROE {roe >= 0 ? "+" : ""}
            {roe.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0 px-4 py-3 sm:grid-cols-3">
        <DetailCell label="Size" value={formatTokenPrice(4, p.size)} />
        <DetailCell
          label="Entry"
          value={formatFixedPrice(PRICE_DECIMALS, p.entryPrice)}
        />
        <DetailCell
          label="Mark"
          value={formatFixedPrice(PRICE_DECIMALS, p.markPrice)}
          highlight
        />
        <DetailCell
          label="Margin"
          value={`${formatTokenPrice(2, p.marginKc)} ${QUOTE_SYMBOL}`}
        />
        <DetailCell
          label="Notional"
          value={`${formatTokenPrice(2, Math.abs(p.size) * p.markPrice)} ${QUOTE_SYMBOL}`}
        />
      </div>

      <div className="px-4 pb-3">
        <LiquidationEmphasis
          price={formatFixedPrice(PRICE_DECIMALS, p.liquidationPrice)}
          distancePct={liqDist}
          label="Giá thanh lý (Liq.)"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-kc-border/50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-kc-muted">TP / SL</p>
          <p className="num mt-0.5 truncate text-[11px] text-kc-fg">
            {p.takeProfitPrice != null || p.stopLossPrice != null ? (
              <>
                {p.takeProfitPrice != null ? (
                  <span className="text-kc-up">
                    TP {formatFixedPrice(PRICE_DECIMALS, p.takeProfitPrice)}
                  </span>
                ) : null}
                {p.takeProfitPrice != null && p.stopLossPrice != null ? (
                  <span className="text-kc-muted"> · </span>
                ) : null}
                {p.stopLossPrice != null ? (
                  <span className="text-kc-down">
                    SL {formatFixedPrice(PRICE_DECIMALS, p.stopLossPrice)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-kc-muted">Chưa đặt</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTpSlOpen(true)}
          className="shrink-0 rounded-md border border-kc-border px-2 py-1 text-[10px] font-semibold text-kc-accent hover:border-kc-accent/40"
        >
          {p.takeProfitPrice != null || p.stopLossPrice != null
            ? "Sửa"
            : "Thêm"}
        </button>
      </div>

      {/* Health bar */}
      <div
        className={clsx(
          "border-t border-kc-border/50 px-4 py-3",
          tone === "danger" && "bg-red-500/[0.06]",
          tone === "warn" && "bg-amber-500/[0.05]"
        )}
      >
        <div className="mb-1.5 flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-kc-muted">
            {tone === "danger" ? (
              <HiOutlineShieldExclamation className="h-3.5 w-3.5 text-red-400" />
            ) : null}
            Margin ratio · cách liq ~{liqDist.toFixed(2)}%
          </span>
          <span
            className={clsx(
              "num font-semibold",
              tone === "danger" && "text-red-400",
              tone === "warn" && "text-amber-400",
              tone === "safe" && "text-kc-up"
            )}
          >
            {(p.marginRatio * 100).toFixed(2)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-kc-border/50">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              tone === "danger" && "bg-red-500",
              tone === "warn" && "bg-amber-500",
              tone === "safe" && "bg-kc-up"
            )}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-kc-border/50 bg-kc-bg/30 px-4 py-3">
        <Link
          href={futuresHref({
            id: p.tokenId,
            symbol: p.symbol ?? undefined,
            name: undefined,
          })}
          className="inline-flex h-8 flex-1 min-w-[5rem] items-center justify-center rounded-lg px-3 text-sm font-medium text-kc-muted transition hover:bg-white/[0.04] hover:text-kc-fg"
        >
          Xem cặp
        </Link>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 flex-1 min-w-[5rem]"
          onClick={() => setTpSlOpen(true)}
        >
          TP / SL
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={closing}
          className="h-8 flex-1 min-w-[5rem] bg-kc-down/15 text-kc-down hover:bg-kc-down/25 hover:text-kc-down"
          onClick={onClose}
        >
          {closing ? "Đang đóng…" : "Đóng"}
        </Button>
      </div>
    </article>

    <FuturesTpSlModal
      open={tpSlOpen}
      onClose={() => setTpSlOpen(false)}
      side={p.side}
      markPrice={p.markPrice}
      initialTakeProfit={p.takeProfitPrice}
      initialStopLoss={p.stopLossPrice}
      saving={savingTpSl}
      onSave={async (values) => {
        const res = await saveTpSl(
          values,
          `/futures/positions/${p.id}/tp-sl`
        );
        if (res === undefined) return;
        toast.success("Đã cập nhật TP/SL");
        setTpSlOpen(false);
        onTpSlSaved?.();
      }}
    />
    </>
  );
}

function DetailCell({
  label,
  value,
  valueClass,
  highlight,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div className="py-1.5">
      <p className="text-[10px] text-kc-muted">{label}</p>
      <p
        className={clsx(
          "num mt-0.5 text-xs font-semibold",
          highlight ? "text-kc-accent" : "text-kc-fg",
          valueClass
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryPositionsView({
  list,
  initialLoading,
  tokenId,
}: {
  list: ClosedPositionView[];
  initialLoading: boolean;
  tokenId?: string;
}) {
  if (initialLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }
  if (!list.length) {
    return (
      <EmptyState
        title="Chưa có lịch sử"
        description={
          tokenId
            ? "Các vị thế đã đóng hoặc thanh lý trên cặp này sẽ hiện ở đây."
            : "Lịch sử đóng / thanh lý vị thế futures."
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {list.map((p) => {
        const end = p.closedAt ?? p.liquidatedAt;
        const pnlUp = p.realizedPnlKc >= 0;
        const liquidated = p.status === "liquidated";
        return (
          <div
            key={p.id}
            className={clsx(
              "rounded-xl border px-4 py-3 transition hover:border-kc-border-strong",
              liquidated
                ? "border-red-500/40 bg-gradient-to-r from-red-500/12 via-pink-500/10 to-red-500/8 ring-1 ring-red-500/25"
                : "border-kc-border/70 bg-kc-bg/30"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <PairLink tokenId={p.tokenId} symbol={p.symbol} />
                  <SidePill side={p.side} />
                  <span className="num text-[10px] text-kc-muted">
                    {p.leverage}x
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-[11px] text-kc-muted">
                  {end ? moment(end).format("DD/MM/YYYY HH:mm:ss") : "—"}
                  {p.openedAt ? (
                    <span className="ml-2 opacity-70">
                      · mở {moment(p.openedAt).format("DD/MM")}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={clsx(
                    "num text-base font-bold",
                    pnlUp ? "text-kc-up" : "text-kc-down"
                  )}
                >
                  {formatSignedKcAmount(p.realizedPnlKc, 2)} {QUOTE_SYMBOL}
                </p>
                <p className="num mt-0.5 text-[11px] text-kc-muted">
                  {p.closedSize != null
                    ? `${formatTokenPrice(4, p.closedSize)} @ `
                    : ""}
                  {formatFixedPrice(PRICE_DECIMALS, p.entryPrice)}
                  {p.exitPrice != null
                    ? ` → ${formatFixedPrice(PRICE_DECIMALS, p.exitPrice)}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdersHistoryView({
  list,
  initialLoading,
  tokenId,
}: {
  list: FuturesOrderView[];
  initialLoading: boolean;
  tokenId?: string;
}) {
  if (initialLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }
  if (!list.length) {
    return (
      <EmptyState
        title="Chưa có lệnh"
        description={
          tokenId
            ? "Lịch sử mở/đóng market trên cặp này."
            : "Toàn bộ lệnh futures của bạn."
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-kc-border/80">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-kc-border bg-kc-bg/60 text-left text-kc-muted">
              <th className="px-3 py-2.5 font-medium">Thời gian</th>
              <th className="px-3 py-2.5 font-medium">Cặp</th>
              <th className="px-3 py-2.5 font-medium">Loại</th>
              <th className="px-3 py-2.5 font-medium">Hướng</th>
              <th className="px-3 py-2.5 text-right font-medium">Size</th>
              <th className="px-3 py-2.5 text-right font-medium">Giá khớp</th>
              <th className="px-3 py-2.5 text-right font-medium">Margin</th>
              <th className="px-3 py-2.5 font-medium">TT</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr
                key={o.id}
                className="border-b border-kc-border/50 transition hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2.5">
                  <div>{moment(o.filledAt ?? o.createdAt).format("DD/MM/YY")}</div>
                  <div className="text-kc-muted">
                    {moment(o.filledAt ?? o.createdAt).format("HH:mm:ss")}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <PairLink tokenId={o.tokenId} symbol={o.symbol} />
                </td>
                <td className="px-3 py-2.5 text-kc-muted">
                  {ORDER_TYPE_LABEL[o.type] ?? o.type}
                </td>
                <td className="px-3 py-2.5">
                  <SidePill side={o.side} compact />
                </td>
                <td className="num px-3 py-2.5 text-right">
                  {formatTokenPrice(4, o.size)}
                </td>
                <td className="num px-3 py-2.5 text-right">
                  {o.filledPrice != null
                    ? formatFixedPrice(PRICE_DECIMALS, o.filledPrice)
                    : "—"}
                </td>
                <td className="num px-3 py-2.5 text-right">
                  {o.marginKc != null
                    ? formatTokenPrice(2, o.marginKc)
                    : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarginDashboard({
  quoteAvailable,
  marginLocked,
  openCount,
  totalUpnl,
  totalNotional,
  openList,
}: {
  quoteAvailable: number;
  marginLocked: number;
  openCount: number;
  totalUpnl: number;
  totalNotional: number;
  openList: FuturesPositionView[];
}) {
  const equity = quoteAvailable + marginLocked + totalUpnl;
  const up = totalUpnl >= 0;
  const utilization =
    quoteAvailable + marginLocked > 0
      ? (marginLocked / (quoteAvailable + marginLocked)) * 100
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Equity ước tính"
          value={`${formatTokenPrice(2, equity)} ${QUOTE_SYMBOL}`}
          hint="Khả dụng + margin khóa + uPnL"
        />
        <StatCard
          label="Tỷ lệ dùng margin"
          value={`${utilization.toFixed(1)}%`}
          hint="Margin khóa / (khả dụng + khóa)"
        />
        <StatCard
          label="Notional mở"
          value={`${formatTokenPrice(2, totalNotional)} ${QUOTE_SYMBOL}`}
          hint={`${openCount} vị thế`}
        />
      </div>

      {openList.length > 0 ? (
        <div className="rounded-xl border border-kc-border/80 bg-kc-bg/30 p-4">
          <p className="mb-3 text-xs font-semibold text-kc-fg">
            Phân bổ margin theo vị thế
          </p>
          <div className="space-y-2">
            {openList.map((p) => {
              const share =
                marginLocked > 0 ? (p.marginKc / marginLocked) * 100 : 0;
              return (
                <div key={p.id}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-kc-muted">
                      {p.symbol}/{QUOTE_SYMBOL}{" "}
                      <SidePill side={p.side} compact />
                    </span>
                    <span className="num font-medium text-kc-fg">
                      {formatTokenPrice(2, p.marginKc)} KC ({share.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-kc-border/50">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        p.side === "long" ? "bg-kc-up/70" : "bg-kc-down/70"
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          "rounded-xl border px-4 py-3 text-sm",
          up
            ? "border-kc-up/20 bg-kc-up/[0.06] text-kc-up"
            : "border-kc-down/20 bg-kc-down/[0.06] text-kc-down"
        )}
      >
        <p className="font-semibold">Tổng uPnL chưa thực hiện</p>
        <p className="num mt-1 text-xl font-bold">
          {formatSignedKcAmount(totalUpnl, 2)} {QUOTE_SYMBOL}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-kc-border/80 bg-kc-bg/40 px-4 py-3">
      <p className="text-[11px] text-kc-muted">{label}</p>
      <p className="num mt-1 text-base font-bold text-kc-fg">{value}</p>
      {hint ? (
        <p className="mt-1 text-[10px] text-kc-muted/80">{hint}</p>
      ) : null}
    </div>
  );
}

function PairLink({
  tokenId,
  symbol,
}: {
  tokenId: string;
  symbol: string | null;
}) {
  const href = futuresHref({
    id: tokenId,
    symbol: symbol ?? undefined,
    name: undefined,
  });
  return (
    <Link
      href={href}
      className="text-sm font-bold text-kc-fg hover:text-kc-accent"
    >
      {symbol}/{QUOTE_SYMBOL}
    </Link>
  );
}

function SidePill({
  side,
  compact,
}: {
  side: "long" | "short";
  compact?: boolean;
}) {
  const isLong = side === "long";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded font-bold uppercase",
        compact ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[10px]",
        isLong ? "bg-kc-up/15 text-kc-up" : "bg-kc-down/15 text-kc-down"
      )}
    >
      {side}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const liquidated = status === "liquidated";
  const closed = status === "closed";
  return (
    <span
      className={clsx(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        liquidated &&
          "bg-gradient-to-r from-red-500/25 to-pink-500/20 text-red-300 ring-1 ring-red-500/30",
        closed && "bg-kc-muted/20 text-kc-muted",
        !liquidated && !closed && "bg-kc-accent/10 text-kc-accent"
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kc-border/80 bg-kc-bg/20 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-kc-fg">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-kc-muted">
        {description}
      </p>
    </div>
  );
}
