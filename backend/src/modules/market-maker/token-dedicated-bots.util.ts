/** 10 bot / token — chỉ giao dịch đúng token được gán (6 MM + 4 flow). */

export const BOTS_PER_TOKEN = 10;
export const MM_SLOTS_PER_TOKEN = 6;
export const FLOW_SLOTS_PER_TOKEN = 4;

const BOT_EMAIL_RE =
  /^bot-([a-z0-9]+)-(\d{1,2})@kingcoin\.local$/i;

export type DedicatedBotKind = 'mm' | 'flow';

export type DedicatedBotSlot = {
  slot: number;
  kind: DedicatedBotKind;
  email: string;
};

export type DedicatedTokenBots = {
  tokenId: string;
  tokenName: string;
  symbol: string;
  slots: DedicatedBotSlot[];
};

export function isLegacyBotPool(): boolean {
  return (
    process.env.MARKET_LEGACY_BOT_POOL === 'true' ||
    process.env.MARKET_DEDICATED_BOTS_PER_TOKEN === 'false'
  );
}

export function sanitizeSymbolKey(symbol: string): string {
  const s = symbol.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return s || 'base';
}

export function slotToKind(slot: number): DedicatedBotKind {
  return slot <= MM_SLOTS_PER_TOKEN ? 'mm' : 'flow';
}

export function dedicatedBotEmail(symbol: string, slot: number): string {
  const n = Math.max(1, Math.min(BOTS_PER_TOKEN, Math.floor(slot)));
  return `bot-${sanitizeSymbolKey(symbol)}-${n}@kingcoin.local`;
}

export function slotsForToken(symbol: string): DedicatedBotSlot[] {
  return Array.from({ length: BOTS_PER_TOKEN }, (_, i) => {
    const slot = i + 1;
    return {
      slot,
      kind: slotToKind(slot),
      email: dedicatedBotEmail(symbol, slot),
    };
  });
}

export function parseDedicatedBotEmail(
  email: string,
): { symbolKey: string; slot: number } | null {
  const m = email.trim().toLowerCase().match(BOT_EMAIL_RE);
  if (!m) return null;
  const slot = Number(m[2]);
  if (!Number.isFinite(slot) || slot < 1 || slot > BOTS_PER_TOKEN) {
    return null;
  }
  return { symbolKey: m[1], slot };
}

export function isDedicatedBotEmail(email: string): boolean {
  return parseDedicatedBotEmail(email) != null;
}

export function dedicatedKindFromEmail(email: string): DedicatedBotKind | null {
  const p = parseDedicatedBotEmail(email);
  if (!p) return null;
  return slotToKind(p.slot);
}
