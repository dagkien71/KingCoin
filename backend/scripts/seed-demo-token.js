/**
 * Seed tối thiểu: 1 user + token chủ đạo KingCoin (chỉ khi chưa có token).
 * Chạy: node scripts/seed-demo-token.js
 * Sau đó nên chạy: node scripts/ensure-kingcoin-token.js để đồng bộ dữ liệu 1M KC.
 * (DATABASE_URL lấy từ môi trường hoặc .env — Prisma tự load .env)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { KINGCOIN_NATIVE } = require("./data-kingcoin-native");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.tokenCrypto.count();
  if (count > 0) {
    console.log(`Skip create: already ${count} token(s) — chạy ensure-kingcoin-token.js để cập nhật KingCoin`);
    return;
  }

  const hash = await bcrypt.hash("demo12345", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@kingcoin.local",
      password: hash,
      username: "demo",
      walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      socialLinks: [],
    },
  });

  await prisma.tokenCrypto.create({
    data: {
      ...KINGCOIN_NATIVE,
      ownerId: user.id,
    },
  });

  console.log("Seeded demo@kingcoin.local + KingCoin (KC, 1.000.000 phát hành)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
