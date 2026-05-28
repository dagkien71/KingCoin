/** Đọc cờ bật/tắt từ env — chấp nhận true/1/yes/on (không phân biệt hoa thường, trim). */
export function readEnvFlag(
  name: string,
): boolean | null {
  const raw = process.env[name];
  if (raw == null || !String(raw).trim()) return null;
  const v = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  return null;
}

/**
 * MM theo env.
 * Mặc định BẬT trên mọi môi trường — tắt bằng MARKET_MAKER_ENABLED=false.
 */
export function envMmEnabledFromProcess(): boolean {
  const flag = readEnvFlag('MARKET_MAKER_ENABLED');
  if (flag === false) return false;
  return true;
}

export type MmEnvDiagnostics = {
  nodeEnv: string | null;
  marketMakerEnabledRaw: string | null;
  marketFlowEnabledRaw: string | null;
  marketMakerBotCountRaw: string | null;
  marketFlowBotCountRaw: string | null;
  marketMakerQtyRaw: string | null;
  marketMakerLevelsRaw: string | null;
  marketFlowQtyRaw: string | null;
  configuredMmEmails: string[];
  configuredFlowEmails: string[];
};

export function buildMmEnvDiagnostics(
  configured: { mm: string[]; flow: string[] },
): MmEnvDiagnostics {
  return {
    nodeEnv: process.env.NODE_ENV ?? null,
    marketMakerEnabledRaw: process.env.MARKET_MAKER_ENABLED ?? null,
    marketFlowEnabledRaw: process.env.MARKET_FLOW_ENABLED ?? null,
    marketMakerBotCountRaw: process.env.MARKET_MAKER_BOT_COUNT ?? null,
    marketFlowBotCountRaw: process.env.MARKET_FLOW_BOT_COUNT ?? null,
    marketMakerQtyRaw: process.env.MARKET_MAKER_QTY ?? null,
    marketMakerLevelsRaw: process.env.MARKET_MAKER_LEVELS ?? null,
    marketFlowQtyRaw: process.env.MARKET_FLOW_QTY ?? null,
    configuredMmEmails: configured.mm,
    configuredFlowEmails: configured.flow,
  };
}
