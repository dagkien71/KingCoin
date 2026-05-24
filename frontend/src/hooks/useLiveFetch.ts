import type { LiveStreamKey } from "@/context/market-live-context";
import { useMarketLiveRevision } from "@/context/market-live-context";
import useFetchApi from "@/hooks/useFetchApi";

type UseLiveFetchOptions = {
  /** Chỉ dùng cho dữ liệu cần REST: orderbook, trades, logs — không dùng ticker/markets */
  stream: LiveStreamKey | LiveStreamKey[];
  defaultParams?: Record<string, string | number>;
};

/**
 * Refetch im lặng (không loading) khi WS báo orderbook/trades/logs đổi.
 * Giá/volume: dùng useLiveTicker + applyTickerPatch thay vì hook này.
 */
export default function useLiveFetch<T>(
  url: string,
  options: UseLiveFetchOptions
) {
  const streams = Array.isArray(options.stream)
    ? options.stream
    : [options.stream];

  const r0 = useMarketLiveRevision(streams[0]);
  const r1 = useMarketLiveRevision(streams[1] ?? streams[0]);
  const r2 = useMarketLiveRevision(streams[2] ?? streams[0]);
  const liveRevision = r0 + r1 * 1_000 + r2 * 1_000_000;

  return useFetchApi<T>(url, {
    liveRevision,
    silentOnLive: true,
    defaultParams: options.defaultParams,
  });
}
