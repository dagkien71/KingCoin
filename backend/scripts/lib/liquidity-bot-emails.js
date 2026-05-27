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

const PROD_MM_BOT_COUNT = 12;
const PROD_FLOW_BOT_COUNT = 4;
const LOCAL_MM_BOT_COUNT = 22;
const LOCAL_FLOW_BOT_COUNT = 14;

function mmBotCountFromEnv() {
  if (!process.env.MARKET_MAKER_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === "production") return PROD_MM_BOT_COUNT;
    return LOCAL_MM_BOT_COUNT;
  }
  return clampInt(process.env.MARKET_MAKER_BOT_COUNT, 1, 32);
}

function flowBotCountFromEnv() {
  if (!process.env.MARKET_FLOW_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === "production") return PROD_FLOW_BOT_COUNT;
    return LOCAL_FLOW_BOT_COUNT;
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
  if (mmBotCountFromEnv() > 1) {
    return buildDefaultMmEmails(mmBotCountFromEnv());
  }
  const primary =
    process.env.MARKET_MAKER_EMAIL?.trim() || "marketmaker@kingcoin.local";
  return [primary];
}

function flowLiquidityEmails() {
  const bulk = parseEmailList(process.env.MARKET_FLOW_BOT_EMAILS);
  if (bulk.length > 0) return bulk;
  if (flowBotCountFromEnv() > 1) {
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
