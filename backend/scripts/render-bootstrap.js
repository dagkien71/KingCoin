/**
 * Chạy lúc start trên Render: push schema + seed tối thiểu nếu DB trống.
 */
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const DEFAULT_DB_NAME = process.env.DATABASE_NAME || "kingcoin";

/** Prisma Mongo bắt buộc có tên DB trong URI — Atlas hay trả về ...mongodb.net/?appName=... */
function normalizeMongoDatabaseUrl(url) {
  if (!url || typeof url !== "string") return url;

  const dbName = DEFAULT_DB_NAME;
  const withoutQuery = url.split("?")[0];
  const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";

  // Đã có path sau host, vd .../kingcoin hoặc .../kingcoin/
  if (/^mongodb(?:\+srv)?:\/\/[^/]+\/[^/?]+/.test(url)) {
    return url;
  }

  const hostBase = withoutQuery.replace(/\/$/, "");
  const normalized = `${hostBase}/${dbName}${query}`;
  console.warn(
    `[bootstrap] DATABASE_URL thiếu tên DB — tự thêm /${dbName}. Nên sửa env trên Render cho đúng.`,
  );
  return normalized;
}

function applyDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.warn("[bootstrap] DATABASE_URL chưa set — bỏ qua db push/seed");
    return false;
  }
  process.env.DATABASE_URL = normalizeMongoDatabaseUrl(raw);
  return true;
}

function run(cmd) {
  console.log(`\n[bootstrap] ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: "/app", env: process.env });
}

function runSafe(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[bootstrap] ${label} failed (API vẫn start):`, err?.message || err);
  }
}

async function main() {
  if (!applyDatabaseUrl()) return;

  runSafe("prisma db push", () => {
    run("npx prisma@6.2.1 db push --skip-generate");
  });

  const prisma = new PrismaClient();
  try {
    let tokenCount = -1;
    try {
      tokenCount = await prisma.tokenCrypto.count();
      console.log(`[bootstrap] tokenCrypto count = ${tokenCount}`);
    } catch (err) {
      console.error("[bootstrap] không đọc được DB:", err?.message || err);
      return;
    }

    if (tokenCount === 0) {
      runSafe("reset-seed", () => run("node scripts/reset-seed-10-tokens.js"));
      runSafe("market-maker", () => run("node scripts/ensure-market-maker-user.js"));
      runSafe("flow-trader", () => run("node scripts/ensure-flow-trader-user.js"));
      runSafe("bot-inventory", () => run("node scripts/ensure-bot-inventory.js"));
      runSafe("demo-kc", () => run("node scripts/ensure-demo-user-kc.js"));
    } else {
      runSafe("kingcoin", () => run("node scripts/ensure-kingcoin-token.js"));
      runSafe("market-maker", () => run("node scripts/ensure-market-maker-user.js"));
      runSafe("flow-trader", () => run("node scripts/ensure-flow-trader-user.js"));
      runSafe("bot-inventory", () => run("node scripts/ensure-bot-inventory.js"));
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[bootstrap] done\n");
}

main().catch((err) => {
  console.error("[bootstrap] failed (API vẫn start):", err?.message || err);
});
