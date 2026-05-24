"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import type { ITradeFill } from "@/types/trade.type";
import { formatTokenPrice } from "@/utils/format-number";
import { withQuoteUnit } from "@/constants/quote";
import Link from "next/link";

type OrdersPage = { data: { id: string; type: string; price: number; quantity: number; status: string; pair: string; createdAt: string }[] };

export default function TradeHistoryPage() {
  const { user } = useAuth();
  const { data: fills } = useFetchApi<{ data: ITradeFill[] }>(
    user?.id ? `/orders/trades?userId=${user.id}` : ""
  );
  const { data: orders } = useFetchApi<OrdersPage>("/orders");

  const fillList = fills?.data ?? [];
  const orderList = orders?.data ?? [];

  return (
    <main className="min-h-screen bg-kc-bg px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/trade" className="text-sm text-kc-accent hover:underline">
            ← Giao dịch
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Lịch sử giao dịch</h1>
        </div>

        <Card className="border-kc-border bg-kc-elevated">
          <CardHeader>
            <CardTitle className="text-base">Lệnh của tôi</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-kc-muted">
                <tr>
                  <th className="pb-2">Cặp</th>
                  <th>Loại</th>
                  <th>Giá</th>
                  <th>SL</th>
                  <th>TT</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((o) => (
                  <tr key={o.id} className="border-t border-kc-border/80">
                    <td className="py-2">{o.pair}</td>
                    <td className={o.type === "buy" ? "text-kc-up" : "text-kc-down"}>
                      {o.type}
                    </td>
                    <td className="num">{withQuoteUnit(formatTokenPrice(4, o.price))}</td>
                    <td className="num">{o.quantity}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orderList.length ? (
              <p className="py-4 text-center text-kc-muted">Chưa có lệnh.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-kc-border bg-kc-elevated">
          <CardHeader>
            <CardTitle className="text-base">Khớp lệnh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {fillList.map((f) => (
              <div
                key={f.id}
                className="flex justify-between border-b border-kc-border/60 py-2"
              >
                <span className="text-kc-muted">
                  {new Date(f.createdAt).toLocaleString("vi-VN")}
                </span>
                <span className="num">
                  {formatTokenPrice(4, f.quantity)} @{" "}
                  {withQuoteUnit(formatTokenPrice(4, f.price))}
                </span>
              </div>
            ))}
            {!fillList.length ? (
              <p className="text-kc-muted">Chưa có khớp lệnh.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
