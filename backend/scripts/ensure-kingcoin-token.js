/**
 * Đảm bảo token KingCoin (KC) trong DB với phát hành 1.000.000 token.
 * - Có sẵn: cập nhật các trường phát hành / thị trường.
 * - Chưa có: tạo mới (cần ít nhất một user làm owner — ưu tiên demo@kingcoin.local).
 *
 * Chạy: node scripts/ensure-kingcoin-token.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { KINGCOIN_NATIVE } = require("./data-kingcoin-native");

const prisma = new PrismaClient();

async function ensureDemoUser() {
  let user = await prisma.user.findFirst({
    where: { email: "demo@kingcoin.local" },
  });
  if (user) return user;

  const hash = await bcrypt.hash("demo12345", 10);
  user = await prisma.user.create({
    data: {
      email: "demo@kingcoin.local",
      password: hash,
      username: "demo",
      walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      socialLinks: [],
    },
  });
  console.log("Created demo@kingcoin.local for KingCoin ownerId");
  return user;
}

async function main() {
  const owner = await ensureDemoUser();

  const existing = await prisma.tokenCrypto.findFirst({
    where: {
      OR: [
        { name: KINGCOIN_NATIVE.name },
        { symbol: KINGCOIN_NATIVE.symbol },
      ],
    },
  });

  const payload = {
    ...KINGCOIN_NATIVE,
    ownerId: owner.id,
  };

  if (existing) {
    await prisma.tokenCrypto.update({
      where: { id: existing.id },
      data: payload,
    });
    console.log(`Updated KingCoin (${existing.id}) — 1.000.000 KC`);
  } else {
    const created = await prisma.tokenCrypto.create({
      data: payload,
    });
    console.log(`Created KingCoin (${created.id}) — 1.000.000 KC`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
