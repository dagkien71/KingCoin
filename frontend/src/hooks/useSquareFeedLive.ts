import {
  onSquareFeedEvent,
  subscribeSquareFeed,
  unsubscribeSquareFeed,
} from "@/lib/square-realtime";
import { useEffect, useState } from "react";

/** Tăng revision khi WS Square feed có sự kiện → refetch feed. */
export function useSquareFeedLive(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    subscribeSquareFeed();
    const off = onSquareFeedEvent(() => {
      setRevision((r) => r + 1);
    });
    return () => {
      off();
      unsubscribeSquareFeed();
    };
  }, []);

  return revision;
}
