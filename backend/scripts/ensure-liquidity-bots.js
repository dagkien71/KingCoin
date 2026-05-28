/**
 * Tạo 10 bot / token (6 MM + 4 flow) — chỉ giao dịch token được gán.
 * node scripts/ensure-liquidity-bots.js
 */
const { PrismaClient } = require("@prisma/client");
const { ensureLiquidityBotUser } = require("./lib/create-liquidity-bot-user");
const {
  isLegacyBotPool,
  slotsForToken,
  BOTS_PER_TOKEN,
} = require("./lib/token-dedicated-bots");

const prisma = new PrismaClient();

function usernameFromEmail(email) {
  return email.split("@")[0]?.trim() || "bot";
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

async function main() {
  const mmPassword =
    process.env.MARKET_MAKER_PASSWORD ?? "mm-dev-change-me";
  const flowPassword =
    process.env.MARKET_FLOW_PASSWORD ?? "flow-dev-change-me";
  const kcMm = process.env.MARKET_MAKER_SEED_BALANCE;
  const kcFlow = process.env.MARKET_FLOW_KC_BALANCE ?? kcMm;

  if (isLegacyBotPool()) {
    const {
      mmLiquidityEmails,
      flowLiquidityEmails,
    } = require("./lib/liquidity-bot-emails");
    const mmEmails = mmLiquidityEmails();
    const flowEmails = flowLiquidityEmails();
    console.log(`Legacy MM (${mmEmails.length}): ${mmEmails.join(", ")}`);
    for (const email of mmEmails) {
      await ensureLiquidityBotUser(prisma, {
        email,
        username: usernameFromEmail(email),
        password: mmPassword,
        kcTarget: kcMm,
      });
    }
    console.log(`Legacy flow (${flowEmails.length})`);
    for (const email of flowEmails) {
      await ensureLiquidityBotUser(prisma, {
        email,
        username: usernameFromEmail(email),
        password: flowPassword,
        kcTarget: kcFlow,
      });
    }
    return;
  }

  const tokens = await listBaseTokens();
  console.log(
    `Dedicated pool: ${tokens.length} token × ${BOTS_PER_TOKEN} bot (6 MM + 4 flow)`,
  );

  for (const t of tokens) {
    const slots = slotsForToken(t.symbol);
    console.log(`\n=== ${t.symbol} (${t.name}) ===`);
    for (const s of slots) {
      const password = s.kind === "mm" ? mmPassword : flowPassword;
      const kc = s.kind === "mm" ? kcMm : kcFlow;
      const r = await ensureLiquidityBotUser(prisma, {
        email: s.email,
        username: usernameFromEmail(s.email),
        password,
        kcTarget: kc,
        baseTokenId: t.id,
      });
      console.log(
        `  [${s.kind}] ${s.email} — ${r.created ? "created" : "synced"}`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
