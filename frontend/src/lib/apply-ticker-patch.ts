import type { TickerPatch } from "@/context/market-live-context";
import { deriveMarketCapKc, tokenSupplyForMarketCap } from "@/lib/token-market";
import type { ITokenCrypto } from "@/types/token.type";

/** Gộp giá/volume từ WS vào bản ghi token — không refetch REST */
export function applyTickerPatch<T extends Partial<ITokenCrypto>>(
  base: T | null | undefined,
  patch: TickerPatch | undefined
): T | null | undefined {
  if (!base) return base;
  if (!patch?.tokenId || base.id !== patch.tokenId) return base;

  const nextPrice = patch.price != null ? patch.price : base.price;
  const marketCap =
    patch.marketCap != null
      ? patch.marketCap
      : nextPrice != null
        ? deriveMarketCapKc(nextPrice, tokenSupplyForMarketCap(base))
        : base.marketCap;

  return {
    ...base,
    ...(patch.price != null ? { price: patch.price } : {}),
    ...(marketCap != null ? { marketCap } : {}),
    ...(patch.volumes != null ? { volumes: patch.volumes } : {}),
    ...(patch.priceChange1h != null
      ? { priceChange1h: patch.priceChange1h }
      : {}),
    ...(patch.priceChange24h != null
      ? { priceChange24h: patch.priceChange24h }
      : {}),
    ...(patch.priceChange7d != null ? { priceChange7d: patch.priceChange7d } : {}),
  };
}
