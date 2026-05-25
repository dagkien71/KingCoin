"use client";

import { API_URL, LIVE_FALLBACK_MS } from "@/constant/config";
import { PRICE_FLASH_MS } from "@/constants/live-display";
import { allSmoothTauMs } from "@/lib/live/smooth-profiles";
import { PriceSmootherEngine } from "@/lib/live/price-smoother";
import type { SmoothProfile } from "@/lib/live/smooth-profiles";
import {
  getMarketSocket,
  subscribeChannel,
  unsubscribeChannel,
} from "@/lib/market-realtime-socket";
import { mergeTickerPatch } from "@/lib/merge-ticker-patch";
import type { TokenVolumes } from "@/types/token.type";
import type { ITokenCrypto } from "@/types/token.type";
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
  flash?: TickerFlash;
};

type RevisionMap = Record<LiveStreamKey, number>;

type SmoothedMaps = Record<SmoothProfile, Record<string, TickerPatch>>;

const emptySmoothed = (): SmoothedMaps => ({
  ui: {},
  chart: {},
  nav: {},
});

const defaultRevisions = (): RevisionMap => ({
  ticker: 0,
  orderbook: 0,
  trades: 0,
  markets: 0,
  logs: 0,
});

type MarketLiveContextValue = {
  tokenId: string | null;
  connected: boolean;
  revisions: RevisionMap;
  /** Profile ui — backward compat với useLiveTicker */
  tickers: Record<string, TickerPatch>;
  smoothedByProfile: SmoothedMaps;
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
  const [smoothedByProfile, setSmoothedByProfile] =
    useState<SmoothedMaps>(emptySmoothed);
  const [connected, setConnected] = useState(false);

  const tokenIdRef = useRef(tokenId ?? null);
  tokenIdRef.current = tokenId ?? null;

  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const uiFlashRef = useRef<Record<string, TickerFlash | undefined>>({});
  const engineRef = useRef<PriceSmootherEngine | null>(null);
  const bumpRef = useRef<(key: LiveStreamKey) => void>(() => {});

  const bump = useCallback((key: LiveStreamKey) => {
    setRevisions((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);
  bumpRef.current = bump;

  const clearFlashLater = useCallback((tokenIds: string[]) => {
    for (const id of tokenIds) {
      const prev = flashTimersRef.current[id];
      if (prev) clearTimeout(prev);
      flashTimersRef.current[id] = setTimeout(() => {
        delete flashTimersRef.current[id];
        delete uiFlashRef.current[id];
        setSmoothedByProfile((cur) => {
          const row = cur.ui[id];
          if (!row?.flash) return cur;
          return {
            ...cur,
            ui: {
              ...cur.ui,
              [id]: { ...row, flash: undefined },
            },
          };
        });
      }, PRICE_FLASH_MS);
    }
  }, []);

  const uiPricesRef = useRef<Record<string, number | undefined>>({});
  const targetPricesRef = useRef<Record<string, number | undefined>>({});

  const ingestTargetStable = useCallback(
    (payload: TickerPatch) => {
      if (!payload?.tokenId) return;
      const engine = engineRef.current;
      if (!engine) return;

      const id = payload.tokenId;
      const prevTarget = targetPricesRef.current[id];
      const merged = mergeTickerPatch(
        { tokenId: id },
        { ...payload, at: payload.at ?? Date.now() }
      );

      const changedIds = engine.setTarget(id, merged);
      const newPrice = merged.price;

      if (
        newPrice != null &&
        changedIds.includes(id) &&
        prevTarget != null &&
        newPrice !== prevTarget
      ) {
        uiFlashRef.current[id] = newPrice > prevTarget ? "up" : "down";
        clearFlashLater([id]);
      }

      bumpRef.current("ticker");

      if (newPrice != null) {
        targetPricesRef.current[id] = newPrice;
      }
    },
    [clearFlashLater]
  );

  useEffect(() => {
    const engine = new PriceSmootherEngine({
      tauMs: allSmoothTauMs(),
      onFrame: ({ ui, chart, nav }) => {
        uiPricesRef.current = Object.fromEntries(
          Object.entries(ui).map(([k, v]) => [k, v.price])
        );
        setSmoothedByProfile({
          ui: Object.fromEntries(
            Object.entries(ui).map(([id, patch]) => [
              id,
              uiFlashRef.current[id]
                ? { ...patch, flash: uiFlashRef.current[id] }
                : { ...patch, flash: undefined },
            ])
          ),
          chart,
          nav,
        });
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const ingestFromTokenList = useCallback((tokens: ITokenCrypto[]) => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const t of tokens) {
      if (!t?.id) continue;
      engine.setTarget(t.id, {
        tokenId: t.id,
        price: t.price ?? undefined,
        marketCap: t.marketCap ?? undefined,
        volumes: t.volumes ?? undefined,
        priceChange1h: t.priceChange1h ?? undefined,
        priceChange24h: t.priceChange24h ?? undefined,
        priceChange7d: t.priceChange7d ?? undefined,
        at: Date.now(),
      });
    }
    bumpRef.current("ticker");
  }, []);

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
      ingestTargetStable(payload);
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
        ingestTargetStable(payload);
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

    const fallback = setInterval(async () => {
      if (s.connected) return;

      try {
        const res = await fetch(`${API_URL}/token-crypto/all`);
        if (res.ok) {
          const json = (await res.json()) as
            | ITokenCrypto[]
            | { data?: ITokenCrypto[] };
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : [];
          if (list.length > 0) {
            ingestFromTokenList(list);
          }
        }
      } catch {
        /* ignore */
      }

      if (tokenId) {
        bump("orderbook");
        bump("trades");
      }
    }, LIVE_FALLBACK_MS);

    return () => {
      clearInterval(fallback);
      for (const t of Object.values(flashTimersRef.current)) {
        clearTimeout(t);
      }
      flashTimersRef.current = {};
      uiFlashRef.current = {};
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
  }, [tokenId, bump, ingestTargetStable, ingestFromTokenList]);

  const tickers = smoothedByProfile.ui;

  const value = useMemo(
    () => ({
      tokenId: tokenId ?? null,
      connected,
      revisions,
      tickers,
      smoothedByProfile,
    }),
    [tokenId, connected, revisions, tickers, smoothedByProfile]
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
      smoothedByProfile: emptySmoothed(),
    };
  }
  return ctx;
}

export function useMarketLiveRevision(key: LiveStreamKey): number {
  return useMarketLive().revisions[key];
}

/** Patch giá profile ui — alias backward compat */
export function useLiveTicker(
  tokenId: string | undefined | null
): TickerPatch | undefined {
  return useSmoothedPrice(tokenId, "ui");
}

export function useSmoothedPrice(
  tokenId: string | undefined | null,
  profile: SmoothProfile = "ui"
): TickerPatch | undefined {
  const { smoothedByProfile } = useMarketLive();
  if (!tokenId) return undefined;
  return smoothedByProfile[profile][tokenId];
}
