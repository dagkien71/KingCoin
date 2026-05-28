/**
 * Top-up KC + token base cho MM và flow (chạy sau seed / khi thêm token mới).
 * node scripts/ensure-bot-inventory.js
 */
const { PrismaClient } = require("@prisma/client");
const { creditBotInventory } = require("./lib/credit-bot-inventory");
const { liquidityBotEmails } = require("./lib/liquidity-bot-emails");
const {
  isLegacyBotPool,
  slotsForToken,
} = require("./lib/token-dedicated-bots");

const prisma = new PrismaClient();

function isDedicatedBotEmail(email) {
  const e = String(email ?? "").trim().toLowerCase();
  return /^bot-[a-z0-9]+-\d+@kingcoin\.local$/.test(e);
}

async function listAllLiquidityBotEmails() {
  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { accountTags: { has: "liquidity_bot" } },
        // legacy bots from hard-coded email list
        { email: { in: liquidityBotEmails() } },
      ],
    },
    select: { email: true },
  });
  const fromDb = rows.map((r) => r.email).filter(Boolean);

  // Dedicated pool bots may not have tags yet in some environments;
  // also include any existing dedicated-bot emails in DB.
  const dedicatedRows = await prisma.user.findMany({
    where: { email: { endsWith: "@kingcoin.local" } },
    select: { email: true },
  });
  const fromDedicated = dedicatedRows
    .map((r) => r.email)
    .filter((e) => e && isDedicatedBotEmail(e));

  return [...new Set([...liquidityBotEmails(), ...fromDb, ...fromDedicated])];
}

async function listBaseTokens() {
  const quoteName = process.env.QUOTE_TOKEN_NAME?.trim() || "KingCoin";
  const tokens = await prisma.tokenCrypto.findMany({
    where: { status: "active" },
    select: { id: true, name: true, symbol: true, tokenKind: true },
    orderBy: { rank: "asc" },
  });
  return tokens.filter(
    (t) =>
      t.symbol &&
      t.name !== quoteName &&
      t.tokenKind !== "stablecoin",
  );
}

async function listBotTargets() {
  // User request: every bot must have every token.
  // So we top-up all liquidity bot users and do NOT restrict to a single base token.
  const emails = await listAllLiquidityBotEmails();
  if (emails.length > 0) return emails.map((email) => ({ email }));

  if (isLegacyBotPool()) {
    return liquidityBotEmails().map((email) => ({ email }));
  }
  const tokens = await listBaseTokens();
  const targets = [];
  for (const t of tokens) {
    for (const s of slotsForToken(t.symbol)) {
      targets.push({ email: s.email });
    }
  }
  return targets;
}

async function main() {
  const targets = await listBotTargets();
  const mode = isLegacyBotPool() ? "legacy" : "dedicated";
  console.log(`Bot thanh khoản (${mode}, ${targets.length} email)`);

  for (const { email } of targets) {
    const r = await creditBotInventory(prisma, {
      email,
    });
    if (!r.ok) {
      console.warn(`Skip ${email}: ${r.reason}`);
      continue;
    }
    console.log(
      `${email}: KC rows=${r.kcCredited}, base topped=${r.baseCredited}/${r.tokenCount} tokens (min ${r.baseMin} each)`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
