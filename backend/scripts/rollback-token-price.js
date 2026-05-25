/**
 * Khôi phục giá spot từ TokenCryptoLog (~N phút trước).
 *
 *   DATABASE_URL='mongodb+srv://.../kingcoin?...' \
 *   node scripts/rollback-token-price.js --symbol LEG --minutes 10
 *
 *   # hoặc giá cố định:
 *   node scripts/rollback-token-price.js --symbol Legos --price 4.82
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function marketCapKc(token, price) {
  const supply =
    token.circulatingSupply ?? token.totalSupply ?? 0;
  return Number((Number(supply) * Number(price)).toFixed(2));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { symbol: "LEG", name: null, minutes: 10, price: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--symbol" && args[i + 1]) out.symbol = args[++i];
    else if (args[i] === "--name" && args[i + 1]) out.name = args[++i];
    else if (args[i] === "--minutes" && args[i + 1]) out.minutes = Number(args[++i]);
    else if (args[i] === "--price" && args[i + 1]) out.price = Number(args[++i]);
    else if (args[i] === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function findToken({ symbol, name }) {
  const where = { OR: [] };
  if (symbol) {
    where.OR.push({ symbol: { equals: symbol, mode: "insensitive" } });
  }
  if (name) {
    where.OR.push({ name: { equals: name, mode: "insensitive" } });
  }
  if (!where.OR.length) throw new Error("Cần --symbol hoặc --name");
  return prisma.tokenCrypto.findFirst({ where });
}

async function priceFromLogs(tokenId, minutesAgo) {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
  const log = await prisma.tokenCryptoLog.findFirst({
    where: { tokenId, timestamp: { lte: cutoff } },
    orderBy: { timestamp: "desc" },
  });
  return log;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL (Atlas / local Mongo)");
  }
  const opts = parseArgs();
  const token = await findToken(opts);
  if (!token) {
    throw new Error(`Không tìm thấy token (symbol=${opts.symbol})`);
  }

  let targetPrice = opts.price;
  let source = "cli --price";
  if (targetPrice == null || !Number.isFinite(targetPrice)) {
    const log = await priceFromLogs(token.id, opts.minutes);
    if (!log) {
      throw new Error(
        `Không có log giá <= ${opts.minutes} phút trước cho ${token.symbol}`,
      );
    }
    targetPrice = log.price;
    source = `log @ ${log.timestamp.toISOString()}`;
  }

  const marketCap = marketCapKc(token, targetPrice);

  console.log({
    token: `${token.name} (${token.symbol})`,
    id: token.id,
    previousPrice: token.price,
    targetPrice,
    marketCap,
    source,
    dryRun: opts.dryRun,
  });

  if (opts.dryRun) return;

  await prisma.tokenCrypto.update({
    where: { id: token.id },
    data: { price: targetPrice, marketCap },
  });

  console.log("Đã cập nhật TokenCrypto.price + marketCap.");
  console.log(
    "Gợi ý: reset MM trên admin (/admin/market-control) hoặc POST .../tokens/:id/reset + refresh.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
