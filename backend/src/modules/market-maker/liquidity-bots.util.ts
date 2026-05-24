/**
 * Tài khoản bot thanh khoản — mọi MM phải nắm giữ từng token base khi niêm yết.
 * @see docs/MARKET_MAKER.md — Kho bot & token mới
 */
export function liquidityBotEmails(): string[] {
  const bulk = process.env.MARKET_MAKER_BOT_EMAILS?.trim();
  if (bulk) {
    return [
      ...new Set(
        bulk
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      ),
    ];
  }
  const emails = [
    process.env.MARKET_MAKER_EMAIL?.trim(),
    process.env.MARKET_FLOW_EMAIL?.trim(),
  ].filter((e): e is string => !!e);
  if (emails.length > 0) {
    return [...new Set(emails)];
  }
  return ['marketmaker@kingcoin.local', 'flow@kingcoin.local'];
}
