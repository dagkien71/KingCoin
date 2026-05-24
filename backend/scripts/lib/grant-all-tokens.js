/**
 * Đảm bảo mỗi user có Balance và mọi TokenCrypto trong BalanceToken.
 */
const QUOTE_TOKEN_NAME = process.env.QUOTE_TOKEN_NAME ?? "KingCoin";

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ kcAmount?: number, altAmount?: number, onlyBelow?: boolean }} [opts]
 */
async function grantAllTokensToAllUsers(prisma, opts = {}) {
  const kcTarget = Number(
    opts.kcAmount ?? process.env.GRANT_KC_AMOUNT ?? "100000",
  );
  const altTarget = Number(
    opts.altAmount ?? process.env.GRANT_ALT_AMOUNT ?? "10000",
  );
  const onlyBelow = opts.onlyBelow !== false;

  if (!Number.isFinite(kcTarget) || kcTarget < 0) {
    throw new Error(`GRANT_KC_AMOUNT không hợp lệ: ${opts.kcAmount}`);
  }
  if (!Number.isFinite(altTarget) || altTarget < 0) {
    throw new Error(`GRANT_ALT_AMOUNT không hợp lệ: ${opts.altAmount}`);
  }

  const quote = await prisma.tokenCrypto.findFirst({
    where: { name: QUOTE_TOKEN_NAME },
    select: { id: true, name: true, symbol: true },
  });
  const quoteId = quote?.id ?? null;

  const tokens = await prisma.tokenCrypto.findMany({
    select: { id: true, name: true, symbol: true, tokenKind: true },
    orderBy: { symbol: "asc" },
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      balanceId: true,
      balance: { include: { tokens: true } },
    },
    orderBy: { email: "asc" },
  });

  const summary = {
    userCount: users.length,
    tokenCount: tokens.length,
    balancesCreated: 0,
    rowsCreated: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    perUser: [],
  };

  for (const user of users) {
    let balance = user.balance;
    if (!balance) {
      balance = await prisma.balance.create({
        data: { userId: user.id, stableCoin: 0 },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { balanceId: balance.id },
      });
      summary.balancesCreated++;
    }

    const userStats = {
      email: user.email,
      role: user.role,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const token of tokens) {
      const target =
        quoteId && token.id === quoteId ? kcTarget : altTarget;

      const row = await prisma.balanceToken.findFirst({
        where: { balanceId: balance.id, tokenId: token.id },
      });
      const current = row?.amount ?? 0;

      if (onlyBelow && current >= target - 1e-9) {
        userStats.skipped++;
        summary.rowsSkipped++;
        continue;
      }

      const next = onlyBelow ? Math.max(current, target) : target;

      if (row) {
        await prisma.balanceToken.update({
          where: { id: row.id },
          data: { amount: next },
        });
        userStats.updated++;
        summary.rowsUpdated++;
      } else {
        await prisma.balanceToken.create({
          data: {
            balanceId: balance.id,
            tokenId: token.id,
            amount: next,
          },
        });
        userStats.created++;
        summary.rowsCreated++;
      }
    }

    summary.perUser.push(userStats);
  }

  return { summary, quote, tokens };
}

module.exports = { grantAllTokensToAllUsers, QUOTE_TOKEN_NAME };
