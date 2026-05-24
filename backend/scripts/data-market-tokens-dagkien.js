/**
 * 10 token production — KC + 9 alt theo tên DagKien team.
 */
const { KINGCOIN_NATIVE } = require("./data-kingcoin-native");

function logo(seed) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function vol(base) {
  return {
    volume1h: Number((base * 0.08).toFixed(4)),
    volume24h: Number((base * 1.2).toFixed(4)),
    volume1w: Number((base * 6.5).toFixed(4)),
    volume1m: Number((base * 22).toFixed(4)),
    volume1y: Number((base * 95).toFixed(4)),
  };
}

function athAtl(price) {
  const ath = price * 1.85;
  const atl = price * 0.42;
  return {
    athPrice: Number(ath.toFixed(8)),
    athPercentage: Number((((ath - price) / price) * 100).toFixed(2)),
    atlPrice: Number(atl.toFixed(8)),
    atlPercentage: Number((((price - atl) / price) * 100).toFixed(2)),
    athPriceDay: Number((price * 1.12).toFixed(8)),
    athPercentageDay: 12,
    atlPriceDay: Number((price * 0.94).toFixed(8)),
    atlPercentageDay: 6,
  };
}

function token(base) {
  const isStable = base.tokenKind === "stablecoin";
  const price = base.price;
  const supply = base.totalSupply;
  const marketCap = Number((supply * price).toFixed(2));
  const row = {
    name: base.name,
    symbol: base.symbol,
    logo: base.logo ?? logo(base.symbol),
    decimals: 8,
    status: "active",
    price,
    initialPrice: base.initialPrice ?? (isStable ? price : price * 0.65),
    totalSupply: supply,
    maxSupply: base.maxSupply ?? supply,
    circulatingSupply: base.circulatingSupply ?? (isStable ? supply : supply * 0.88),
    marketCap,
    rank: base.rank,
    follower: base.follower ?? 1000,
    rating: base.rating ?? 4.2,
    isVerified: base.isVerified ?? true,
    description: base.description ?? `${base.name} on KingCoin`,
    launchDate: base.launchDate ?? "2025-01-01",
    whitepaperUrl: base.whitepaperUrl ?? "",
    communityLinks: base.communityLinks ?? {},
    tokenKind: base.tokenKind ?? "volatile",
    stablecoinSpec: base.stablecoinSpec ?? null,
    volumes: base.volumes ?? vol(base.volumeBase ?? marketCap * 0.02),
  };
  if (isStable && base.athPrice != null) {
    Object.assign(row, {
      athPrice: base.athPrice,
      athPercentage: base.athPercentage,
      atlPrice: base.atlPrice,
      atlPercentage: base.atlPercentage,
      athPriceDay: base.athPriceDay,
      athPercentageDay: base.athPercentageDay,
      atlPriceDay: base.atlPriceDay,
      atlPercentageDay: base.atlPercentageDay,
    });
  } else if (!isStable) {
    Object.assign(row, athAtl(price));
  }
  return row;
}

const ALT_SPECS = [
  { name: "DagKien", symbol: "DGK", price: 2.5, totalSupply: 50_000_000, rank: 2 },
  { name: "Legos", symbol: "LEG", price: 1.2, totalSupply: 80_000_000, rank: 3 },
  { name: "Lucas", symbol: "LUC", price: 0.85, totalSupply: 120_000_000, rank: 4 },
  { name: "Red", symbol: "RED", price: 3.4, totalSupply: 30_000_000, rank: 5 },
  { name: "JameBinky", symbol: "JBK", price: 0.42, totalSupply: 200_000_000, rank: 6 },
  { name: "Loki", symbol: "LOK", price: 5.6, totalSupply: 12_000_000, rank: 7 },
  { name: "Kenshine", symbol: "KSH", price: 1.8, totalSupply: 45_000_000, rank: 8 },
  { name: "Will", symbol: "WIL", price: 0.95, totalSupply: 90_000_000, rank: 9 },
  { name: "Yama", symbol: "YAM", price: 4.2, totalSupply: 25_000_000, rank: 10 },
];

const MARKET_TOKENS_DAGKIEN = [
  token({
    ...KINGCOIN_NATIVE,
    rank: 1,
    follower: 128400,
    rating: 4.9,
    volumeBase: 1_230_000,
  }),
  ...ALT_SPECS.map((s) =>
    token({
      ...s,
      description: `${s.name} — alt token trên sàn KingCoin (cặp ${s.symbol}/KC).`,
      follower: 5000 + s.rank * 1200,
      rating: 4.0 + (s.rank % 5) * 0.1,
    }),
  ),
];

module.exports = { MARKET_TOKENS_DAGKIEN };
