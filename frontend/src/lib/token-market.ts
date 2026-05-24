import type { ITokenCrypto } from "@/types/token.type";

export function tokenSupplyForMarketCap(
  token: Pick<ITokenCrypto, "circulatingSupply" | "totalSupply">
): number {
  const raw = token.circulatingSupply ?? token.totalSupply ?? 0;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function deriveMarketCapKc(
  price: number | null | undefined,
  supply: number
): number {
  const p = price ?? 0;
  if (!Number.isFinite(p) || p <= 0 || supply <= 0) return 0;
  return Number((supply * p).toFixed(2));
}

export function withDerivedMarketCap<T extends ITokenCrypto>(token: T): T {
  const supply = tokenSupplyForMarketCap(token);
  const marketCap = deriveMarketCapKc(token.price, supply);
  return { ...token, marketCap };
}
