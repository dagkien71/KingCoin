"use client";

import { LIVE_FALLBACK_MS } from "@/constant/config";
import {
  DISPLAY_TICKER_MS,
  PRICE_FLASH_MS,
} from "@/constants/live-display";
import {
  getMarketSocket,
  subscribeChannel,
  unsubscribeChannel,
} from "@/lib/market-realtime-socket";
import { mergeTickerPatch } from "@/lib/merge-ticker-patch";
import type { TokenVolumes } from "@/types/token.type";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type LiveStreamKey =
  | "ticker"
  | "orderbook"
  | "trades"
  | "markets"
  | "logs";

export type TickerFlash = "up" | "down";

export type TickerPatch = {
  tokenId: string;
  price?: number;
  marketCap?: number;
  volumes?: TokenVolumes;
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  at?: number;
  /** Hướng thay đổi giá lần flush gần nhất — cho UI flash */
  flash?: TickerFlash;
};

type RevisionMap = Record<LiveStreamKey, number>;

const defaultRevisions = (): RevisionMap => ({
  ticker: 0,
  orderbook: 0,
  trades: 0,
  markets: 0,
  logs: 0,
});

function displayTickerIntervalMs(): number {
  if (typeof window === "undefined") return DISPLAY_TICKER_MS;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Math.max(DISPLAY_TICKER_MS, 800);
  }
  return DISPLAY_TICKER_MS;
}

type MarketLiveContextValue = {
  tokenId: string | null;
  connected: boolean;
  revisions: RevisionMap;
  /** Patch đã throttle — dùng cho mọi UI giá/volume */
  tickers: Record<string, TickerPatch>;
};

const MarketLiveContext = createContext<MarketLiveContextValue | null>(null);

export function MarketLiveProvider({
  tokenId,
  children,
}: {
  tokenId?: string | null;
  children: React.ReactNode;
}) {
  const [revisions, setRevisions] = useState<RevisionMap>(defaultRevisions);
  const [tickers, setTickers] = useState<Record<string, TickerPatch>>({});
  const [connected, setConnected] = useState(false);

  const tokenIdRef = useRef(tokenId ?? null);
  tokenIdRef.current = tokenId ?? null;

  const pendingRef = useRef<Record<string, TickerPatch>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  const bump = useCallback((key: LiveStreamKey) => {
    setRevisions((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const clearFlashLater = useCallback((tokenIds: string[]) => {
    for (const id of tokenIds) {
      const prev = flashTimersRef.current[id];
      if (prev) clearTimeout(prev);
      flashTimersRef.current[id] = setTimeout(() => {
        delete flashTimersRef.current[id];
        setTickers((cur) => {
          const row = cur[id];
          if (!row?.flash) return cur;
          return {
            ...cur,
            [id]: { ...row, flash: undefined },
          };
        });
      }, PRICE_FLASH_MS);
    }
  }, []);

  const flushDisplayTickers = useCallback(() => {
    flushTimerRef.current = null;
    const pending = pendingRef.current;
    const ids = Object.keys(pending);
    if (ids.length === 0) return;

    pendingRef.current = {};

    const flushedIds: string[] = [];

    setTickers((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const patch = pending[id];
        const before = prev[id];
        const merged = mergeTickerPatch(before, patch);

        let flash: TickerFlash | undefined;
        if (
          merged.price != null &&
          before?.price != null &&
          merged.price !== before.price
        ) {
          flash = merged.price > before.price ? "up" : "down";
        }

        next[id] = flash ? { ...merged, flash } : { ...merged, flash: undefined };
        flushedIds.push(id);
      }
      return next;
    });

    if (flushedIds.length > 0) {
      bump("ticker");
      clearFlashLater(flushedIds);
    }
  }, [bump, clearFlashLater]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = setTimeout(
      flushDisplayTickers,
      displayTickerIntervalMs()
    );
  }, [flushDisplayTickers]);

  const queueTicker = useCallback(
    (payload: TickerPatch) => {
      if (!payload?.tokenId) return;
      const prev = pendingRef.current[payload.tokenId];
      pendingRef.current[payload.tokenId] = mergeTickerPatch(prev, {
        ...payload,
        at: payload.at ?? Date.now(),
      });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  useEffect(() => {
    const s = getMarketSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const matchesToken = (payload: { tokenId?: string }) => {
      const id = tokenIdRef.current;
      return !id || !payload?.tokenId || payload.tokenId === id;
    };

    const onTicker = (payload: TickerPatch) => {
      if (!matchesToken(payload)) return;
      queueTicker(payload);
    };

    const onOrderbook = (payload: { tokenId?: string }) => {
      if (!matchesToken(payload)) return;
      bump("orderbook");
    };

    const onTrade = (payload: { tokenId?: string }) => {
      if (!matchesToken(payload)) return;
      bump("trades");
      bump("logs");
    };

    const onMarkets = (payload: TickerPatch) => {
      if (payload?.tokenId && (payload.price != null || payload.volumes)) {
        queueTicker(payload);
      }
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("ticker", onTicker);
    s.on("orderbook", onOrderbook);
    s.on("trade", onTrade);
    s.on("markets", onMarkets);

    if (!s.connected) {
      s.connect();
    } else {
      setConnected(true);
    }

    subscribeChannel("markets");
    if (tokenId) {
      subscribeChannel(`ticker:${tokenId}`);
      subscribeChannel(`orderbook:${tokenId}`);
      subscribeChannel(`trades:${tokenId}`);
    }

    const fallback = setInterval(() => {
      if (s.connected) return;
      if (tokenId) {
        bump("orderbook");
        bump("trades");
      }
    }, LIVE_FALLBACK_MS);

    return () => {
      clearInterval(fallback);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      for (const t of Object.values(flashTimersRef.current)) {
        clearTimeout(t);
      }
      flashTimersRef.current = {};
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("ticker", onTicker);
      s.off("orderbook", onOrderbook);
      s.off("trade", onTrade);
      s.off("markets", onMarkets);
      unsubscribeChannel("markets");
      if (tokenId) {
        unsubscribeChannel(`ticker:${tokenId}`);
        unsubscribeChannel(`orderbook:${tokenId}`);
        unsubscribeChannel(`trades:${tokenId}`);
      }
    };
  }, [tokenId, bump, queueTicker]);

  const value = useMemo(
    () => ({
      tokenId: tokenId ?? null,
      connected,
      revisions,
      tickers,
    }),
    [tokenId, connected, revisions, tickers]
  );

  return (
    <MarketLiveContext.Provider value={value}>
      {children}
    </MarketLiveContext.Provider>
  );
}

export function useMarketLive(): MarketLiveContextValue {
  const ctx = useContext(MarketLiveContext);
  if (!ctx) {
    return {
      tokenId: null,
      connected: false,
      revisions: defaultRevisions(),
      tickers: {},
    };
  }
  return ctx;
}

export function useMarketLiveRevision(key: LiveStreamKey): number {
  return useMarketLive().revisions[key];
}

/** Patch giá/volume đã throttle — dùng cho UI */
export function useLiveTicker(
  tokenId: string | undefined | null
): TickerPatch | undefined {
  const { tickers } = useMarketLive();
  return tokenId ? tickers[tokenId] : undefined;
}
