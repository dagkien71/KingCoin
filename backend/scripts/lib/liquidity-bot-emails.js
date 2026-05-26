/**
 * Đồng bộ logic với `src/modules/market-maker/liquidity-bots.util.ts`
 */
function parseEmailList(raw) {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
    ),
  ];
}

function clampInt(raw, fallback, max) {
  const n = Number(raw ?? String(fallback));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function mmBotCountFromEnv() {
  if (!process.env.MARKET_MAKER_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === "production") return 12;
    return 1;
  }
  return clampInt(process.env.MARKET_MAKER_BOT_COUNT, 1, 32);
}

function flowBotCountFromEnv() {
  if (!process.env.MARKET_FLOW_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === "production") return 4;
    return 1;
  }
  return clampInt(process.env.MARKET_FLOW_BOT_COUNT, 1, 16);
}

function buildDefaultMmEmails(count) {
  const primary =
    process.env.MARKET_MAKER_EMAIL?.trim() || "marketmaker@kingcoin.local";
  if (count <= 1) return [primary];
  return Array.from({ length: count }, (_, i) => `mm${i + 1}@kingcoin.local`);
}

function buildDefaultFlowEmails(count) {
  const primary = process.env.MARKET_FLOW_EMAIL?.trim() || "flow@kingcoin.local";
  if (count <= 1) return [primary];
  return Array.from({ length: count }, (_, i) => `flow${i + 1}@kingcoin.local`);
}

function mmLiquidityEmails() {
  const bulk = parseEmailList(process.env.MARKET_MAKER_BOT_EMAILS);
  if (bulk.length > 0) {
    const flowSet = new Set(flowLiquidityEmails().map((e) => e.toLowerCase()));
    return bulk.filter((e) => !flowSet.has(e.toLowerCase()));
  }
  const useMultiMm =
    !!process.env.MARKET_MAKER_BOT_COUNT?.trim() ||
    process.env.NODE_ENV === "production";
  if (useMultiMm && mmBotCountFromEnv() > 1) {
    return buildDefaultMmEmails(mmBotCountFromEnv());
  }
  const primary =
    process.env.MARKET_MAKER_EMAIL?.trim() || "marketmaker@kingcoin.local";
  return [primary];
}

function flowLiquidityEmails() {
  const bulk = parseEmailList(process.env.MARKET_FLOW_BOT_EMAILS);
  if (bulk.length > 0) return bulk;
  const useMultiFlow =
    !!process.env.MARKET_FLOW_BOT_COUNT?.trim() ||
    process.env.NODE_ENV === "production";
  if (useMultiFlow && flowBotCountFromEnv() > 1) {
    return buildDefaultFlowEmails(flowBotCountFromEnv());
  }
  return [process.env.MARKET_FLOW_EMAIL?.trim() || "flow@kingcoin.local"];
}

function liquidityBotEmails() {
  return [...new Set([...mmLiquidityEmails(), ...flowLiquidityEmails()])];
}

module.exports = {
  mmBotCountFromEnv,
  flowBotCountFromEnv,
  buildDefaultMmEmails,
  buildDefaultFlowEmails,
  mmLiquidityEmails,
  flowLiquidityEmails,
  liquidityBotEmails,
};
