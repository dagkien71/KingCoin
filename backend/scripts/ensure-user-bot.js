/**
 * Tạo / top-up user-bot: đặt lệnh market để khớp với MM.
 * Chạy: node scripts/ensure-user-bot.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { creditBotInventory } = require("./lib/credit-bot-inventory");
const { uniqueWalletCode } = require("./lib/wallet-code");

const prisma = new PrismaClient();

const ACCOUNT_TAG_LIQUIDITY_BOT = "liquidity_bot";

const EMAIL = process.env.USER_BOT_EMAIL ?? "user-bot@kingcoin.local";
const PASSWORD = process.env.USER_BOT_PASSWORD ?? "user-bot-dev-change-me";
const USERNAME = process.env.USER_BOT_USERNAME ?? "user-bot";
const KC_BALANCE = Number(process.env.USER_BOT_KC_BALANCE ?? "500000000");

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
      `User-bot đã tồn tại: ${EMAIL} — đã đồng bộ ví (KC + ${r.baseCredited ?? 0} token base)`,
    );
    return;
  }

  const quoteName = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";
  const quote = await prisma.tokenCrypto.findFirst({ where: { name: quoteName } });
  if (!quote?.id) {
    throw new Error(`Không tìm thấy token quote name="${quoteName}"`);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const walletCode = await uniqueWalletCode(prisma);

  await prisma.user.create({
    data: {
      email: EMAIL,
      password: hash,
      username: USERNAME,
      walletCode,
      accountTags: [ACCOUNT_TAG_LIQUIDITY_BOT],
      walletAddress: `0xUBOT${Math.random().toString(16).slice(2, 38)}`,
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
    `Created user-bot ${EMAIL} — KC=${KC_BALANCE}, base topped: ${r.baseCredited ?? 0}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

