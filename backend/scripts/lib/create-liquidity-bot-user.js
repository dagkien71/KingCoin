const bcrypt = require("bcrypt");
const { creditBotInventory } = require("./credit-bot-inventory");
const { uniqueWalletCode } = require("./wallet-code");

const ACCOUNT_TAG_LIQUIDITY_BOT = "liquidity_bot";

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureLiquidityBotUser(
  prisma,
  { email, username, password, kcTarget, baseTokenId },
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const tags = Array.isArray(existing.accountTags) ? existing.accountTags : [];
    if (!tags.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) {
      await prisma.user.update({
        where: { email },
        data: { accountTags: [...tags, ACCOUNT_TAG_LIQUIDITY_BOT] },
      });
    }
    const r = await creditBotInventory(prisma, {
      email,
      kcTarget,
      baseTokenIdOnly: baseTokenId,
    });
    return { created: false, email, inventory: r };
  }

  const quoteName = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";
  const quote = await prisma.tokenCrypto.findFirst({
    where: { name: quoteName },
  });
  if (!quote?.id) {
    throw new Error(`Không tìm thấy token quote name="${quoteName}"`);
  }

  const kc = Number(kcTarget ?? process.env.MARKET_MAKER_SEED_BALANCE ?? "500000000");
  const hash = await bcrypt.hash(password, 10);
  const walletCode = await uniqueWalletCode(prisma);

  await prisma.user.create({
    data: {
      email,
      password: hash,
      username,
      walletCode,
      accountTags: [ACCOUNT_TAG_LIQUIDITY_BOT],
      walletAddress: `0xBOT${Math.random().toString(16).slice(2, 38)}`,
      socialLinks: [],
      balance: {
        create: {
          stableCoin: 0,
          tokens: {
            create: [{ tokenId: quote.id, amount: kc }],
          },
        },
      },
    },
  });

  const r = await creditBotInventory(prisma, {
    email,
    kcTarget: kc,
    baseTokenIdOnly: baseTokenId,
  });
  return { created: true, email, inventory: r };
}

module.exports = { ensureLiquidityBotUser };
