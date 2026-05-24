import type { TickerPatch } from "@/context/market-live-context";

/** Gộp patch WS mới vào bản đang chờ / đang hiển thị */
export function mergeTickerPatch(
  prev: TickerPatch | undefined,
  incoming: TickerPatch
): TickerPatch {
  return {
    ...prev,
    ...incoming,
    tokenId: incoming.tokenId,
    at: incoming.at ?? Date.now(),
  };
}
