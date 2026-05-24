/**
 * User taker mô phỏng: KC + mọi token base để khớp hai chiều với MM.
 * Chạy: node scripts/ensure-flow-trader-user.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { creditBotInventory } = require("./lib/credit-bot-inventory");

const prisma = new PrismaClient();

const EMAIL = process.env.MARKET_FLOW_EMAIL ?? "flow@kingcoin.local";
const KC_BALANCE = Number(process.env.MARKET_FLOW_KC_BALANCE ?? "500000000");
const QUOTE_TOKEN_NAME = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    const r = await creditBotInventory(prisma, { email: EMAIL, kcTarget: KC_BALANCE });
    console.log(
      `Flow user đã tồn tại: ${EMAIL} — đã đồng bộ ví (KC + ${r.baseCredited ?? 0} token base)`,
    );
    return;
  }

  const quote = await prisma.tokenCrypto.findFirst({
    where: { name: QUOTE_TOKEN_NAME },
  });
  if (!quote?.id) {
    console.error(`Không tìm thấy token quote name="${QUOTE_TOKEN_NAME}"`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(
    process.env.MARKET_FLOW_PASSWORD ?? "flow-dev-change-me",
    10,
  );

  await prisma.user.create({
    data: {
      email: EMAIL,
      password: hash,
      username: "flowtrader",
      walletAddress: `0xFL${Math.random().toString(16).slice(2, 40)}`,
      socialLinks: [],
      balance: {
        create: {
          stableCoin: 0,
          tokens: {
            create: [{ tokenId: quote.id, amount: KC_BALANCE }],
          },
        },
      },
    },
  });

  const r = await creditBotInventory(prisma, { email: EMAIL, kcTarget: KC_BALANCE });
  console.log(
    `Created flow user ${EMAIL} — KC=${KC_BALANCE}, base tokens topped: ${r.baseCredited ?? 0}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
