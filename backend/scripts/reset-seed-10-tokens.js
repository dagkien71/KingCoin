/**
 * Xóa toàn bộ token cũ + dữ liệu liên quan, tạo lại 10 token đầy đủ thông tin.
 *
 * Chạy (từ backend/):
 *   node scripts/reset-seed-10-tokens.js
 *
 * Sau đó:
 *   node scripts/ensure-bot-inventory.js
 *   node scripts/ensure-demo-user-kc.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { MARKET_TOKENS_10 } = require("./data-market-tokens-10");

const prisma = new PrismaClient();

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
    },
  });
  console.log("Created demo@kingcoin.local");
  return user;
}

async function withRetry(label, fn, attempts = 15) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const retryable =
        e?.code === "P2034" || /write conflict|deadlock/i.test(String(e?.message));
      if (!retryable || i === attempts) throw e;
      const wait = 600 * i;
      console.warn(`${label}: conflict, retry ${i}/${attempts} sau ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function wipeTokenData() {
  const fills = await withRetry("tradeFill", () =>
    prisma.tradeFill.deleteMany({}),
  );
  const orders = await withRetry("order", () => prisma.order.deleteMany({}));
  const logs = await withRetry("tokenCryptoLog", () =>
    prisma.tokenCryptoLog.deleteMany({}),
  );
  const balTok = await withRetry("balanceToken", () =>
    prisma.balanceToken.deleteMany({}),
  );
  const ledger = await withRetry("ledger", () =>
    prisma.ledgerEntry.deleteMany({ where: { tokenId: { not: null } } }),
  );
  const tokens = await withRetry("tokenCrypto", () =>
    prisma.tokenCrypto.deleteMany({}),
  );
  console.log(
    `Đã xóa: ${tokens.count} token, ${orders.count} order, ${logs.count} log, ${fills.count} fill, ${balTok.count} balanceToken, ${ledger.count} ledger(token)`,
  );
}

/** Log giá mẫu — 1 tick / 5 phút (khớp TF chart mặc định), volume thật kiểu khớp lệnh. */
async function seedPriceLogs(tokenId, targetPrice, hours = 8, opts = {}) {
  const bucketMs = 5 * 60_000;
  const points = Math.min(
    200,
    Math.max(16, Math.floor((hours * 3600_000) / bucketMs) + 1),
  );
  const now = Date.now();
  const span = (points - 1) * bucketMs;
  const rows = [];
  const isStable = opts.stablecoin === true;
  const peg = opts.pegTarget ?? targetPrice;
  const startPrice = isStable
    ? peg
    : Number((targetPrice * (0.965 + (tokenId.charCodeAt(0) % 5) * 0.003)).toFixed(8));

  for (let i = 0; i < points; i++) {
    const t = now - span + i * bucketMs;
    const progress = points <= 1 ? 1 : i / (points - 1);
    let px;
    if (isStable) {
      const jitter = Math.sin(i * 0.45) * 0.0006 * peg;
      px = Number((peg + jitter).toFixed(8));
    } else {
      const wave = Math.sin(progress * Math.PI * 2.5) * 0.015 * targetPrice;
      px = Number(
        (startPrice + (targetPrice - startPrice) * progress + wave).toFixed(8),
      );
    }
    if (i === points - 1) {
      px = targetPrice;
    }
    const volume = Number((15 + (i % 11) * 6.5).toFixed(4));
    rows.push({
      tokenId,
      price: px,
      volume,
      timestamp: new Date(t),
      hash: crypto
        .createHash("sha256")
        .update(`${tokenId}|${px}|${volume}|${t}`)
        .digest("hex"),
    });
  }

  await prisma.tokenCryptoLog.createMany({ data: rows });
}

async function main() {
  const owner = await ensureDemoOwner();
  await wipeTokenData();

  const created = [];
  for (const spec of MARKET_TOKENS_10) {
    const { ...data } = spec;
    const token = await prisma.tokenCrypto.create({
      data: {
        ...data,
        ownerId: owner.id,
      },
    });
    await seedPriceLogs(token.id, token.price ?? 1, 8, {
      stablecoin: token.tokenKind === "stablecoin",
      pegTarget: token.stablecoinSpec?.pegTarget ?? token.price,
    });
    created.push(token);
    console.log(
      `+ ${token.rank}. ${token.name} (${token.symbol}) — $${token.price} · cap ${token.marketCap}`,
    );
  }

  const mmNames = created
    .filter((t) => t.symbol !== "KC")
    .map((t) => t.name)
    .join(",");

  console.log("\n10 token đã tạo (KingCoin = quote KC).");
  console.log("Gợi ý backend/.env (MM treo sổ 9 alt):");
  console.log(`MARKET_MAKER_TOKEN_NAMES=${mmNames}`);
  console.log(
    "\nMọi bot MM đã được cấp token base (xem MARKET_MAKER_BOT_EMAILS).",
  );
  console.log("Chạy tiếp: node scripts/ensure-bot-inventory.js && node scripts/ensure-demo-user-kc.js");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
