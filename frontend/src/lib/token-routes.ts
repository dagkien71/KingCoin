/**
 * Cấu trúc URL token duy nhất — mọi redirect/link trade/futures/API lookup phải dùng file này.
 *
 * Slug cặp (path segment): name → symbol → id (khớp backend findOne).
 * Trang /token/:id luôn dùng UUID (tokenDetailPath).
 */
import { DEFAULT_FUTURES_TOKEN_SLUG } from "@/constants/futures";
import { DEFAULT_TRADE_TOKEN_SLUG } from "@/constants/trade";
import type { ITokenCrypto } from "@/types/token.type";

export type TokenRouteParts = Pick<ITokenCrypto, "id" | "name" | "symbol">;

/** Slug thô (chưa encode) cho /trade/:slug và /futures/:slug */
export function tokenPairSlug(token: TokenRouteParts): string {
  return tokenPairSlugFromParts({
    id: token.id,
    name: token.name,
    symbol: token.symbol,
  });
}

export function tokenPairSlugFromParts(parts: {
  id: string;
  name?: string | null;
  symbol?: string | null;
}): string {
  const name = parts.name?.trim();
  if (name) return name;
  const symbol = parts.symbol?.trim();
  if (symbol) return symbol;
  return parts.id;
}

export function encodePairSlug(slug: string): string {
  return encodeURIComponent(slug.trim());
}

/** `/trade/:slug` */
export function tradeHref(token: TokenRouteParts): string {
  return `/trade/${encodePairSlug(tokenPairSlug(token))}`;
}

export function tradeHrefFromSlug(slug: string): string {
  return `/trade/${encodePairSlug(slug)}`;
}

export function defaultTradeHref(): string {
  return tradeHrefFromSlug(DEFAULT_TRADE_TOKEN_SLUG);
}

/** `/futures/:slug` */
export function futuresHref(token: TokenRouteParts): string {
  return `/futures/${encodePairSlug(tokenPairSlug(token))}`;
}

export function futuresHrefFromSlug(slug: string): string {
  return `/futures/${encodePairSlug(slug)}`;
}

export function defaultFuturesHref(): string {
  return futuresHrefFromSlug(DEFAULT_FUTURES_TOKEN_SLUG);
}

/** `GET /token-crypto/:key` — cùng quy tắc slug với trade/futures */
export function tokenCryptoApiPath(slugOrKey: string): string {
  return `/token-crypto/${encodePairSlug(slugOrKey)}`;
}

/** Trang chi tiết token sắp niêm yết */
export function upcomingDetailPath(item: {
  id: string;
  symbol: string;
}): string {
  const slug = item.symbol?.trim() || item.id;
  return `/token/upcoming/${encodeURIComponent(slug)}`;
}

/** Trang chi tiết — chỉ id (UUID) */
export function tokenDetailPath(tokenId: string): string {
  return `/token/${encodeURIComponent(tokenId)}`;
}
