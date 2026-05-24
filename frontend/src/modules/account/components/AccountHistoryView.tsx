"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useLiveFetch from "@/hooks/useLiveFetch";
import { ledgerEntryLabel } from "@/lib/ledger-labels";
import { unwrapPaginatedData } from "@/lib/unwrap-paginated";
import { cn } from "@/lib/cn";
import type { ILedgerEntry, ITradeFill } from "@/types/trade.type";
import { ETypeOrder, IOrder } from "@/types/order.type";
import { formatSignedKcAmount, formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import { useMemo, useState } from "react";

type HistoryTab = "ledger" | "spot";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ khớp",
  completed: "Đã khớp",
  canceled: "Đã hủy",
};

function formatDt(iso: string | Date) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountHistoryView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<HistoryTab>("ledger");

  const { data: ledgerRaw, loading: ledgerLoading } = useLiveFetch<
    { data: ILedgerEntry[] } | ILedgerEntry[]
  >("/users/me/ledger", { stream: "trades" });

  const { data: ordersRaw, loading: ordersLoading } =
    useFetchApi<{ data: IOrder[] } | IOrder[]>("/orders");

  const { data: fillsRaw, loading: fillsLoading } = useFetchApi<
    { data: ITradeFill[] } | ITradeFill[]
  >(user?.id ? `/orders/trades?userId=${user.id}` : "");

  const ledgerEntries = unwrapPaginatedData(ledgerRaw);
  const orders = unwrapPaginatedData(ordersRaw);
  const fills = unwrapPaginatedData(fillsRaw);

  const spotOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const spotFills = useMemo(
    () =>
      [...fills].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [fills]
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lịch sử</h1>
        <p className="mt-1 text-sm text-kc-muted">
          Biến động ví (nhiệm vụ, chuyển đổi, phí…) và lệnh spot của bạn.
        </p>
      </header>

      <div className="mb-4 flex gap-1 rounded-lg border border-kc-border bg-kc-surface p-1">
        {(
          [
            { id: "ledger" as const, label: "Biến động ví" },
            { id: "spot" as const, label: "Spot" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-kc-accent/15 text-kc-accent"
                : "text-kc-muted hover:text-kc-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ledger" ? (
        <Card>
          <CardHeader>
            <CardTitle>Biến động số dư</CardTitle>
            <p className="text-xs text-kc-muted">
              Mọi cộng/trừ KC và token trên sổ cái nội bộ.
            </p>
          </CardHeader>
          <CardContent className="max-h-[min(640px,70vh)] overflow-y-auto p-0">
            {ledgerLoading ? (
              <p className="px-5 py-10 text-center text-sm text-kc-muted">
                Đang tải…
              </p>
            ) : !ledgerEntries.length ? (
              <p className="px-5 py-10 text-center text-sm text-kc-muted">
                Chưa có biến động.
              </p>
            ) : (
              <ul className="divide-y divide-kc-border/70">
                {ledgerEntries.map((e) => {
                  const up = e.amount >= 0;
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02]"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          up ? "bg-kc-up" : "bg-kc-down"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-kc-fg">
                          {ledgerEntryLabel(e.refType, e.note)}
                        </p>
                        <p className="text-xs text-kc-muted">
                          {formatDt(e.createdAt)}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "num shrink-0 text-sm font-semibold",
                          up ? "text-kc-up" : "text-kc-down"
                        )}
                      >
                        {up ? "+" : ""}
                        {formatSignedKcAmount(e.amount, 2)} {e.currency}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lệnh spot</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 pt-0">
              {ordersLoading ? (
                <p className="px-5 py-8 text-center text-sm text-kc-muted">
                  Đang tải…
                </p>
              ) : !spotOrders.length ? (
                <p className="px-5 py-8 text-center text-sm text-kc-muted">
                  Chưa có lệnh spot.
                </p>
              ) : (
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-kc-border text-left text-xs text-kc-muted">
                      <th className="px-5 py-2.5 font-medium">Thời gian</th>
                      <th className="px-3 py-2.5 font-medium">Cặp</th>
                      <th className="px-3 py-2.5 font-medium">Lệnh</th>
                      <th className="num px-3 py-2.5 text-right font-medium">
                        Giá
                      </th>
                      <th className="num px-3 py-2.5 text-right font-medium">
                        KL
                      </th>
                      <th className="px-5 py-2.5 font-medium">TT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spotOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-kc-border/60 last:border-0"
                      >
                        <td className="px-5 py-3 text-xs text-kc-muted">
                          {formatDt(o.createdAt)}
                        </td>
                        <td className="px-3 py-3 font-medium">{o.pair}</td>
                        <td
                          className={cn(
                            "px-3 py-3 font-medium capitalize",
                            o.type === ETypeOrder.buy
                              ? "text-kc-up"
                              : "text-kc-down"
                          )}
                        >
                          {o.type === ETypeOrder.buy ? "Mua" : "Bán"}
                        </td>
                        <td className="num px-3 py-3 text-right">
                          {withQuoteUnit(formatTokenPrice(4, o.price))}
                        </td>
                        <td className="num px-3 py-3 text-right">
                          {formatTokenPrice(4, o.quantity)}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Khớp lệnh</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[360px] overflow-y-auto p-0 pt-0">
              {fillsLoading ? (
                <p className="px-5 py-8 text-center text-sm text-kc-muted">
                  Đang tải…
                </p>
              ) : !spotFills.length ? (
                <p className="px-5 py-8 text-center text-sm text-kc-muted">
                  Chưa có lệnh khớp.
                </p>
              ) : (
                <ul className="divide-y divide-kc-border/70">
                  {spotFills.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                    >
                      <span className="text-xs text-kc-muted">
                        {formatDt(f.createdAt)}
                      </span>
                      <span className="num text-kc-fg">
                        {formatTokenPrice(4, f.quantity)} @{" "}
                        {withQuoteUnit(formatTokenPrice(4, f.price))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
