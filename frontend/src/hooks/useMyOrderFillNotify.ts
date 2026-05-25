import { getMarketSocket } from "@/lib/market-realtime-socket";
import { useEffect, useRef } from "react";

export type LiveTradePayload = {
  id?: string;
  tokenId?: string;
  buyerId?: string;
  sellerId?: string;
};

/**
 * Khi có giao dịch khớp liên quan user trên cặp đang xem → refetch balances/orders (không toast).
 */
export default function useMyOrderFillNotify(options: {
  tokenId: string | null | undefined;
  userId: string | undefined;
  onFilled: (opts?: { silent?: boolean }) => void;
}) {
  const { tokenId, userId, onFilled } = options;
  const onFilledRef = useRef(onFilled);
  onFilledRef.current = onFilled;
  const seenFillIds = useRef(new Set<string>());

  useEffect(() => {
    if (!tokenId || !userId) return;

    const s = getMarketSocket();
    const handler = (payload: LiveTradePayload) => {
      if (!payload?.tokenId || payload.tokenId !== tokenId) return;
      if (payload.buyerId !== userId && payload.sellerId !== userId) return;

      const fillId = payload.id;
      if (fillId) {
        if (seenFillIds.current.has(fillId)) return;
        seenFillIds.current.add(fillId);
        if (seenFillIds.current.size > 200) {
          const arr = [...seenFillIds.current];
          seenFillIds.current = new Set(arr.slice(-100));
        }
      }

      onFilledRef.current();
    };

    s.on("trade", handler);
    return () => {
      s.off("trade", handler);
    };
  }, [tokenId, userId]);
}
