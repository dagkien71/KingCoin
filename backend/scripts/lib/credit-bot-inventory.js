/**
 * Cấp KC + mọi token base (trừ quote) cho bot MM / flow để treo lệnh bán được.
 */
const QUOTE_TOKEN_NAME = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";

async function getQuoteToken(prisma) {
  return prisma.tokenCrypto.findFirst({
    where: { name: QUOTE_TOKEN_NAME },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ email: string, kcTarget?: number, basePerToken?: number, baseTokenIdOnly?: string }} opts
 */
async function creditBotInventory(prisma, opts) {
  const { email, kcTarget, basePerToken, baseTokenIdOnly } = opts;
  const kcMin = Number(kcTarget ?? process.env.MARKET_MAKER_SEED_BALANCE ?? "500000000");
  const baseMin = Number(
    basePerToken ?? process.env.MARKET_MAKER_BASE_BALANCE ?? "5000000",
  );

  const user = await prisma.user.findUnique({
    where: { email },
    include: { balance: { include: { tokens: true } } },
  });
  if (!user) {
    return { ok: false, reason: `user_not_found:${email}` };
  }

  let balance = user.balance;
  if (!balance) {
    balance = await prisma.balance.create({
      data: { userId: user.id, stableCoin: 0 },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { balanceId: balance.id },
    });
  }

  const quote = await getQuoteToken(prisma);
  const quoteId = quote?.id ?? null;

  const allTokens = baseTokenIdOnly
    ? await prisma.tokenCrypto.findMany({
        where: { id: baseTokenIdOnly },
        select: { id: true, name: true, symbol: true },
      })
    : await prisma.tokenCrypto.findMany({
        select: { id: true, name: true, symbol: true },
      });

  let kcCredited = 0;
  let baseCredited = 0;

  if (quoteId && kcMin > 0) {
    const row = await prisma.balanceToken.findFirst({
      where: { balanceId: balance.id, tokenId: quoteId },
    });
    const current = row?.amount ?? 0;
    if (current < kcMin) {
      const next = kcMin;
      if (row) {
        await prisma.balanceToken.update({
          where: { id: row.id },
          data: { amount: next },
        });
      } else {
        await prisma.balanceToken.create({
          data: { balanceId: balance.id, tokenId: quoteId, amount: next },
        });
      }
      kcCredited++;
    }
  }

  for (const token of allTokens) {
    if (quoteId && token.id === quoteId) continue;
    const row = await prisma.balanceToken.findFirst({
      where: { balanceId: balance.id, tokenId: token.id },
    });
    const current = row?.amount ?? 0;
    if (current < baseMin) {
      const next = baseMin;
      if (row) {
        await prisma.balanceToken.update({
          where: { id: row.id },
          data: { amount: next },
        });
      } else {
        await prisma.balanceToken.create({
          data: { balanceId: balance.id, tokenId: token.id, amount: next },
        });
      }
      baseCredited++;
    }
  }

  return {
    ok: true,
    email,
    kcCredited,
    baseCredited,
    baseMin,
    tokenCount: allTokens.filter((t) => t.id !== quoteId).length,
  };
}

module.exports = { creditBotInventory, getQuoteToken };
