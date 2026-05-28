const BOTS_PER_TOKEN = 10;
const MM_SLOTS_PER_TOKEN = 6;
const FLOW_SLOTS_PER_TOKEN = 4;

function isLegacyBotPool() {
  return (
    process.env.MARKET_LEGACY_BOT_POOL === "true" ||
    process.env.MARKET_DEDICATED_BOTS_PER_TOKEN === "false"
  );
}

function sanitizeSymbolKey(symbol) {
  const s = String(symbol ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return s || "base";
}

function slotToKind(slot) {
  return slot <= MM_SLOTS_PER_TOKEN ? "mm" : "flow";
}

function dedicatedBotEmail(symbol, slot) {
  const n = Math.max(1, Math.min(BOTS_PER_TOKEN, Math.floor(slot)));
  return `bot-${sanitizeSymbolKey(symbol)}-${n}@kingcoin.local`;
}

function slotsForToken(symbol) {
  return Array.from({ length: BOTS_PER_TOKEN }, (_, i) => {
    const slot = i + 1;
    return {
      slot,
      kind: slotToKind(slot),
      email: dedicatedBotEmail(symbol, slot),
    };
  });
}

module.exports = {
  BOTS_PER_TOKEN,
  MM_SLOTS_PER_TOKEN,
  FLOW_SLOTS_PER_TOKEN,
  isLegacyBotPool,
  slotsForToken,
  dedicatedBotEmail,
};
