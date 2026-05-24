import useLiveFetch from "@/hooks/useLiveFetch";
import type { ITradeFill } from "@/types/trade.type";
import { formatTokenPrice } from "@/utils/format-number";
import { useMemo } from "react";
import { QUOTE_SYMBOL } from "@/constants/quote";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function HistoryOrder({
  tokenId,
  symbol,
}: {
  tokenId?: string;
  symbol?: string;
}) {
  const path = tokenId ? `/orders/trades/recent?tokenId=${tokenId}&limit=80` : "";
  const { data: fills, loading } = useLiveFetch<ITradeFill[]>(path, {
    stream: "trades",
  });

  const rows = useMemo(() => {
    if (!fills?.length) return [];
    return fills.map((f) => {
      const side: "buy" | "sell" = "buy";
      return {
        id: f.id,
        price: formatTokenPrice(4, f.price),
        amount: formatTokenPrice(4, f.quantity),
        time: formatTime(f.createdAt),
        type: side,
      };
    });
  }, [fills]);

  return (
    <div className="h-full min-h-0 bg-kc-elevated p-3 text-kc-fg">
      <div className="border-b border-kc-border pb-2">
        <span className="text-xs font-medium text-kc-accent">
          Giao dịch gần đây
        </span>
      </div>
      <div className="pt-3">
        <div className="mb-2 flex justify-between text-[11px] text-kc-muted">
          <span>Giá ({QUOTE_SYMBOL})</span>
          <span>Số ({symbol ?? "token"})</span>
          <span>Thời gian</span>
        </div>
        <div className="max-h-[360px] space-y-1 overflow-y-auto text-xs">
          {loading && !rows.length ? (
            <p className="py-4 text-center text-kc-muted">Đang tải…</p>
          ) : null}
          {!loading && !rows.length ? (
            <p className="py-4 text-center text-kc-muted">
              Chưa có giao dịch khớp.
            </p>
          ) : null}
          {rows.map((entry) => (
            <div
              key={entry.id}
              className="flex justify-between gap-2 border-b border-kc-border/80 py-1 last:border-0"
            >
              <span className="num text-kc-fg">{entry.price}</span>
              <span className="num text-kc-muted">{entry.amount}</span>
              <span className="num text-kc-muted">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
