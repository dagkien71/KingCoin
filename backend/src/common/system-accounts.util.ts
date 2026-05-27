import {
  isLiquidityBotUsername,
  liquidityBotEmails,
} from '@modules/market-maker/liquidity-bots.util';
import { Prisma, Roles } from '@prisma/client';

/** Tag API admin — bot thanh khoản (MM + flow). */
export const ACCOUNT_TAG_LIQUIDITY_BOT = 'liquidity_bot' as const;

export type UserAccountTag = typeof ACCOUNT_TAG_LIQUIDITY_BOT;

export function isLiquidityBotEmail(
  email: string | null | undefined,
  username?: string | null,
  accountTags?: string[] | null,
): boolean {
  if (accountTags?.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) return true;
  if (isLiquidityBotUsername(username)) return true;
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return liquidityBotEmails().some((e) => e.toLowerCase() === normalized);
}

export function resolveUserAccountTags(
  email: string | null | undefined,
  username?: string | null,
  accountTags?: string[] | null,
): UserAccountTag[] {
  if (isLiquidityBotEmail(email, username, accountTags)) {
    return [ACCOUNT_TAG_LIQUIDITY_BOT];
  }
  return [];
}

/** Email loại trừ khỏi danh sách / thống kê user admin. */
export function liquidityBotEmailsForFilter(): string[] {
  return liquidityBotEmails();
}

/** Username bot (mm1, flow2, …) — lọc Prisma `notIn`. */
export function liquidityBotUsernamesForFilter(): string[] {
  const names = ['marketmaker', 'flowtrader', 'flow'];
  for (let i = 1; i <= 32; i++) {
    names.push(`mm${i}`, `flow${i}`);
  }
  return names;
}

/** User thật admin: role `user`, có SĐT, `accountTags` rỗng, không bot. */
export function isTraderUserRecord(user: {
  role?: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  accountTags?: string[] | null;
}): boolean {
  if (user.role !== Roles.user) return false;
  if (!(user.phone ?? '').trim()) return false;
  if ((user.accountTags ?? []).length > 0) return false;
  return !isLiquidityBotEmail(user.email, user.username, user.accountTags);
}

/**
 * Prisma (bước 1): role user + phone + loại email/username bot.
 * Bước 2: `findTradersAdmin` + `isTraderUserRecord` (accountTags rỗng).
 */
export function traderUsersWhere(
  extra?: Prisma.UserWhereInput,
): Prisma.UserWhereInput {
  const botEmails = liquidityBotEmailsForFilter();
  const botUsernames = liquidityBotUsernamesForFilter();
  return {
    AND: [
      ...(extra ? [extra] : []),
      { role: Roles.user },
      { phone: { not: null } },
      { NOT: { phone: '' } },
      { email: { notIn: botEmails } },
      {
        OR: [
          { username: null },
          {
            username: {
              notIn: botUsernames,
              mode: 'insensitive',
            },
          },
        ],
      },
    ],
  };
}

/** Chỉ bot thanh khoản. */
export function liquidityBotUsersWhere(
  extra?: Prisma.UserWhereInput,
): Prisma.UserWhereInput {
  const botEmails = liquidityBotEmailsForFilter();
  return {
    AND: [
      ...(extra ? [extra] : []),
      {
        OR: [
          { email: { in: botEmails } },
          { accountTags: { has: ACCOUNT_TAG_LIQUIDITY_BOT } },
        ],
      },
    ],
  };
}

/** Loại bot theo email/username/tag (không kiểm tra phone/role). */
export function isTraderAccountEmail(
  email: string | null | undefined,
  username?: string | null,
  accountTags?: string[] | null,
): boolean {
  if ((accountTags ?? []).length > 0) return false;
  return !isLiquidityBotEmail(email, username, accountTags);
}
