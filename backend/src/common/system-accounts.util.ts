import {
  isLiquidityBotUsername,
  liquidityBotEmails,
} from '@modules/market-maker/liquidity-bots.util';

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

/** User thật (trader) — loại bot khỏi thống kê admin. */
export function isTraderAccountEmail(
  email: string | null | undefined,
  username?: string | null,
  accountTags?: string[] | null,
): boolean {
  return !isLiquidityBotEmail(email, username, accountTags);
}
