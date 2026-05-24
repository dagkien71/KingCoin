/**
 * Top-up KC + token base cho MM và flow (chạy sau seed / khi thêm token mới).
 * node scripts/ensure-bot-inventory.js
 */
const { PrismaClient } = require("@prisma/client");
const { creditBotInventory } = require("./lib/credit-bot-inventory");
const { liquidityBotEmails } = require("./lib/liquidity-bot-emails");

const prisma = new PrismaClient();

async function main() {
  const BOTS = liquidityBotEmails();
  console.log(`Bot thanh khoản (${BOTS.length}): ${BOTS.join(", ")}`);
  for (const email of BOTS) {
    const r = await creditBotInventory(prisma, { email });
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
