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

/** Số chữ số thập phân trong ô nhập giá (trade, v.v.). */
export const INPUT_PRICE_FRACTION_DIGITS = 4;

export function roundInputPrice(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** INPUT_PRICE_FRACTION_DIGITS;
  return Math.round(value * f) / f;
}

/** Hiển thị giá trong input — vi-VN, đúng 4 số sau dấu phẩy. */
export function formatInputPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return roundInputPrice(Number(value)).toLocaleString("vi-VN", {
    minimumFractionDigits: INPUT_PRICE_FRACTION_DIGITS,
    maximumFractionDigits: INPUT_PRICE_FRACTION_DIGITS,
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

/** Giá cố định số chữ số thập phân (sổ lệnh, giá tham chiếu). */
export function formatFixedPrice(decimals: number, price: number): string {
  if (!Number.isFinite(price) || price < 0) {
    return "—";
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Giá spot / mark / entry — luôn ≥ 0. Không dùng cho PnL (có thể âm). */
export function formatTokenPrice(decimals: number, price: number): string {
  if (!Number.isFinite(price) || price < 0) {
    return "Invalid price";
  }

  return price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
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

export function formatNumber(number: number) {
  return number.toFixed(2);
}
