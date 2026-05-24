/**
 * Đảm bảo demo@kingcoin.local có đủ KC để login/dev.
 * Chạy: node scripts/ensure-demo-user-kc.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const EMAIL = "demo@kingcoin.local";
const PASSWORD = "demo12345";
const TARGET_KC = Number(process.env.DEMO_USER_KC ?? "100000");
const TOKEN_NAME = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";

async function main() {
  const token = await prisma.tokenCrypto.findFirst({
    where: { name: TOKEN_NAME },
  });
  if (!token?.id) {
    throw new Error(`Chưa có token "${TOKEN_NAME}" — chạy ensure-kingcoin-token.js`);
  }

  let user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    const hashed = await bcrypt.hash(PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        password: hashed,
        username: "demo",
        role: "user",
        balance: { create: { stableCoin: 0 } },
      },
    });
    console.log("Created", EMAIL);
  }

  let balance = await prisma.balance.findUnique({ where: { userId: user.id } });
  if (!balance) {
    balance = await prisma.balance.create({
      data: { userId: user.id, stableCoin: 0 },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { balanceId: balance.id },
    });
  }

  const row = await prisma.balanceToken.findFirst({
    where: { balanceId: balance.id, tokenId: token.id },
  });
  const current = row?.amount ?? 0;
  if (current < TARGET_KC - 1e-6) {
    const add = TARGET_KC - current;
    if (row) {
      await prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: TARGET_KC },
      });
    } else {
      await prisma.balanceToken.create({
        data: { balanceId: balance.id, tokenId: token.id, amount: TARGET_KC },
      });
    }
    console.log(`KC ${EMAIL}: ${current} → ${TARGET_KC} (+${add})`);
  } else {
    console.log(`KC ${EMAIL}: ${current} (đủ)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
