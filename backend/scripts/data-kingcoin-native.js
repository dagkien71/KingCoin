/**
 * KingCoin (KC) — stablecoin / đơn vị quote của sàn.
 * Peg 1 KC ≈ 1 USD (nominal, môi trường demo).
 * @see docs/STABLECOIN_KC_SPEC.md
 */
const PEG_TARGET = 1.0;
const SUPPLY = 1_000_000;

/** Đặc tả stablecoin lưu DB (stablecoinSpec) */
const KC_STABLECOIN_SPEC = {
  assetClass: "stablecoin",
  pegType: "fiat_replica",
  pegCurrency: "USD",
  pegTarget: PEG_TARGET,
  pegTolerancePct: 0.5,
  maxDeviation24hPct: 0.3,
  collateralModel: "full_reserve",
  collateralRatioMin: 1.0,
  collateralAssets: ["KC_reserve_treasury", "demo_KC_float"],
  redemptionPolicy:
    "1 KC đổi 1 USD danh nghĩa trong phạm vi demo (không phải cam kết pháp lý).",
  rebalancePolicy: "admin_peg_and_mm_band",
  issuancePolicy: "fixed_supply_mint_at_launch",
  auditStatus: "demo_simulation",
  regulatoryNote:
    "Chỉ dùng môi trường KingCoin demo — không phải stablecoin được cấp phép.",
  useCases: [
    "quote_pair",
    "listing_fee",
    "trade_settlement",
    "wallet_balance_display",
    "market_maker_collateral",
  ],
  risks: [
    "Không có bảo lãnh ngân hàng thật",
    "Giá có thể lệch khi admin chạy điều khiển thị trường trên KC",
  ],
};

const KINGCOIN_NATIVE = {
  name: "KingCoin",
  symbol: "KC",
  tokenKind: "stablecoin",
  stablecoinSpec: KC_STABLECOIN_SPEC,
  decimals: 8,
  totalSupply: SUPPLY,
  maxSupply: SUPPLY,
  circulatingSupply: SUPPLY,
  price: PEG_TARGET,
  marketCap: SUPPLY * PEG_TARGET,
  initialPrice: PEG_TARGET,
  status: "active",
  isVerified: true,
  description:
    "Stablecoin gốc của sàn KingCoin (KC): đơn vị thanh toán & quote cho mọi cặp BASE/KC. Mục tiêu neo 1 KC ≈ 1 USD, biến động thấp, phát hành cố định 1.000.000 KC.",
  launchDate: "2024-06-01",
  whitepaperUrl: "https://kingcoin.local/whitepaper/stablecoin",
  communityLinks: {
    website: "https://kingcoin.local",
    twitter: "https://twitter.com/kingcoin",
    telegram: "https://t.me/kingcoin",
    discord: "",
  },
  volumes: {
    volume1h: 0.02,
    volume24h: 0.08,
    volume1w: 0.35,
    volume1m: 1.2,
    volume1y: 4.5,
  },
  rank: 1,
  athPrice: 1.005,
  athPercentage: 0.5,
  atlPrice: 0.995,
  atlPercentage: 0.5,
  athPriceDay: 1.002,
  athPercentageDay: 0.2,
  atlPriceDay: 0.998,
  atlPercentageDay: 0.2,
  logo: "https://api.dicebear.com/7.x/shapes/svg?seed=KingCoin-KC",
};

module.exports = {
  KINGCOIN_NATIVE,
  KC_STABLECOIN_SPEC,
  SUPPLY,
  PEG_TARGET,
  PRICE_REF: PEG_TARGET,
};
