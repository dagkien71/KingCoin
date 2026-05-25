/** Nhóm tài sản khi niêm yết — đồng bộ frontend `token-categories.ts`. */
export const TOKEN_ASSET_CATEGORIES = [
  'defi',
  'gamefi',
  'meme',
  'infra',
  'ai',
  'rwa',
  'social',
  'utility',
  'creator',
  'other',
] as const;

export type TokenAssetCategory = (typeof TOKEN_ASSET_CATEGORIES)[number];

export const TOKEN_ASSET_CATEGORY_LABELS: Record<TokenAssetCategory, string> = {
  defi: 'DeFi',
  gamefi: 'GameFi',
  meme: 'Meme',
  infra: 'Hạ tầng',
  ai: 'AI',
  rwa: 'RWA',
  social: 'Social',
  utility: 'Tiện ích',
  creator: 'Creator',
  other: 'Khác',
};

export function isTokenAssetCategory(v: string): v is TokenAssetCategory {
  return (TOKEN_ASSET_CATEGORIES as readonly string[]).includes(v);
}

/** Giá khởi điểm từ pool KC/token. */
export function deriveListingInitialPrice(
  liquidityKc: number,
  liquidityToken: number,
): number {
  if (
    !Number.isFinite(liquidityKc) ||
    !Number.isFinite(liquidityToken) ||
    liquidityKc <= 0 ||
    liquidityToken <= 0
  ) {
    return 0;
  }
  return Number((liquidityKc / liquidityToken).toFixed(8));
}

export type ListingAllocationInput = {
  totalSupply: number;
  teamTokenAmount: number;
  liquidityTokenAmount: number;
};

export function validateListingAllocation(input: ListingAllocationInput): {
  ok: boolean;
  message?: string;
  treasuryTokenAmount?: number;
  circulatingSupply?: number;
} {
  const total = Number(input.totalSupply);
  const team = Number(input.teamTokenAmount);
  const liq = Number(input.liquidityTokenAmount);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: 'Tổng cung phải lớn hơn 0.' };
  }
  if (!Number.isFinite(team) || team < 0) {
    return { ok: false, message: 'Token team không hợp lệ.' };
  }
  if (!Number.isFinite(liq) || liq <= 0) {
    return {
      ok: false,
      message: 'Phải đưa vào pool ít nhất một lượng token thanh khoản.',
    };
  }
  if (team + liq > total + 1e-9) {
    return {
      ok: false,
      message: 'Team + thanh khoản không được vượt tổng cung.',
    };
  }
  const treasury = Math.max(0, total - team - liq);
  return {
    ok: true,
    treasuryTokenAmount: treasury,
    circulatingSupply: liq,
  };
}
