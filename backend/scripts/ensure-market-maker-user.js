/**
 * User market maker — KC + mọi token base để treo lệnh mua/bán.
 * Chạy: node scripts/ensure-market-maker-user.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { creditBotInventory } = require("./lib/credit-bot-inventory");

const prisma = new PrismaClient();
const ACCOUNT_TAG_LIQUIDITY_BOT = "liquidity_bot";

const EMAIL =
  process.env.MARKET_MAKER_EMAIL ?? "marketmaker@kingcoin.local";
const KC_BALANCE = Number(process.env.MARKET_MAKER_SEED_BALANCE ?? "500000000");
const QUOTE_TOKEN_NAME = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    const tags = Array.isArray(existing.accountTags) ? existing.accountTags : [];
    if (!tags.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) {
      await prisma.user.update({
        where: { email: EMAIL },
        data: { accountTags: [...tags, ACCOUNT_TAG_LIQUIDITY_BOT] },
      });
    }
    const r = await creditBotInventory(prisma, { email: EMAIL, kcTarget: KC_BALANCE });
    console.log(
      `Market maker đã tồn tại: ${EMAIL} — đã đồng bộ ví (KC + ${r.baseCredited ?? 0} token base)`,
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
    process.env.MARKET_MAKER_PASSWORD ?? "mm-dev-change-me",
    10,
  );

  await prisma.user.create({
    data: {
      email: EMAIL,
      password: hash,
      username: "marketmaker",
      accountTags: [ACCOUNT_TAG_LIQUIDITY_BOT],
      walletAddress: `0xMM${Math.random().toString(16).slice(2, 40)}`,
      socialLinks: [],
      balance: {
        create: {
          stableCoin: 0,
          tokens: {
            create: [
              {
                tokenId: quote.id,
                amount: KC_BALANCE,
              },
            ],
          },
        },
      },
    },
  });

  const r = await creditBotInventory(prisma, { email: EMAIL, kcTarget: KC_BALANCE });
  console.log(
    `Created MM user ${EMAIL} — KC=${KC_BALANCE}, base tokens topped: ${r.baseCredited ?? 0}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
