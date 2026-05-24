"use client";

import { PriceFlash } from "@/components/live/PriceFlash";
import { useLiveTokenDisplay } from "@/hooks/useLiveTokenDisplay";
import { withQuoteUnit } from "@/constants/quote";
import type { ITokenCrypto } from "@/types/token.type";
import { ORDER_BOOK_PRICE_DECIMALS } from "@/constants/order-book";
import { formatFixedPrice } from "@/utils/format-number";
import { FaArrowDown } from "react-icons/fa";

/** Giá giữa sổ lệnh — chỉ block này re-render khi ticker display đổi */
export default function LiveMidPrice({
  token,
}: {
  token: Pick<ITokenCrypto, "id" | "price">;
}) {
  const { live, flash } = useLiveTokenDisplay(token);
  const price = live.price ?? token.price ?? 0;
  const formatted = withQuoteUnit(
    formatFixedPrice(ORDER_BOOK_PRICE_DECIMALS, price)
  );

  return (
    <div className="shrink-0 border-y border-kc-border bg-kc-surface/30 py-1.5">
      <div className="num flex items-center justify-center gap-2 text-base font-semibold text-kc-down">
        <PriceFlash flash={flash}>{formatted}</PriceFlash>
        <FaArrowDown className="h-3.5 w-3.5 opacity-80" />
      </div>
      <div className="num text-center text-[11px] text-kc-muted">
        Giá tham chiếu · {formatted}
      </div>
    </div>
  );
}
