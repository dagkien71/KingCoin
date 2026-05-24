import { useMarketLive } from "@/context/market-live-context";
import {
  marginRatio,
  unrealizedPnlKc,
} from "@/lib/futures-math";
import type { FuturesPositionView } from "@/types/futures.type";
import { useMemo } from "react";

/** Vị thế với mark / uPnL / margin ratio theo giá WS (profile ui, snap). */
export function applyLiveMarkToPosition(
  position: FuturesPositionView,
  livePrice: number | undefined
): FuturesPositionView {
  const mark =
    livePrice != null && livePrice > 0 ? livePrice : position.markPrice;
  const uPnl = unrealizedPnlKc(
    position.side,
    position.size,
    position.entryPrice,
    mark
  );
  const ratio = marginRatio(
    position.marginKc,
    uPnl,
    position.size,
    mark
  );
  return {
    ...position,
    markPrice: mark,
    unrealizedPnlKc: uPnl,
    marginRatio: ratio,
  };
}

/**
 * Overlay mark & PnL từ MarketLiveProvider — cập nhật gần như ngay khi ticker/markets WS đổi.
 * Metadata vị thế (size, margin) vẫn từ REST; refetch qua useLiveFetch stream trades.
 */
export function useLiveFuturesPositions(
  positions: FuturesPositionView[] | null | undefined
): FuturesPositionView[] {
  const { tickers, revisions } = useMarketLive();
  const tickerRev = revisions.ticker;

  return useMemo(() => {
    const list = positions ?? [];
    return list.map((p) =>
      applyLiveMarkToPosition(p, tickers[p.tokenId]?.price)
    );
    // tickerRev: recompute mỗi frame WS / markets
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tickers content tied to tickerRev
  }, [positions, tickers, tickerRev]);
}
