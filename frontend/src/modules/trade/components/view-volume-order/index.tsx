import LiveMidPrice from "@/components/live/LiveMidPrice";
import {
  ORDER_BOOK_LEVELS_PER_SIDE,
  ORDER_BOOK_PRICE_DECIMALS,
  ORDER_BOOK_ROW_HEIGHT_PX,
} from "@/constants/order-book";
import useLiveFetch from "@/hooks/useLiveFetch";
import { QUOTE_SYMBOL, withQuoteUnit } from "@/constants/quote";
import type { OrderbookDepth, OrderbookDepthLevel } from "@/types/orderbook.type";
import { ITokenCrypto } from "@/types/token.type";
import { formatFixedPrice, formatTotalSupply } from "@/utils/format-number";
import { TokenLogo } from "@/components/token/TokenLogo";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";

function normalizeDepth(raw: unknown): OrderbookDepth | null {
  if (!raw || typeof raw !== "object") return null;
  if ("bids" in raw && Array.isArray((raw as OrderbookDepth).bids)) {
    return raw as OrderbookDepth;
  }
  const wrapped = raw as { data?: OrderbookDepth };
  if (wrapped.data && Array.isArray(wrapped.data.bids)) return wrapped.data;
  return null;
}

const rowStyle = { height: ORDER_BOOK_ROW_HEIGHT_PX, minHeight: ORDER_BOOK_ROW_HEIGHT_PX };

const ViewVolumeOrder = ({ token }: { token: ITokenCrypto }) => {
  const max = ORDER_BOOK_LEVELS_PER_SIDE;
  const bookPath = token?.id
    ? `/orders/orderbook?tokenId=${token.id}&levels=${max}`
    : "";

  const { data: bookRaw, refetch } = useLiveFetch<OrderbookDepth>(bookPath, {
    stream: "orderbook",
  });

  const [bookRefreshSpin, setBookRefreshSpin] = useState(false);

  const refreshBook = async () => {
    setBookRefreshSpin(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setBookRefreshSpin(false), 400);
    }
  };

  const book = useMemo(() => normalizeDepth(bookRaw ?? undefined), [bookRaw]);

  const buyRows = book?.bids ?? [];
  /** Bán: giá thấp nhất (gần giữa) sát đường giữa — đảo thứ tự hiển thị. */
  const sellDisplayRows = useMemo(
    () => [...(book?.asks ?? [])].reverse(),
    [book?.asks]
  );

  const totalOrders = buyRows.length + sellDisplayRows.length;
  const buyPercentage = Math.round(
    totalOrders > 0 ? (buyRows.length / totalOrders) * 100 : 50
  );
  const sellPercentage = Math.round(
    totalOrders > 0 ? (sellDisplayRows.length / totalOrders) * 100 : 50
  );

  const tick =
    token?.price != null && token.price > 0
      ? Math.max(0.0001, token.price / 2000)
      : 0.0001;

  const renderRows = (
    rows: OrderbookDepthLevel[],
    side: "buy" | "sell",
    keyPrefix: string
  ) => {
    if (rows.length === 0) {
      return (
        <p className="py-4 text-center text-[11px] text-kc-muted">
          Chưa có lệnh {side === "buy" ? "mua" : "bán"}
        </p>
      );
    }
    return (
      <table className="relative w-full table-fixed text-xs">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${keyPrefix}-${row.price}-${i}`}
              className="relative"
              style={rowStyle}
            >
              <td
                className={clsx(
                  "num w-1/3 py-0 text-left align-middle",
                  side === "buy" ? "text-kc-up" : "text-kc-down"
                )}
              >
                {withQuoteUnit(
                  formatFixedPrice(ORDER_BOOK_PRICE_DECIMALS, row.price)
                )}
              </td>
              <td className="num relative z-[1] w-1/3 py-0 text-right align-middle">
                {formatTotalSupply(row.quantity)}
              </td>
              <td className="num relative z-[1] w-1/3 py-0 text-right align-middle">
                {withQuoteUnit(
                  formatFixedPrice(
                    ORDER_BOOK_PRICE_DECIMALS,
                    row.price * row.quantity
                  )
                )}
              </td>
              <td
                className={clsx(
                  "pointer-events-none absolute inset-y-0 right-0 transition-[width] duration-300",
                  side === "buy" ? "bg-kc-up/25" : "bg-kc-down/25"
                )}
                style={{
                  width: `${Math.max(
                    8,
                    side === "buy" ? (i + 1) * 8 : 100 - i * 8
                  )}%`,
                }}
              />
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-kc-elevated p-3 font-sans text-kc-fg">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-kc-fg">
          {token ? (
            <TokenLogo
              logo={token.logo}
              symbol={token.symbol}
              name={token.name}
              id={token.id}
              size="xs"
            />
          ) : null}
          Sổ lệnh · <span className="num text-kc-muted">{token?.symbol}</span>
          <span className="text-[10px] text-kc-accent/90">· live</span>
        </span>
        <button
          type="button"
          onClick={() => refreshBook()}
          className="inline-flex items-center gap-1.5 rounded-md border border-kc-border bg-kc-surface px-2 py-1 text-[11px] font-medium text-kc-fg transition-colors hover:border-kc-border-strong"
          title="Làm mới sổ lệnh"
        >
          <FaSyncAlt
            className={clsx(
              "h-3 w-3 text-kc-muted",
              bookRefreshSpin && "animate-spin"
            )}
          />
          Làm mới
        </button>
      </div>
      <p className="mb-2 shrink-0 num text-[10px] text-kc-muted">
        Bước giá ~ {formatFixedPrice(ORDER_BOOK_PRICE_DECIMALS, tick)} · tối
        đa {max} mức/bên
      </p>

      <div className="mb-1 shrink-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-kc-muted">
              <th className="pb-1 text-left font-medium">Giá ({QUOTE_SYMBOL})</th>
              <th className="pb-1 text-right font-medium">Số ({token?.symbol})</th>
              <th className="pb-1 text-right font-medium">
                Tổng ({QUOTE_SYMBOL})
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden border-b border-kc-border/50">
          <div className="shrink-0 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kc-down">
            Bán
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
            {renderRows(sellDisplayRows, "sell", "s")}
          </div>
        </div>

        {token?.id ? <LiveMidPrice token={token} /> : null}

        <div className="flex min-h-0 flex-col overflow-hidden border-t border-kc-border/50">
          <div className="shrink-0 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kc-up">
            Mua
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderRows(buyRows, "buy", "b")}
          </div>
        </div>
      </div>

      <div className="mt-2 flex shrink-0 gap-2">
        <div className="relative flex h-8 flex-1 items-center overflow-hidden rounded-md bg-kc-surface">
          <div
            className="absolute inset-y-0 left-0 bg-kc-up/35 transition-all duration-300"
            style={{ width: `${buyPercentage}%` }}
          />
          <span className="relative z-[1] pl-2 text-[10px] font-semibold text-kc-fg">
            Mua {buyPercentage}%
          </span>
        </div>
        <div className="relative flex h-8 flex-1 items-center justify-end overflow-hidden rounded-md bg-kc-surface">
          <div
            className="absolute inset-y-0 right-0 bg-kc-down/35 transition-all duration-300"
            style={{ width: `${sellPercentage}%` }}
          />
          <span className="relative z-[1] pr-2 text-[10px] font-semibold text-kc-fg">
            Bán {sellPercentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewVolumeOrder;
