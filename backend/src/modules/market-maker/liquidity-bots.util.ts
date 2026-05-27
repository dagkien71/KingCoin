/**
 * Tài khoản bot thanh khoản — MM treo sổ + flow khớp taker.
 * @see docs/MARKET_MAKER.md
 */

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
    ),
  ];
}

function clampInt(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw ?? String(fallback));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

/** Prod mặc định — local +10 mỗi loại (xem LOCAL_*). */
export const PROD_MM_BOT_COUNT = 12;
export const PROD_FLOW_BOT_COUNT = 4;
export const LOCAL_MM_BOT_COUNT = 22;
export const LOCAL_FLOW_BOT_COUNT = 14;

export function mmBotCountFromEnv(): number {
  if (!process.env.MARKET_MAKER_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === 'production') return PROD_MM_BOT_COUNT;
    return LOCAL_MM_BOT_COUNT;
  }
  return clampInt(process.env.MARKET_MAKER_BOT_COUNT, 1, 32);
}

export function flowBotCountFromEnv(): number {
  if (!process.env.MARKET_FLOW_BOT_COUNT?.trim()) {
    if (process.env.NODE_ENV === 'production') return PROD_FLOW_BOT_COUNT;
    return LOCAL_FLOW_BOT_COUNT;
  }
  return clampInt(process.env.MARKET_FLOW_BOT_COUNT, 1, 16);
}

/** MM đặt lệnh limit hai phía (không gồm flow taker). */
export function buildDefaultMmEmails(count: number): string[] {
  const primary =
    process.env.MARKET_MAKER_EMAIL?.trim() || 'marketmaker@kingcoin.local';
  if (count <= 1) return [primary];
  return Array.from(
    { length: count },
    (_, i) => `mm${i + 1}@kingcoin.local`,
  );
}

/** Bot taker khớp với sổ MM. */
export function buildDefaultFlowEmails(count: number): string[] {
  const primary = process.env.MARKET_FLOW_EMAIL?.trim() || 'flow@kingcoin.local';
  if (count <= 1) return [primary];
  return Array.from(
    { length: count },
    (_, i) => `flow${i + 1}@kingcoin.local`,
  );
}

export function mmLiquidityEmails(): string[] {
  const bulk = parseEmailList(process.env.MARKET_MAKER_BOT_EMAILS);
  if (bulk.length > 0) {
    const flowSet = new Set(
      flowLiquidityEmails().map((e) => e.toLowerCase()),
    );
    return bulk.filter((e) => !flowSet.has(e.toLowerCase()));
  }

  if (mmBotCountFromEnv() > 1) {
    return buildDefaultMmEmails(mmBotCountFromEnv());
  }

  const primary =
    process.env.MARKET_MAKER_EMAIL?.trim() || 'marketmaker@kingcoin.local';
  return [primary];
}

export function flowLiquidityEmails(): string[] {
  const bulk = parseEmailList(process.env.MARKET_FLOW_BOT_EMAILS);
  if (bulk.length > 0) return bulk;

  if (flowBotCountFromEnv() > 1) {
    return buildDefaultFlowEmails(flowBotCountFromEnv());
  }

  return [process.env.MARKET_FLOW_EMAIL?.trim() || 'flow@kingcoin.local'];
}

/** Mọi bot (MM + flow) — cấp kho token / lọc admin. */
export function liquidityBotEmails(): string[] {
  return [...new Set([...mmLiquidityEmails(), ...flowLiquidityEmails()])];
}

export function isLiquidityBotUsername(username: string | null | undefined): boolean {
  const u = (username ?? '').trim().toLowerCase();
  if (!u) return false;
  if (u === 'marketmaker' || u === 'flowtrader' || u === 'flow') return true;
  return /^mm\d+$/.test(u) || /^flow\d+$/.test(u);
}
