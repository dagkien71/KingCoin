/** Đặc tả stablecoin (KC) — khớp backend stablecoinSpec */
export interface IStablecoinSpec {
  assetClass?: string;
  pegType?: string;
  pegCurrency?: string;
  pegTarget?: number;
  pegTolerancePct?: number;
  maxDeviation24hPct?: number;
  collateralModel?: string;
  collateralRatioMin?: number;
  collateralAssets?: string[];
  redemptionPolicy?: string;
  rebalancePolicy?: string;
  issuancePolicy?: string;
  auditStatus?: string;
  regulatoryNote?: string;
  useCases?: string[];
  risks?: string[];
}

export type TokenKind = "stablecoin" | "volatile";

export function isStablecoinToken(
  token: { tokenKind?: string | null; symbol?: string | null } | null | undefined,
): boolean {
  if (!token) return false;
  return token.tokenKind === "stablecoin" || token.symbol === "KC";
}
