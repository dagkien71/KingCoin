import { badRequest } from '@common/errors/app-error.util';
import { INSUFFICIENT_KC } from '@constants/errors.constants';
import { Prisma, WalletPool } from '@prisma/client';

type BalanceWithTokens = Prisma.BalanceGetPayload<{
  include: { tokens: true };
}>;

export function spotKcFromBalance(
  balance: BalanceWithTokens,
  quoteId: string | null,
): number {
  const stable = balance.stableCoin ?? 0;
  if (!quoteId || !balance.tokens?.length) return stable;
  const hit = balance.tokens.find((t) => t.tokenId === quoteId);
  return stable + (hit?.amount ?? 0);
}

/** Đọc số KC khả dụng một ví trong transaction (sau các lần mutate trước đó). */
export function poolKcFromBalance(
  balance: BalanceWithTokens,
  quoteId: string | null,
  pool: WalletPool,
): number {
  if (pool === WalletPool.spot) {
    return spotKcFromBalance(balance, quoteId);
  }
  if (pool === WalletPool.futures) {
    return balance.futuresKc ?? 0;
  }
  return balance.fundingKc ?? 0;
}

/**
 * Cộng/trừ KC một ví — cập nhật object balance trong memory để gọi liên tiếp trong cùng tx.
 */
export async function applyPoolDeltaInTx(
  tx: Prisma.TransactionClient,
  balance: BalanceWithTokens,
  quoteId: string | null,
  pool: WalletPool,
  delta: number,
): Promise<void> {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1e-12) return;

  if (pool === WalletPool.futures) {
    const next = (balance.futuresKc ?? 0) + delta;
    if (next < -1e-9) throw badRequest(INSUFFICIENT_KC);
    await tx.balance.update({
      where: { id: balance.id },
      data: { futuresKc: next },
    });
    balance.futuresKc = next;
    return;
  }

  if (pool === WalletPool.funding) {
    const next = (balance.fundingKc ?? 0) + delta;
    if (next < -1e-9) throw badRequest(INSUFFICIENT_KC);
    await tx.balance.update({
      where: { id: balance.id },
      data: { fundingKc: next },
    });
    balance.fundingKc = next;
    return;
  }

  // Spot: stableCoin trước, rồi BalanceToken quote
  if (delta >= 0) {
    if (!quoteId) {
      const next = (balance.stableCoin ?? 0) + delta;
      await tx.balance.update({
        where: { id: balance.id },
        data: { stableCoin: next },
      });
      balance.stableCoin = next;
      return;
    }
    const row = balance.tokens.find((t) => t.tokenId === quoteId);
    if (row) {
      const next = row.amount + delta;
      await tx.balanceToken.update({
        where: { id: row.id },
        data: { amount: next },
      });
      row.amount = next;
    } else {
      const created = await tx.balanceToken.create({
        data: {
          balanceId: balance.id,
          tokenId: quoteId,
          amount: delta,
        },
      });
      balance.tokens.push(created);
    }
    return;
  }

  const need = -delta;
  const fromToken = quoteId
    ? (balance.tokens.find((t) => t.tokenId === quoteId)?.amount ?? 0)
    : 0;
  const fromStable = balance.stableCoin ?? 0;
  if (fromToken + fromStable < need - 1e-9) {
    throw badRequest(INSUFFICIENT_KC);
  }
  const takeToken = Math.min(fromToken, need);
  const takeStable = need - takeToken;

  if (takeToken > 1e-12 && quoteId) {
    const row = balance.tokens.find((t) => t.tokenId === quoteId)!;
    const next = row.amount - takeToken;
    await tx.balanceToken.update({
      where: { id: row.id },
      data: { amount: next },
    });
    row.amount = next;
  }
  if (takeStable > 1e-12) {
    const next = fromStable - takeStable;
    await tx.balance.update({
      where: { id: balance.id },
      data: { stableCoin: next },
    });
    balance.stableCoin = next;
  }
}

export async function loadBalanceInTx(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<BalanceWithTokens> {
  let balance = await tx.balance.findUnique({
    where: { userId },
    include: { tokens: true },
  });
  if (!balance) {
    balance = await tx.balance.create({
      data: { userId, stableCoin: 0, futuresKc: 0, fundingKc: 0 },
      include: { tokens: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { balanceId: balance.id },
    });
  }
  return balance;
}

/** Chuyển KC giữa hai ví cùng user — atomic, kiểm tra đủ số dư trước khi trừ. */
export async function atomicInternalWalletTransfer(
  tx: Prisma.TransactionClient,
  userId: string,
  quoteId: string | null,
  fromWallet: WalletPool,
  toWallet: WalletPool,
  amount: number,
): Promise<void> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw badRequest('Số tiền chuyển không hợp lệ.');
  }
  const balance = await loadBalanceInTx(tx, userId);
  const available = poolKcFromBalance(balance, quoteId, fromWallet);
  if (available < amount - 1e-9) {
    throw badRequest(
      `Không đủ KC trong ví nguồn. Cần ${amount.toFixed(4)} KC, có ${available.toFixed(4)} KC.`,
    );
  }
  await applyPoolDeltaInTx(tx, balance, quoteId, fromWallet, -amount);
  await applyPoolDeltaInTx(tx, balance, quoteId, toWallet, amount);
}

/** Chuyển KC giữa hai user — atomic. */
export async function atomicUserWalletTransfer(
  tx: Prisma.TransactionClient,
  quoteId: string | null,
  fromUserId: string,
  toUserId: string,
  fromWallet: WalletPool,
  toWallet: WalletPool,
  amount: number,
): Promise<void> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw badRequest('Số tiền chuyển không hợp lệ.');
  }
  const fromBal = await loadBalanceInTx(tx, fromUserId);
  const available = poolKcFromBalance(fromBal, quoteId, fromWallet);
  if (available < amount - 1e-9) {
    throw badRequest(
      `Không đủ KC trong ví nguồn. Cần ${amount.toFixed(4)} KC, có ${available.toFixed(4)} KC.`,
    );
  }
  const toBal = await loadBalanceInTx(tx, toUserId);
  await applyPoolDeltaInTx(tx, fromBal, quoteId, fromWallet, -amount);
  await applyPoolDeltaInTx(tx, toBal, quoteId, toWallet, amount);
}
