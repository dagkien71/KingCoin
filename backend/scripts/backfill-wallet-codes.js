/**
 * Gán walletCode cho user chưa có (tránh lỗi unique index null trên Mongo).
 * Chạy: node scripts/backfill-wallet-codes.js
 */
const { PrismaClient } = require("@prisma/client");
const { randomInt } = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateWalletCode() {
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `KC-${suffix}`;
}

async function main() {
  const prisma = new PrismaClient();
  const all = await prisma.user.findMany({
    select: { id: true, walletCode: true },
  });
  const users = all.filter((u) => !u.walletCode?.trim());
  let ok = 0;
  for (const u of users) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateWalletCode();
      try {
        await prisma.user.update({
          where: { id: u.id },
          data: { walletCode: code },
        });
        ok += 1;
        break;
      } catch {
        /* collision */
      }
    }
  }
  console.log(`Đã gán mã ví cho ${ok}/${users.length} user.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
