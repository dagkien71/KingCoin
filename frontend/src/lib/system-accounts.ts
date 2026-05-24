/** Đồng bộ backend `@common/system-accounts.util` / `liquidityBotEmails()`. */
export const ACCOUNT_TAG_LIQUIDITY_BOT = "liquidity_bot" as const;

export type AccountTag = typeof ACCOUNT_TAG_LIQUIDITY_BOT;

const DEFAULT_BOT_EMAILS = [
  "marketmaker@kingcoin.local",
  "flow@kingcoin.local",
];

export const ACCOUNT_TAG_LABELS: Record<AccountTag, string> = {
  liquidity_bot: "Bot MM",
};

const BOT_USERNAMES = new Set(["marketmaker", "flowtrader"]);

export function isLiquidityBotUser(user: {
  email?: string | null;
  username?: string | null;
  accountTags?: string[] | null;
}): boolean {
  if (user.accountTags?.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) return true;
  const un = (user.username ?? "").trim().toLowerCase();
  if (un && BOT_USERNAMES.has(un)) return true;
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return false;
  return DEFAULT_BOT_EMAILS.some((e) => e === email);
}

export function isTraderUser(user: {
  email?: string | null;
  username?: string | null;
  accountTags?: string[] | null;
}): boolean {
  return !isLiquidityBotUser(user);
}

export function accountTagLabel(tag: string): string {
  if (tag === ACCOUNT_TAG_LIQUIDITY_BOT) return ACCOUNT_TAG_LABELS.liquidity_bot;
  return tag;
}
