/** Khối lượng & bậc sổ MM/flow — đọc env, mặc định production lớn hơn dev. */

function readPositiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Số token base mỗi bậc mua/bán MM (trước nhiễu ngẫu nhiên nhẹ). */
export function mmQtyFromEnv(): number {
  return readPositiveNumber(
    process.env.MARKET_MAKER_QTY,
    isProduction() ? 350 : 80,
  );
}

/** Khối lượng mỗi lượt flow taker khớp MM. */
export function flowQtyFromEnv(): number {
  return readPositiveNumber(
    process.env.MARKET_FLOW_QTY,
    isProduction() ? 48 : 8,
  );
}

export function mmLevelsFromEnv(): number {
  const n = readPositiveNumber(
    process.env.MARKET_MAKER_LEVELS,
    isProduction() ? 10 : 6,
  );
  return Math.min(12, Math.max(1, Math.floor(n)));
}

/** Nhiễu ± quanh qty gốc (mỗi bậc). */
export function mmLevelQuantity(baseQty: number): number {
  const minF = readPositiveNumber(
    process.env.MARKET_MAKER_QTY_MIN_FRAC,
    isProduction() ? 0.94 : 0.88,
  );
  const maxF = readPositiveNumber(
    process.env.MARKET_MAKER_QTY_MAX_FRAC,
    isProduction() ? 1.06 : 1.12,
  );
  const lo = Math.min(minF, maxF);
  const hi = Math.max(minF, maxF);
  const qty = baseQty * (lo + Math.random() * (hi - lo));
  return Number(qty.toFixed(4));
}
