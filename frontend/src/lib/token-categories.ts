/** Đồng bộ backend `token-listing.constants.ts` */
export const TOKEN_ASSET_CATEGORIES = [
  { id: "defi", label: "DeFi" },
  { id: "gamefi", label: "GameFi" },
  { id: "meme", label: "Meme" },
  { id: "infra", label: "Hạ tầng" },
  { id: "ai", label: "AI" },
  { id: "rwa", label: "RWA" },
  { id: "social", label: "Social" },
  { id: "utility", label: "Tiện ích" },
  { id: "creator", label: "Creator" },
  { id: "other", label: "Khác" },
] as const;

export type TokenAssetCategoryId =
  (typeof TOKEN_ASSET_CATEGORIES)[number]["id"];

export function assetCategoryLabel(id?: string | null): string {
  if (!id) return "Khác";
  return (
    TOKEN_ASSET_CATEGORIES.find((c) => c.id === id)?.label ?? id
  );
}

export function deriveListingPrice(
  liquidityKc: number,
  liquidityToken: number
): number {
  if (liquidityKc <= 0 || liquidityToken <= 0) return 0;
  return liquidityKc / liquidityToken;
}

export function deriveMarketCapKc(price: number, circulating: number): number {
  if (price <= 0 || circulating <= 0) return 0;
  return Number((price * circulating).toFixed(2));
}

export function deriveFdvKc(price: number, totalSupply: number): number {
  if (price <= 0 || totalSupply <= 0) return 0;
  return Number((price * totalSupply).toFixed(2));
}
