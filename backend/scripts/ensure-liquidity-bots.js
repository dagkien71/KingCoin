/**
 * Tạo / top-up mọi bot MM + flow theo env (MARKET_MAKER_BOT_COUNT, MARKET_FLOW_BOT_COUNT, …).
 * node scripts/ensure-liquidity-bots.js
 */
const { PrismaClient } = require("@prisma/client");
const { ensureLiquidityBotUser } = require("./lib/create-liquidity-bot-user");
const {
  mmLiquidityEmails,
  flowLiquidityEmails,
} = require("./lib/liquidity-bot-emails");

const prisma = new PrismaClient();

function usernameFromEmail(email, fallback) {
  const local = email.split("@")[0]?.trim();
  return local || fallback;
}

async function main() {
  const mmEmails = mmLiquidityEmails();
  const flowEmails = flowLiquidityEmails();
  const mmPassword =
    process.env.MARKET_MAKER_PASSWORD ?? "mm-dev-change-me";
  const flowPassword =
    process.env.MARKET_FLOW_PASSWORD ?? "flow-dev-change-me";
  const kcMm = process.env.MARKET_MAKER_SEED_BALANCE;
  const kcFlow = process.env.MARKET_FLOW_KC_BALANCE ?? kcMm;

  console.log(`MM bots (${mmEmails.length}): ${mmEmails.join(", ")}`);
  for (const email of mmEmails) {
    const r = await ensureLiquidityBotUser(prisma, {
      email,
      username: usernameFromEmail(email, "marketmaker"),
      password: mmPassword,
      kcTarget: kcMm,
    });
    console.log(
      `${r.created ? "Created" : "Synced"} ${email} — base topped=${r.inventory?.baseCredited ?? 0}`,
    );
  }

  console.log(`Flow bots (${flowEmails.length}): ${flowEmails.join(", ")}`);
  for (const email of flowEmails) {
    const r = await ensureLiquidityBotUser(prisma, {
      email,
      username: usernameFromEmail(email, "flowtrader"),
      password: flowPassword,
      kcTarget: kcFlow,
    });
    console.log(
      `${r.created ? "Created" : "Synced"} ${email} — base topped=${r.inventory?.baseCredited ?? 0}`,
    );
  }

  console.log(
    "\nGợi ý production (Render): MARKET_MAKER_ENABLED=true, MARKET_MAKER_BOT_COUNT=12, MARKET_FLOW_BOT_COUNT=4",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
