/**
 * Đồng bộ FuturesConfig cho mọi token alt trên spot (trừ KC/quote).
 * Chạy: node backend/scripts/sync-futures-markets.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

function quoteTokenName() {
  return process.env.QUOTE_TOKEN_NAME?.trim() || "KingCoin";
}

function isQuoteToken(token) {
  if (token.tokenKind === "stablecoin") return true;
  const qName = quoteTokenName();
  if (token.name === qName) return true;
  const qSym = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || "KC";
  if (token.symbol?.toUpperCase() === qSym.toUpperCase()) return true;
  return false;
}

function isFuturesEligible(token) {
  if (token.tokenKind === "stablecoin") return false;
  return !isQuoteToken(token);
}

const DEFAULTS = {
  enabled: true,
  maxLeverage: 10,
  minMarginKc: 10,
  minSize: 0.0001,
  maintenanceRate: 0.005,
  liquidationFeeRate: 0.002,
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const tokens = await prisma.tokenCrypto.findMany({
      orderBy: [{ rank: "asc" }, { symbol: "asc" }],
    });
    let n = 0;
    for (const t of tokens) {
      if (!isFuturesEligible(t)) continue;
      await prisma.futuresConfig.upsert({
        where: { tokenId: t.id },
        create: { tokenId: t.id, ...DEFAULTS },
        update: { enabled: true },
      });
      n += 1;
      console.log(`  ✓ ${t.symbol} (${t.name})`);
    }
    console.log(`\nĐã bật futures cho ${n} token.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
