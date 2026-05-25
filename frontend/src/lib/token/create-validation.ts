import {
  assetCategoryLabel,
  deriveFdvKc,
  deriveListingPrice,
  TOKEN_ASSET_CATEGORIES,
} from "@/lib/token-categories";
import { ICreateTokenCrypto } from "@/types/token.type";

const NAME_MAX = 18;
const SYMBOL_MAX = 10;
const DESCRIPTION_MAX = 500;

const hasLetter = (s: string) => /[a-zA-Z]/.test(s);

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateFormSubmit = (form: ICreateTokenCrypto) => {
  const errors: Record<string, string> = {};

  const name = form?.name?.trim() ?? "";
  if (!name) {
    errors.name = "Tên token là bắt buộc.";
  } else if (!hasLetter(name)) {
    errors.name = "Tên token phải có ít nhất một chữ cái.";
  } else if (name.length > NAME_MAX) {
    errors.name = `Tên token tối đa ${NAME_MAX} ký tự.`;
  }

  const symbol = form?.symbol?.trim() ?? "";
  if (!symbol) {
    errors.symbol = "Ký hiệu là bắt buộc.";
  } else if (!hasLetter(symbol)) {
    errors.symbol = "Ký hiệu phải có ít nhất một chữ cái.";
  } else if (symbol.length > SYMBOL_MAX) {
    errors.symbol = `Ký hiệu tối đa ${SYMBOL_MAX} ký tự.`;
  }

  const category = form?.category?.trim() ?? "";
  if (!category) {
    errors.category = "Chọn hạng mục token.";
  } else if (!TOKEN_ASSET_CATEGORIES.some((c) => c.id === category)) {
    errors.category = "Hạng mục không hợp lệ.";
  }

  const decimals = Number(form?.decimals);
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18) {
    errors.decimals = "Số thập phân phải từ 0 đến 18.";
  }

  const totalSupply = Number(form?.totalSupply);
  if (!Number.isFinite(totalSupply) || totalSupply <= 0) {
    errors.totalSupply = "Tổng cung phải lớn hơn 0.";
  }

  const teamTokenAmount = Number(form?.teamTokenAmount);
  if (!Number.isFinite(teamTokenAmount) || teamTokenAmount < 0) {
    errors.teamTokenAmount = "Token team không hợp lệ.";
  }

  const liquidityTokenAmount = Number(form?.liquidityTokenAmount);
  if (!Number.isFinite(liquidityTokenAmount) || liquidityTokenAmount <= 0) {
    errors.liquidityTokenAmount = "Token vào pool phải lớn hơn 0.";
  }

  const liquidityKcAmount = Number(form?.liquidityKcAmount);
  if (!Number.isFinite(liquidityKcAmount) || liquidityKcAmount <= 0) {
    errors.liquidityKcAmount = "KC vào pool phải lớn hơn 0.";
  }

  if (
    Number.isFinite(totalSupply) &&
    Number.isFinite(teamTokenAmount) &&
    Number.isFinite(liquidityTokenAmount) &&
    teamTokenAmount + liquidityTokenAmount > totalSupply + 1e-9
  ) {
    errors.liquidityTokenAmount =
      "Team + thanh khoản không được vượt tổng cung.";
  }

  const price = deriveListingPrice(liquidityKcAmount, liquidityTokenAmount);
  if (price <= 0 && !errors.liquidityKcAmount && !errors.liquidityTokenAmount) {
    errors.liquidityKcAmount = "Tỷ lệ KC/token không hợp lệ.";
  }

  const description = form?.description?.trim() ?? "";
  if (!description) {
    errors.description = "Mô tả là bắt buộc.";
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.`;
  }

  const logo = form?.logo?.trim();
  if (logo && !isValidUrl(logo)) {
    errors.logo = "Logo phải là URL http(s) hợp lệ.";
  }

  const links = form.communityLinks;
  if (links) {
    const urlFields: (keyof typeof links)[] = [
      "website",
      "telegram",
      "discord",
      "twitter",
    ];
    for (const key of urlFields) {
      const v = links[key]?.trim();
      if (v && !isValidUrl(v) && !v.startsWith("https://t.me/")) {
        errors[`communityLinks.${key}`] = `${key}: URL không hợp lệ.`;
      }
    }
  }

  return errors;
};

/** Map key lỗi API → key hiển thị trên form issuer */
export const LISTING_FIELD_KEY_MAP: Record<string, string> = {
  name: "name",
  symbol: "symbol",
  logo: "logo",
  decimals: "decimals",
  category: "category",
  totalSupply: "totalSupply",
  teamTokenAmount: "teamTokenAmount",
  liquidityTokenAmount: "liquidityTokenAmount",
  liquidityKcAmount: "liquidityKcAmount",
  description: "description",
};

export function listingEconomicsSummary(form: ICreateTokenCrypto) {
  const totalSupply = Number(form.totalSupply) || 0;
  const team = Number(form.teamTokenAmount) || 0;
  const liqTok = Number(form.liquidityTokenAmount) || 0;
  const liqKc = Number(form.liquidityKcAmount) || 0;
  const price = deriveListingPrice(liqKc, liqTok);
  const circulating = liqTok;
  const mcap = deriveFdvKc(price, circulating);
  const fdv = deriveFdvKc(price, totalSupply);
  const treasury = Math.max(0, totalSupply - team - liqTok);
  return {
    price,
    circulating,
    mcap,
    fdv,
    treasury,
    categoryLabel: assetCategoryLabel(form.category),
  };
}
