/**
 * Cấu trúc deeplink/slug token duy nhất (backend) — khớp frontend lib/token-routes.ts
 */

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

export function tradeDeeplink(
  symbol?: string | null,
  name?: string | null,
  id?: string,
): string {
  const slug = tokenPairSlugFromParts({
    id: id ?? 'token',
    name,
    symbol,
  });
  return `/trade/${encodeURIComponent(slug)}`;
}

export function futuresDeeplink(
  symbol?: string | null,
  name?: string | null,
  id?: string,
): string {
  const slug = tokenPairSlugFromParts({
    id: id ?? 'token',
    name,
    symbol,
  });
  return `/futures/${encodeURIComponent(slug)}`;
}
