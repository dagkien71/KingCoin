import { deriveMarketCapKc, tokenSupplyForMarketCap } from "@/lib/token-market";
import type { ITokenCrypto } from "@/types/token.type";
import { isStablecoinToken } from "@/types/token.type";

function capKc(t: ITokenCrypto): number {
  return deriveMarketCapKc(t.price, tokenSupplyForMarketCap(t));
}

export type MarketCategoryId =
  | "all"
  | "hot"
  | "gainers"
  | "losers"
  | "new_listings"
  | "futures"
  | "creator"
  | "stablecoin"
  | "watchlist";

export type MarketCategory = {
  id: MarketCategoryId;
  label: string;
  description: string;
  icon?: string;
};

export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: "all",
    label: "Tất cả",
    description: "Toàn bộ token đang niêm yết trên KingCoin",
  },
  {
    id: "hot",
    label: "Hot",
    description: "Khối lượng và biến động nổi bật 24h",
  },
  {
    id: "gainers",
    label: "Tăng mạnh",
    description: "Top % tăng giá 24h",
  },
  {
    id: "losers",
    label: "Giảm mạnh",
    description: "Top % giảm giá 24h",
  },
  {
    id: "new_listings",
    label: "Mới list",
    description: "Token mới niêm yết hoặc vừa phát hành",
  },
  {
    id: "futures",
    label: "Futures",
    description: "Cặp có giao dịch futures",
  },
  {
    id: "creator",
    label: "Creator",
    description: "Token do cộng đồng phát hành",
  },
  {
    id: "stablecoin",
    label: "Stablecoin",
    description: "Token neo giá (KC quote)",
  },
  {
    id: "watchlist",
    label: "Theo dõi",
    description: "Danh sách watchlist của bạn",
  },
];

export type MarketOverview = {
  tokenCount: number;
  altCount: number;
  totalMarketCap: number;
  totalVolume24h: number;
  gainerCount: number;
  loserCount: number;
  avgChange24h: number;
  hotSymbol: string | null;
};

export type UpcomingListing = {
  id: string;
  name: string;
  symbol: string;
  logo?: string | null;
  status: "scheduled" | "review" | "pending";
  etaLabel: string;
  initialPrice?: number | null;
  description?: string;
  href?: string;
  isPipeline?: boolean;
};

const UPCOMING_STATUSES = new Set([
  "pending",
  "scheduled",
  "review",
  "inactive",
  "upcoming",
]);

const MS_DAY = 86_400_000;
const NEW_LISTING_DAYS = 21;

function vol24(t: ITokenCrypto): number {
  return t.volumes?.volume24h ?? 0;
}

function ch24(t: ITokenCrypto): number {
  return t.priceChange24h ?? 0;
}

function createdMs(t: ITokenCrypto): number {
  if (!t.createdAt) return 0;
  const d = new Date(t.createdAt);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function launchMs(t: ITokenCrypto): number | null {
  if (!t.launchDate) return null;
  const d = new Date(t.launchDate);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

export function computeMarketOverview(tokens: ITokenCrypto[]): MarketOverview {
  const alts = tokens.filter((t) => !isStablecoinToken(t));
  let totalMarketCap = 0;
  let totalVolume24h = 0;
  let gainerCount = 0;
  let loserCount = 0;
  let changeSum = 0;
  let changeN = 0;
  let hot: ITokenCrypto | null = null;
  let hotScore = -1;

  for (const t of alts) {
    totalMarketCap += capKc(t);
    totalVolume24h += vol24(t);
    const c = ch24(t);
    if (c > 0) gainerCount += 1;
    if (c < 0) loserCount += 1;
    if (t.priceChange24h != null && !Number.isNaN(t.priceChange24h)) {
      changeSum += t.priceChange24h;
      changeN += 1;
    }
    const score = vol24(t) * (1 + Math.abs(c) / 100);
    if (score > hotScore) {
      hotScore = score;
      hot = t;
    }
  }

  return {
    tokenCount: tokens.length,
    altCount: alts.length,
    totalMarketCap,
    totalVolume24h,
    gainerCount,
    loserCount,
    avgChange24h: changeN > 0 ? changeSum / changeN : 0,
    hotSymbol: hot?.symbol ?? hot?.name ?? null,
  };
}

export function getHotTokens(tokens: ITokenCrypto[], limit = 8): ITokenCrypto[] {
  return [...tokens]
    .filter((t) => !isStablecoinToken(t))
    .sort((a, b) => {
      const sa = vol24(a) * (1 + Math.abs(ch24(a)) / 50);
      const sb = vol24(b) * (1 + Math.abs(ch24(b)) / 50);
      return sb - sa;
    })
    .slice(0, limit);
}

export function getTopGainers(tokens: ITokenCrypto[], limit = 5): ITokenCrypto[] {
  return [...tokens]
    .filter((t) => !isStablecoinToken(t) && t.priceChange24h != null)
    .sort((a, b) => ch24(b) - ch24(a))
    .slice(0, limit);
}

export function getTopLosers(tokens: ITokenCrypto[], limit = 5): ITokenCrypto[] {
  return [...tokens]
    .filter((t) => !isStablecoinToken(t) && t.priceChange24h != null)
    .sort((a, b) => ch24(a) - ch24(b))
    .slice(0, limit);
}

export function isNewListing(t: ITokenCrypto, now = Date.now()): boolean {
  const created = createdMs(t);
  if (created > 0 && now - created <= NEW_LISTING_DAYS * MS_DAY) return true;
  const launch = launchMs(t);
  if (launch != null && launch <= now && now - launch <= NEW_LISTING_DAYS * MS_DAY) {
    return true;
  }
  return false;
}

export function isUpcomingToken(t: ITokenCrypto, now = Date.now()): boolean {
  const st = (t.status ?? "").toLowerCase();
  if (UPCOMING_STATUSES.has(st)) return true;
  const launch = launchMs(t);
  if (launch != null && launch > now) return true;
  return false;
}

function formatEta(ms: number): string {
  const d = Math.ceil((ms - Date.now()) / MS_DAY);
  if (d <= 0) return "Sắp mở";
  if (d === 1) return "Ngày mai";
  if (d <= 7) return `${d} ngày nữa`;
  return new Date(ms).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  });
}

export function getUpcomingListings(
  tokens: ITokenCrypto[]
): UpcomingListing[] {
  const now = Date.now();
  const fromApi = tokens
    .filter((t) => isUpcomingToken(t, now))
    .map((t): UpcomingListing => {
      const launch = launchMs(t);
      const st = (t.status ?? "pending").toLowerCase();
      const status: UpcomingListing["status"] =
        st === "review"
          ? "review"
          : st === "scheduled" || (launch != null && launch > now)
            ? "scheduled"
            : "pending";
      return {
        id: t.id,
        name: t.name ?? t.symbol ?? "Token",
        symbol: t.symbol ?? "—",
        logo: t.logo,
        status,
        etaLabel:
          launch != null && launch > now
            ? formatEta(launch)
            : st === "review"
              ? "Đang duyệt"
              : "Chờ niêm yết",
        initialPrice: t.initialPrice ?? t.price,
        description: t.description?.slice(0, 120),
        href: `/token/${t.id}`,
      };
    });

  if (fromApi.length > 0) return fromApi.slice(0, 6);
  return PIPELINE_PLACEHOLDERS;
}

/** Lịch pipeline demo khi chưa có token pending trên API */
const PIPELINE_PLACEHOLDERS: UpcomingListing[] = [
  {
    id: "pipeline-quest",
    name: "Quest Reward Token",
    symbol: "QRT",
    status: "scheduled",
    etaLabel: "Tuần tới",
    initialPrice: 0.05,
    description: "Token thưởng quest — niêm yết sau chiến dịch onboarding.",
    isPipeline: true,
    href: "/quest",
  },
  {
    id: "pipeline-studio",
    name: "Creator Launchpad",
    symbol: "Studio",
    status: "review",
    etaLabel: "Đang duyệt",
    description: "Token creator tiếp theo từ KingCoin Studio.",
    isPipeline: true,
    href: "/issuer",
  },
  {
    id: "pipeline-futures",
    name: "Futures Season 2",
    symbol: "FS2",
    status: "pending",
    etaLabel: "Sắp công bố",
    description: "Mở rộng cặp futures — theo dõi thông báo sàn.",
    isPipeline: true,
    href: "/futures",
  },
];

export function filterByAssetCategory(
  tokens: ITokenCrypto[],
  assetCategory: string
): ITokenCrypto[] {
  if (!assetCategory || assetCategory === "all") return tokens;
  const id = assetCategory.toLowerCase();
  return tokens.filter((t) => (t.category ?? "other").toLowerCase() === id);
}

export function filterByCategory(
  tokens: ITokenCrypto[],
  category: MarketCategoryId,
  watchList?: string[]
): ITokenCrypto[] {
  let list = [...tokens];

  switch (category) {
    case "hot":
      return getHotTokens(list, 50);
    case "gainers":
      return [...list]
        .filter((t) => !isStablecoinToken(t))
        .sort((a, b) => ch24(b) - ch24(a));
    case "losers":
      return [...list]
        .filter((t) => !isStablecoinToken(t))
        .sort((a, b) => ch24(a) - ch24(b));
    case "new_listings":
      return list.filter((t) => isNewListing(t));
    case "futures":
      return list.filter((t) => !isStablecoinToken(t));
    case "creator":
      return list.filter((t) => Boolean(t.ownerId));
    case "stablecoin":
      return list.filter((t) => isStablecoinToken(t));
    case "watchlist":
      if (!watchList?.length) return [];
      return list.filter((t) => watchList.includes(t.id));
    default:
      return list;
  }
}

export function categoryCount(
  tokens: ITokenCrypto[],
  category: MarketCategoryId,
  watchList?: string[]
): number {
  return filterByCategory(tokens, category, watchList).length;
}
