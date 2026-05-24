/**
 * Seed token sắp niêm yết (countdown) — chạy: node scripts/seed-upcoming-listings.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function logo(seed) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function daysFromNow(days, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const ROWS = [
  {
    name: "NovaChain",
    symbol: "NOVA",
    logo: logo("NOVA"),
    tagline: "Lớp thanh khoản thế hệ mới trên KingCoin",
    description:
      "NovaChain là token hạ tầng mô phỏng DeFi với thanh khoản sâu ngay từ ngày list. Hỗ trợ Spot và Futures trong tuần đầu.",
    status: "scheduled",
    listingAt: daysFromNow(2, 10),
    initialPrice: 0.085,
    totalSupply: 500_000_000,
    category: "DeFi",
    features: ["Spot", "Futures", "Quest airdrop"],
    specs: [
      { label: "Tổng cung", value: "500M NOVA" },
      { label: "Giá mở cửa", value: "0.085 KC" },
      { label: "Phí listing", value: "Đã thanh toán" },
      { label: "Cặp", value: "NOVA/KC" },
    ],
    sortOrder: 1,
    isFeatured: true,
  },
  {
    name: "Pixel Quest",
    symbol: "PXQ",
    logo: logo("PXQ"),
    tagline: "GameFi — play-to-earn trên sàn mô phỏng",
    description:
      "Token game với nhiệm vụ hàng ngày và pool thưởng KC. Niêm yết Spot trước, Futures sau 7 ngày.",
    status: "scheduled",
    listingAt: daysFromNow(5, 15),
    initialPrice: 0.012,
    totalSupply: 2_000_000_000,
    category: "GameFi",
    features: ["Spot", "Quest"],
    specs: [
      { label: "Tổng cung", value: "2B PXQ" },
      { label: "Giá mở cửa", value: "0.012 KC" },
      { label: "Airdrop", value: "Quest onboarding" },
      { label: "Creator", value: "KingCoin Studio" },
    ],
    sortOrder: 2,
    isFeatured: true,
  },
  {
    name: "Meme King",
    symbol: "MKING",
    logo: logo("MKING"),
    tagline: "Community meme coin — voting trước khi list",
    description:
      "Token cộng đồng do creator phát hành qua Studio. Đang trong giai đoạn review compliance nội bộ.",
    status: "review",
    listingAt: daysFromNow(9, 12),
    initialPrice: 0.00042,
    totalSupply: 888_888_888,
    category: "Meme",
    features: ["Spot"],
    specs: [
      { label: "Tổng cung", value: "888.8M MKING" },
      { label: "Giá dự kiến", value: "0.00042 KC" },
      { label: "Trạng thái", value: "Đang duyệt" },
      { label: "Vote cộng đồng", value: "Đang mở" },
    ],
    sortOrder: 3,
    isFeatured: false,
  },
  {
    name: "Solar Grid",
    symbol: "SGRID",
    logo: logo("SGRID"),
    tagline: "RWA mô phỏng — chỉ số năng lượng xanh",
    description:
      "Token mô phỏng tài sản thực (RWA) với narrative ESG. List đồng thời trên bảng Hot Market.",
    status: "announced",
    listingAt: daysFromNow(14, 9),
    initialPrice: 1.25,
    totalSupply: 50_000_000,
    category: "RWA",
    features: ["Spot", "Futures", "Convert"],
    specs: [
      { label: "Tổng cung", value: "50M SGRID" },
      { label: "Giá mở cửa", value: "1.25 KC" },
      { label: "Loại", value: "RWA / ESG" },
      { label: "Whitepaper", value: "Sẵn sàng" },
    ],
    sortOrder: 4,
    isFeatured: false,
  },
];

async function main() {
  await prisma.upcomingListing.deleteMany({});
  await prisma.upcomingListing.createMany({ data: ROWS });
  console.log(`Seeded ${ROWS.length} upcoming listing(s).`);
  ROWS.forEach((r) => {
    console.log(`  · ${r.symbol} → ${r.listingAt.toISOString()}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
