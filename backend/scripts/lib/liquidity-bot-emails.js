/**
 * Danh sách tài khoản bot thanh khoản (MM + flow + bot bổ sung).
 * Mỗi bot phải giữ mọi token base (trừ quote KC) để treo lệnh bán / khớp mua.
 *
 * Env:
 *   MARKET_MAKER_BOT_EMAILS=mm1@...,mm2@...,flow@...  (ưu tiên — danh sách đầy đủ)
 *   Hoặc mặc định: MARKET_MAKER_EMAIL + MARKET_FLOW_EMAIL
 */
function liquidityBotEmails() {
  const bulk = process.env.MARKET_MAKER_BOT_EMAILS?.trim();
  if (bulk) {
    return [
      ...new Set(
        bulk
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      ),
    ];
  }
  const emails = [
    process.env.MARKET_MAKER_EMAIL?.trim(),
    process.env.MARKET_FLOW_EMAIL?.trim(),
  ].filter(Boolean);
  if (emails.length > 0) {
    return [...new Set(emails)];
  }
  return ["marketmaker@kingcoin.local", "flow@kingcoin.local"];
}

module.exports = { liquidityBotEmails };
