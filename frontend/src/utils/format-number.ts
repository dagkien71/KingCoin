// Chuyển đổi number thành M (Million), B (Billion), T (Trillion), P (Quadrillion)
export function formatTotalSupply(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(number)) return "0";

  const units: string[] = ["", "M", "B", "T", "P"];
  let unitIndex = 0;

  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)}${units[unitIndex]}`;
}
// Chuyển đổi number thành M (Million), B (Billion), T (Trillion), P (Quadrillion)
export function formatMarketCap(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(number)) return "0";

  const units: string[] = ["", "M", "B", "T", "P"];
  let unitIndex = 0;

  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)}${units[unitIndex]} KC`;
}

/** Số chữ số thập phân chuẩn cho giá token (vd 0,4320). */
export const TOKEN_PRICE_STANDARD_FRACTION_DIGITS = 4;

/** Giá ≥ ngưỡng này → 4 số sau dấu phẩy; nhỏ hơn → đủ số để không làm tròn về 0. */
export const TOKEN_PRICE_MICRO_THRESHOLD = 0.0001;

export const TOKEN_PRICE_MAX_FRACTION_DIGITS = 12;

/** Số chữ số thập phân trong ô nhập giá (trade, v.v.). */
export const INPUT_PRICE_FRACTION_DIGITS = TOKEN_PRICE_STANDARD_FRACTION_DIGITS;

/**
 * Số chữ số sau dấu phẩy khi hiển thị giá token.
 * - 0,432032… → 4 (0,4320)
 * - 0,0000001 → đủ chữ số (7)
 */
export function resolveTokenPriceFractionDigits(price: number): number {
  if (!Number.isFinite(price) || price <= 0) {
    return TOKEN_PRICE_STANDARD_FRACTION_DIGITS;
  }
  const abs = Math.abs(price);
  if (abs >= TOKEN_PRICE_MICRO_THRESHOLD) {
    return TOKEN_PRICE_STANDARD_FRACTION_DIGITS;
  }
  const needed = Math.ceil(-Math.log10(abs));
  return Math.min(
    Math.max(needed, TOKEN_PRICE_STANDARD_FRACTION_DIGITS),
    TOKEN_PRICE_MAX_FRACTION_DIGITS,
  );
}

export function roundInputPrice(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const digits = resolveTokenPriceFractionDigits(value);
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Hiển thị giá trong input — vi-VN, theo `resolveTokenPriceFractionDigits`. */
export function formatInputPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  const n = Number(value);
  const digits = resolveTokenPriceFractionDigits(n);
  return roundInputPrice(n).toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Parse chuỗi người dùng nhập (dấu phẩy thập phân, chấm nghìn). */
export function parseInputPrice(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  let normalized: string;
  if (lastComma >= 0) {
    const intPart = t
      .slice(0, lastComma)
      .replace(/\./g, "")
      .replace(/,/g, "");
    const fracPart = t.slice(lastComma + 1).replace(/[^\d]/g, "");
    normalized = fracPart.length ? `${intPart}.${fracPart}` : intPart;
  } else {
    normalized = t.replace(/\./g, "").replace(/,/g, ".");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? roundInputPrice(n) : null;
}

function formatPriceLocale(price: number, fractionDigits: number): string {
  const rounded = Number(price.toFixed(fractionDigits));
  return rounded.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Giá cố định (sổ lệnh, mark, entry) — 4 số thập phân, trừ giá cực nhỏ. */
export function formatFixedPrice(_decimals: number, price: number): string {
  if (!Number.isFinite(price) || price < 0) {
    return "—";
  }
  const fd = resolveTokenPriceFractionDigits(price);
  return formatPriceLocale(price, fd);
}

/** Giá spot / mark / entry — luôn ≥ 0. Không dùng cho PnL (có thể âm). */
export function formatTokenPrice(_decimals: number, price: number): string {
  if (!Number.isFinite(price) || price < 0) {
    return "Invalid price";
  }
  const fd = resolveTokenPriceFractionDigits(price);
  return formatPriceLocale(price, fd);
}

/** PnL, delta KC — cho phép âm (lỗ). */
export function formatSignedKcAmount(
  value: number,
  decimals = 2,
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-${body}` : body;
}

export function formatPrettyPercentPrice(percent: number): string {
  if (isNaN(percent)) {
    return "Invalid percentage";
  }

  return `${percent.toFixed(2)}%`;
}

export function formatNumber(
  number: number | null | undefined,
  decimals = 2,
): string {
  const n = Number(number);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

/** Khối lượng toolbar (vi-VN, 2 số thập phân). */
export function formatToolbarVolume(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Delta giá có dấu ± (vi-VN). */
export function formatSignedInputPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  const body = formatInputPrice(Math.abs(n));
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}
