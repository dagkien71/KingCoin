"use client";

import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import { cn } from "@/lib/cn";
import { unwrapPaginatedData } from "@/lib/unwrap-paginated";
import { roePercent } from "@/lib/futures-math";
import type { FuturesPositionView } from "@/types/futures.type";
import type { IOrder } from "@/types/order.type";
import { OrderStatus } from "@/types/order.type";
import { formatSignedKcAmount } from "@/utils/format-number";

type Props = {
  mode: "spot" | "futures";
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ShareOpenOrderPicker({ mode, selectedId, onSelect }: Props) {
  const { isLogin } = useAuth();
  const { data: ordersRaw, loading: ordersLoading } = useFetchApi<
    { data: IOrder[] } | IOrder[]
  >(isLogin && mode === "spot" ? "/orders" : "");
  const { data: positions, loading: posLoading } = useFetchApi<
    FuturesPositionView[]
  >(isLogin && mode === "futures" ? "/futures/positions" : "");

  const pendingOrders = unwrapPaginatedData(ordersRaw).filter(
    (o) => o.status === OrderStatus.pending
  );

  if (!isLogin) {
    return (
      <p className="text-sm text-kc-muted">Đăng nhập để chia sẻ lệnh đang mở.</p>
    );
  }

  const loading = mode === "spot" ? ordersLoading : posLoading;

  if (loading) {
    return (
      <div className="rounded-xl border border-kc-border/80 bg-kc-bg/30 p-4 text-center text-sm text-kc-muted">
        Đang tải…
      </div>
    );
  }

  if (mode === "spot") {
    if (pendingOrders.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-kc-border/80 bg-kc-bg/20 px-4 py-6 text-center text-sm text-kc-muted">
          Không có lệnh spot đang chờ khớp.
        </div>
      );
    }
    return (
      <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-kc-border bg-kc-bg/40 p-2">
        {pendingOrders.map((o) => {
          const openQty = o.quantity - (o.matchedQuantity ?? 0);
          const isBuy = o.type === "buy";
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left text-sm transition",
                  selectedId === o.id
                    ? "bg-kc-accent/15 ring-1 ring-kc-accent/50"
                    : "hover:bg-white/[0.04]"
                )}
              >
                <span
                  className={cn(
                    "font-semibold uppercase",
                    isBuy ? "text-kc-up" : "text-kc-down"
                  )}
                >
                  {o.type}
                </span>{" "}
                <span className="text-kc-fg">{o.pair}</span>
                <span className="num mt-0.5 block text-xs text-kc-muted">
                  {o.price} KC · còn {openQty}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const open = (positions ?? []).filter((p) => p.status === "open");
  if (open.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-kc-border/80 bg-kc-bg/20 px-4 py-6 text-center text-sm text-kc-muted">
        Không có vị thế futures đang mở.
      </div>
    );
  }
  return (
    <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-kc-border bg-kc-bg/40 p-2">
      {open.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "w-full rounded-lg px-3 py-2.5 text-left text-sm transition",
              selectedId === p.id
                ? "bg-violet-500/15 ring-1 ring-violet-400/40"
                : "hover:bg-white/[0.04]"
            )}
          >
            <span
              className={cn(
                "font-semibold uppercase",
                p.side === "long" ? "text-kc-up" : "text-kc-down"
              )}
            >
              {p.side}
            </span>{" "}
            <span className="text-kc-fg">{p.symbol ?? p.tokenId}</span>
            <span className="num mt-0.5 block text-[11px] text-kc-muted">
              ×{p.leverage} · size {p.size}
            </span>
            <span
              className={cn(
                "num mt-0.5 block text-[11px] font-semibold",
                p.unrealizedPnlKc >= 0 ? "text-kc-up" : "text-kc-down"
              )}
            >
              PnL {formatSignedKcAmount(p.unrealizedPnlKc, 2)} KC · ROI{" "}
              {roePercent(p.unrealizedPnlKc, p.marginKc).toFixed(2)}%
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
