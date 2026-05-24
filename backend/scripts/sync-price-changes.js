/**
 * Tính lại priceChange1h / 24h / 7d cho mọi token.
 * node scripts/sync-price-changes.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const WINDOWS = {
  h1: 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
};

function percentChange(current, past) {
  if (!past || past <= 0 || !current) return null;
  return Number((((current - past) / past) * 100).toFixed(4));
}

async function priceAtOrBefore(tokenId, at) {
  const earliest = await prisma.tokenCryptoLog.findFirst({
    where: { tokenId },
    orderBy: { timestamp: "asc" },
  });
  if (!earliest?.timestamp || earliest.timestamp > at) return null;
  const row = await prisma.tokenCryptoLog.findFirst({
    where: { tokenId, timestamp: { lte: at } },
    orderBy: { timestamp: "desc" },
  });
  if (row?.price > 0) return row.price;
  return earliest.price > 0 ? earliest.price : null;
}

async function main() {
  const tokens = await prisma.tokenCrypto.findMany();
  const now = Date.now();
  for (const t of tokens) {
    const price = t.price > 0 ? t.price : null;
    if (!price) continue;
    const [p1, p24, p7] = await Promise.all([
      priceAtOrBefore(t.id, new Date(now - WINDOWS.h1)),
      priceAtOrBefore(t.id, new Date(now - WINDOWS.h24)),
      priceAtOrBefore(t.id, new Date(now - WINDOWS.d7)),
    ]);
    const data = {
      priceChange1h: percentChange(price, p1),
      priceChange24h: percentChange(price, p24),
      priceChange7d: percentChange(price, p7),
    };
    await prisma.tokenCrypto.update({
      where: { id: t.id },
      data: {
        ...(data.priceChange1h != null
          ? { priceChange1h: data.priceChange1h }
          : { priceChange1h: null }),
        ...(data.priceChange24h != null
          ? { priceChange24h: data.priceChange24h }
          : { priceChange24h: null }),
        ...(data.priceChange7d != null
          ? { priceChange7d: data.priceChange7d }
          : { priceChange7d: null }),
      },
    });
    console.log(
      `${t.symbol}: 1h=${percentChange(price, p1) ?? "—"}% 24h=${percentChange(price, p24) ?? "—"}% 7d=${percentChange(price, p7) ?? "—"}%`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
