/**
 * Cộng thêm token (KingCoin) vào ví BalanceToken của user.
 *
 * Chạy từ thư mục backend:
 *   node scripts/credit-kingcoin-balance.js
 *
 * Biến môi trường (tuỳ chọn):
 *   CREDIT_EMAIL — mặc định kien7122@gmail.com
 *   CREDIT_AMOUNT — số lượng token cộng thêm (mặc định 100000)
 *   CREDIT_TOKEN_NAME — tên token trong DB (mặc định KingCoin)
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const EMAIL = process.env.CREDIT_EMAIL ?? "kien7122@gmail.com";
const AMOUNT = Number(process.env.CREDIT_AMOUNT ?? "100000");
const TOKEN_NAME = process.env.CREDIT_TOKEN_NAME ?? "KingCoin";

async function main() {
  if (!Number.isFinite(AMOUNT) || AMOUNT <= 0) {
    throw new Error(`CREDIT_AMOUNT không hợp lệ: ${process.env.CREDIT_AMOUNT}`);
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(`Không tìm thấy user: ${EMAIL}`);
  }

  const token = await prisma.tokenCrypto.findFirst({
    where: { name: TOKEN_NAME },
  });
  if (!token?.id) {
    throw new Error(`Không tìm thấy token name="${TOKEN_NAME}"`);
  }

  let balance = await prisma.balance.findUnique({
    where: { userId: user.id },
  });

  if (!balance) {
    balance = await prisma.balance.create({
      data: {
        userId: user.id,
        stableCoin: 0,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { balanceId: balance.id },
    });
    console.log(`Đã tạo Balance cho ${EMAIL}`);
  }

  const existing = await prisma.balanceToken.findFirst({
    where: { balanceId: balance.id, tokenId: token.id },
  });

  if (existing) {
    const next = existing.amount + AMOUNT;
    await prisma.balanceToken.update({
      where: { id: existing.id },
      data: { amount: next },
    });
    console.log(
      `${EMAIL}: ${TOKEN_NAME} ${existing.amount} → ${next} (+${AMOUNT})`,
    );
  } else {
    await prisma.balanceToken.create({
      data: {
        balanceId: balance.id,
        tokenId: token.id,
        amount: AMOUNT,
      },
    });
    console.log(`${EMAIL}: tạo dòng ${TOKEN_NAME} = ${AMOUNT}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
