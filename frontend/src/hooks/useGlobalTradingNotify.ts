import { useEffect, useRef } from "react";
import { getUserSocket } from "@/lib/user-realtime-socket";
import type { NotificationItem } from "@/lib/notification-api";

const BALANCE_TYPES = new Set([
  "ORDER_FILLED",
  "ORDER_PARTIAL_FILL",
  "FUTURES_OPENED",
  "FUTURES_CLOSED",
  "FUTURES_LIQUIDATED",
  "CONVERT_SUCCESS",
  "QUEST_CLAIMED",
]);

/**
 * Lắng nghe thông báo user-scoped — refetch balances/positions khi có sự kiện giao dịch.
 */
export default function useGlobalTradingNotify(options: {
  enabled?: boolean;
  onTradingEvent?: () => void;
}) {
  const { enabled = true, onTradingEvent } = options;
  const cbRef = useRef(onTradingEvent);
  cbRef.current = onTradingEvent;

  useEffect(() => {
    if (!enabled) return;
    const socket = getUserSocket();
    if (!socket) return;

    const handler = (payload: NotificationItem) => {
      if (!payload?.type || !BALANCE_TYPES.has(payload.type)) return;
      cbRef.current?.();
    };

    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [enabled]);
}
