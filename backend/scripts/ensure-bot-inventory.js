/**
 * Top-up KC + token base cho MM và flow (chạy sau seed / khi thêm token mới).
 * node scripts/ensure-bot-inventory.js
 */
const { PrismaClient } = require("@prisma/client");
const { creditBotInventory } = require("./lib/credit-bot-inventory");
const { liquidityBotEmails } = require("./lib/liquidity-bot-emails");
const { isLegacyBotPool, slotsForToken } = require("./lib/token-dedicated-bots");

const prisma = new PrismaClient();

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
  if (isLegacyBotPool()) {
    return liquidityBotEmails().map((email) => ({ email, baseTokenId: undefined }));
  }
  const tokens = await listBaseTokens();
  const targets = [];
  for (const t of tokens) {
    for (const s of slotsForToken(t.symbol)) {
      targets.push({ email: s.email, baseTokenId: t.id });
    }
  }
  return targets;
}

async function main() {
  const targets = await listBotTargets();
  const mode = isLegacyBotPool() ? "legacy" : "dedicated";
  console.log(`Bot thanh khoản (${mode}, ${targets.length} email)`);

  for (const { email, baseTokenId } of targets) {
    const r = await creditBotInventory(prisma, {
      email,
      baseTokenIdOnly: baseTokenId,
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
