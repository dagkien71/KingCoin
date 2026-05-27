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

function isLiquidityBotUsername(username: string | null | undefined): boolean {
  const u = (username ?? "").trim().toLowerCase();
  if (!u) return false;
  if (u === "marketmaker" || u === "flowtrader" || u === "flow") return true;
  return /^mm\d+$/.test(u) || /^flow\d+$/.test(u);
}

export function isLiquidityBotUser(user: {
  email?: string | null;
  username?: string | null;
  accountTags?: string[] | null;
}): boolean {
  if (user.accountTags?.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) return true;
  if (isLiquidityBotUsername(user.username)) return true;
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return false;
  return DEFAULT_BOT_EMAILS.some((e) => e === email);
}

export function isTraderUser(user: {
  role?: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  accountTags?: string[] | null;
}): boolean {
  if (user.role && user.role !== "user") return false;
  if (!(user.phone ?? "").trim()) return false;
  if ((user.accountTags ?? []).length > 0) return false;
  return !isLiquidityBotUser(user);
}

export function accountTagLabel(tag: string): string {
  if (tag === ACCOUNT_TAG_LIQUIDITY_BOT) return ACCOUNT_TAG_LABELS.liquidity_bot;
  return tag;
}
