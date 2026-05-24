/**
 * Tiền tệ quote mặc định của sàn: KingCoin (KC) — stablecoin nội bộ (vai trò ≈ USDT).
 * NAV: alt × giá TOKEN/KC hiện tại + số dư KC.
 * @see docs/STABLECOIN_KC_SPEC.md
 */
export const QUOTE_SYMBOL = "KC";

export const QUOTE_STABLECOIN = {
  name: "KingCoin",
  symbol: "KC",
  tokenKind: "stablecoin" as const,
  pegCurrency: "USD",
  pegTarget: 1.0,
};

export function quotePairLabel(baseSymbol: string | null | undefined): string {
  const b = (baseSymbol ?? "").trim() || "—";
  return `${b}/${QUOTE_SYMBOL}`;
}

/** Gắn đơn vị quote (KC) sau số đã format — thay cho ký hiệu $. */
export function withQuoteUnit(formattedNumber: string): string {
  if (
    !formattedNumber ||
    formattedNumber === "—" ||
    formattedNumber === "Invalid price"
  ) {
    return formattedNumber;
  }
  return `${formattedNumber} ${QUOTE_SYMBOL}`;
}

/** Giá stablecoin: hiển thị theo peg USD khi là KC / stablecoin. */
export function formatStableDisplayPrice(
  formattedNumber: string,
  pegCurrency = QUOTE_STABLECOIN.pegCurrency,
): string {
  if (!formattedNumber || formattedNumber === "—") return formattedNumber;
  return `${formattedNumber} ${pegCurrency}`;
}
