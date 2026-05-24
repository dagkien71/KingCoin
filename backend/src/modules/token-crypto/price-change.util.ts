/**
 * % thay đổi giá — @see docs/PRICE_CHANGE_PCT_SPEC.md
 */

export const PRICE_CHANGE_WINDOWS_MS = {
  h1: 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * ((current − past) / past) × 100 — mẫu số là giá quá khứ (chuẩn Investopedia / CoinGecko).
 */
export function percentChange(
  current: number,
  past: number,
): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(past)) return null;
  if (past <= 0) return null;
  return Number((((current - past) / past) * 100).toFixed(4));
}

export type PriceChangePercents = {
  priceChange1h: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
};

export function buildPriceChangePercents(
  current: number,
  past1h: number | null,
  past24h: number | null,
  past7d: number | null,
): PriceChangePercents {
  return {
    priceChange1h:
      past1h != null ? percentChange(current, past1h) : null,
    priceChange24h:
      past24h != null ? percentChange(current, past24h) : null,
    priceChange7d:
      past7d != null ? percentChange(current, past7d) : null,
  };
}
