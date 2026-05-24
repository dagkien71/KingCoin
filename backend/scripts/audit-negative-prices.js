/**
 * Kiểm tra giá token / log âm hoặc ≤ 0 trong DB.
 * Chạy: node backend/scripts/audit-negative-prices.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const badTokens = await prisma.tokenCrypto.findMany({
      where: { OR: [{ price: { lt: 0 } }, { price: 0 }] },
      select: { id: true, symbol: true, name: true, price: true },
    });
    const badLogs = await prisma.tokenCryptoLog.findMany({
      where: { price: { lte: 0 } },
      take: 20,
      select: { id: true, price: true, tokenId: true },
    });
  console.log("TokenCrypto price ≤ 0:", badTokens.length);
    badTokens.forEach((t) =>
      console.log(`  ${t.symbol} (${t.name}): ${t.price}`)
    );
    console.log("TokenCryptoLog price ≤ 0 (max 20):", badLogs.length);
    badLogs.forEach((l) =>
      console.log(`  token=${l.tokenId} price=${l.price}`)
    );
    if (!badTokens.length && !badLogs.length) {
      console.log("OK — không thấy giá âm hoặc zero.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
