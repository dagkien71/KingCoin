import { TokenCrypto } from '@prisma/client';

/** Cung dùng tính vốn hoá — ưu tiên lưu hành, fallback tổng cung. */
export function tokenSupplyForMarketCap(
  token: Pick<TokenCrypto, 'circulatingSupply' | 'totalSupply'>,
): number {
  const raw = token.circulatingSupply ?? token.totalSupply ?? 0;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** Vốn hoá (KC) = giá spot × cung — luôn đồng bộ với giá hiện tại. */
export function deriveMarketCapKc(
  price: number | null | undefined,
  supply: number,
): number {
  const p = price ?? 0;
  if (!Number.isFinite(p) || p <= 0 || supply <= 0) return 0;
  return Number((supply * p).toFixed(2));
}

export function withDerivedMarketCap<T extends TokenCrypto>(token: T): T {
  const supply = tokenSupplyForMarketCap(token);
  const marketCap = deriveMarketCapKc(token.price, supply);
  return { ...token, marketCap };
}

export function withDerivedMarketCapList<T extends TokenCrypto>(
  tokens: T[],
): T[] {
  return tokens.map(withDerivedMarketCap);
}

/** Khối lượng khớp theo quote KC — mỗi fill chỉ cộng một lần (không nhân đôi mua+bán). */
export function tradeVolumeKc(price: number, baseQuantity: number): number {
  const p = price ?? 0;
  const q = baseQuantity ?? 0;
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(q) || q <= 0) return 0;
  return Number((p * q).toFixed(8));
}
