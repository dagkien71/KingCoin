/** Gom thanh khoản MM trong vùng giá gần best — một lệnh taker lớn. */

export type BookLevel = { price: number; quantity: number };

export function rollTakerChunkQty(baseQty: number): number {
  const base = Math.max(0.0001, baseQty);
  const isSpike = Math.random() > 0.88;
  const mult = isSpike
    ? 1.35 + Math.random() * 2.1
    : 0.68 + Math.random() * 0.62;
  return Number((base * mult).toFixed(6));
}

/** Mua: gom ask từ best lên tới best×(1+slip). limit = giá ask cao nhất trong vùng. */
export function aggregateAskLiquidityInBand(
  asks: BookLevel[],
  maxSlipPct: number,
): { limitPrice: number; totalQty: number } {
  if (asks.length === 0) return { limitPrice: 0, totalQty: 0 };
  const best = asks[0].price;
  if (best <= 0) return { limitPrice: 0, totalQty: 0 };
  const cap = best * (1 + Math.max(0, maxSlipPct));
  let totalQty = 0;
  let limitPrice = best;
  for (const a of asks) {
    if (a.price <= 0 || a.quantity <= 0) continue;
    if (a.price > cap + 1e-12) break;
    totalQty += a.quantity;
    limitPrice = Math.max(limitPrice, a.price);
  }
  return { limitPrice, totalQty };
}

/** Bán: gom bid từ best xuống tới best×(1-slip). limit = giá bid thấp nhất trong vùng. */
export function aggregateBidLiquidityInBand(
  bids: BookLevel[],
  maxSlipPct: number,
): { limitPrice: number; totalQty: number } {
  if (bids.length === 0) return { limitPrice: 0, totalQty: 0 };
  const best = bids[0].price;
  if (best <= 0) return { limitPrice: 0, totalQty: 0 };
  const floor = best * (1 - Math.max(0, maxSlipPct));
  let totalQty = 0;
  let limitPrice = best;
  for (const b of bids) {
    if (b.price <= 0 || b.quantity <= 0) continue;
    if (b.price < floor - 1e-12) break;
    totalQty += b.quantity;
    limitPrice = Math.min(limitPrice, b.price);
  }
  return { limitPrice, totalQty };
}

export function orderRemainingQty(
  quantity: number,
  matchedQuantity?: number | null,
): number {
  const q = Number(quantity);
  const m = Number(matchedQuantity ?? 0);
  const rem = q - m;
  return Number.isFinite(rem) && rem > 1e-12 ? rem : q > 0 ? q : 0;
}
