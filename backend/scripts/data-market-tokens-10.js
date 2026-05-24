/**
 * 10 token thị trường demo — đủ trường Prisma + volumes + ATH/ATL.
 * Token #1 KingCoin (KC) là quote gốc của sàn.
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
    follower: base.follower,
    rating: base.rating,
    isVerified: base.isVerified ?? true,
    description: base.description,
    launchDate: base.launchDate,
    whitepaperUrl: base.whitepaperUrl,
    communityLinks: base.communityLinks,
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

const MARKET_TOKENS_10 = [
  token({
    ...KINGCOIN_NATIVE,
    rank: 1,
    follower: 128400,
    rating: 4.9,
    volumeBase: 1_230_000,
  }),
  token({
    name: "Apex Finance",
    symbol: "APX",
    price: 2.45,
    totalSupply: 50_000_000,
    rank: 2,
    follower: 48200,
    rating: 4.6,
    description:
      "Giao thức lending & yield aggregator trên KingCoin — thanh khoản APX/KC.",
    launchDate: "2025-01-15",
    whitepaperUrl: "https://kingcoin.local/whitepaper/apex",
    communityLinks: {
      website: "https://apex.kingcoin.local",
      twitter: "https://twitter.com/apex_finance",
      telegram: "https://t.me/apex_finance",
      discord: "https://discord.gg/apex",
    },
  }),
  token({
    name: "Nova Chain",
    symbol: "NOVA",
    price: 0.87,
    totalSupply: 200_000_000,
    rank: 3,
    follower: 35600,
    rating: 4.4,
    description: "L1 mô phỏng — bridge nhanh, phí thấp, cặp NOVA/KC.",
    launchDate: "2025-02-01",
    whitepaperUrl: "https://kingcoin.local/whitepaper/nova",
    communityLinks: {
      website: "https://nova.kingcoin.local",
      twitter: "https://twitter.com/nova_chain",
      telegram: "https://t.me/nova_chain",
    },
  }),
  token({
    name: "Solar Grid",
    symbol: "SLR",
    price: 4.12,
    totalSupply: 25_000_000,
    rank: 4,
    follower: 22100,
    rating: 4.2,
    description: "Token năng lượng xanh RWA — staking SLR nhận KC reward.",
    launchDate: "2025-03-10",
    whitepaperUrl: "https://kingcoin.local/whitepaper/solar",
    communityLinks: {
      website: "https://solargrid.kingcoin.local",
      twitter: "https://twitter.com/solar_grid",
    },
  }),
  token({
    name: "Meta Pulse",
    symbol: "MTP",
    price: 0.34,
    totalSupply: 500_000_000,
    rank: 5,
    follower: 91000,
    rating: 4.1,
    description: "Social-Fi + NFT marketplace — volume MTP cao giờ cao điểm.",
    launchDate: "2025-04-20",
    whitepaperUrl: "https://kingcoin.local/whitepaper/meta-pulse",
    communityLinks: {
      website: "https://metapulse.kingcoin.local",
      discord: "https://discord.gg/metapulse",
      telegram: "https://t.me/metapulse",
    },
  }),
  token({
    name: "Quantum Labs",
    symbol: "QTL",
    price: 18.6,
    totalSupply: 8_000_000,
    rank: 6,
    follower: 12400,
    rating: 4.7,
    description: "R&D DeFi — vault QTL/KC APY biến động theo vol.",
    launchDate: "2025-05-01",
    whitepaperUrl: "https://kingcoin.local/whitepaper/quantum",
    communityLinks: {
      website: "https://quantumlabs.kingcoin.local",
      twitter: "https://twitter.com/quantum_labs",
    },
  }),
  token({
    name: "Harbor DAO",
    symbol: "HRB",
    price: 1.05,
    totalSupply: 120_000_000,
    rank: 7,
    follower: 28700,
    rating: 4.3,
    description: "DAO quản trị treasury cảng thanh khoản — vote bằng HRB.",
    launchDate: "2025-06-12",
    whitepaperUrl: "https://kingcoin.local/whitepaper/harbor",
    communityLinks: {
      website: "https://harbordao.kingcoin.local",
      telegram: "https://t.me/harbor_dao",
    },
  }),
  token({
    name: "Ember Protocol",
    symbol: "EMB",
    price: 0.056,
    totalSupply: 2_000_000_000,
    rank: 8,
    follower: 156000,
    rating: 3.9,
    description: "Meme + burn mechanism — supply giảm dần qua giao dịch.",
    launchDate: "2025-07-04",
    whitepaperUrl: "https://kingcoin.local/whitepaper/ember",
    communityLinks: {
      twitter: "https://twitter.com/ember_protocol",
      telegram: "https://t.me/ember_coin",
    },
  }),
  token({
    name: "Zenith Pay",
    symbol: "ZNP",
    price: 6.78,
    totalSupply: 15_000_000,
    rank: 9,
    follower: 19800,
    rating: 4.5,
    description: "Payment rail B2B — settle KC ↔ ZNP tức thì trên sàn.",
    launchDate: "2025-08-18",
    whitepaperUrl: "https://kingcoin.local/whitepaper/zenith",
    communityLinks: {
      website: "https://zenithpay.kingcoin.local",
      twitter: "https://twitter.com/zenith_pay",
    },
  }),
  token({
    name: "Coral Swap",
    symbol: "CRL",
    price: 0.19,
    totalSupply: 800_000_000,
    rank: 10,
    follower: 67300,
    rating: 4.0,
    description: "DEX aggregator native — routing CRL pools trên KingCoin.",
    launchDate: "2025-09-01",
    whitepaperUrl: "https://kingcoin.local/whitepaper/coral",
    communityLinks: {
      website: "https://coralswap.kingcoin.local",
      discord: "https://discord.gg/coral",
      telegram: "https://t.me/coral_swap",
    },
  }),
];

module.exports = { MARKET_TOKENS_10 };
