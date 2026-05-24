/**
 * Seed production: admin + 10 token (KC + DagKien team alts).
 *
 *   DATABASE_URL='mongodb+srv://.../kingcoin?...' node scripts/seed-dagkien-production.js
 */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { MARKET_TOKENS_DAGKIEN } = require("./data-market-tokens-dagkien");

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kingcoin.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";

async function ensureAdmin() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        username: ADMIN_USERNAME,
        password: hash,
        status: "active",
      },
    });
    console.log(`Admin updated: ${ADMIN_EMAIL}`);
    return existing;
  }
  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hash,
      username: ADMIN_USERNAME,
      role: "admin",
      walletAddress: `0xADM${Math.random().toString(16).slice(2, 38)}`,
      socialLinks: [],
      balance: { create: { stableCoin: 100_000 } },
    },
  });
  console.log(`Admin created: ${ADMIN_EMAIL}`);
  return user;
}

async function ensureDemoOwner() {
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
      walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
      socialLinks: [],
      balance: { create: { stableCoin: 10_000 } },
    },
  });
  console.log("Created demo@kingcoin.local");
  return user;
}

async function wipeTokenData() {
  await prisma.tradeFill.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.tokenCryptoLog.deleteMany({});
  await prisma.balanceToken.deleteMany({});
  await prisma.ledgerEntry.deleteMany({ where: { tokenId: { not: null } } });
  const tokens = await prisma.tokenCrypto.deleteMany({});
  console.log(`Wiped ${tokens.count} token(s) + related market data`);
}

async function seedPriceLogs(tokenId, targetPrice, hours = 8, opts = {}) {
  const bucketMs = 5 * 60_000;
  const points = Math.min(200, Math.max(16, Math.floor((hours * 3600_000) / bucketMs) + 1));
  const now = Date.now();
  const span = (points - 1) * bucketMs;
  const startPrice = targetPrice * 0.92;
  const rows = [];
  for (let i = 0; i < points; i++) {
    const t = new Date(now - span + i * bucketMs);
    const progress = i / Math.max(1, points - 1);
    let px;
    if (opts.stablecoin) {
      const peg = opts.pegTarget ?? targetPrice;
      const jitter = (Math.random() - 0.5) * peg * 0.004;
      px = Number((peg + jitter).toFixed(8));
    } else {
      const wave = Math.sin(progress * Math.PI * 2.5) * 0.015 * targetPrice;
      px = Number((startPrice + (targetPrice - startPrice) * progress + wave).toFixed(8));
    }
    if (i === points - 1) px = targetPrice;
    const volume = Number((15 + (i % 11) * 6.5).toFixed(4));
    rows.push({
      tokenId,
      price: px,
      volume,
      timestamp: t,
      hash: crypto.createHash("sha256").update(`${tokenId}|${px}|${volume}|${t}`).digest("hex"),
    });
  }
  await prisma.tokenCryptoLog.createMany({ data: rows });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL (production Atlas URI with /kingcoin)");
  }

  await ensureAdmin();
  const owner = await ensureDemoOwner();
  await wipeTokenData();

  for (const spec of MARKET_TOKENS_DAGKIEN) {
    const { ...data } = spec;
    const token = await prisma.tokenCrypto.create({
      data: { ...data, ownerId: owner.id },
    });
    await seedPriceLogs(token.id, token.price ?? 1, 8, {
      stablecoin: token.tokenKind === "stablecoin",
      pegTarget: token.stablecoinSpec?.pegTarget ?? token.price,
    });
    console.log(`+ ${token.rank}. ${token.name} (${token.symbol}) — ${token.price} KC`);
  }

  console.log("\nDone. Admin login:", ADMIN_EMAIL);
  console.log("Default admin password: (see ADMIN_PASSWORD env or admin12345)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
