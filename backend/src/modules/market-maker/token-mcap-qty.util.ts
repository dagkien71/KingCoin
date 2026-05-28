import {
  deriveMarketCapKc,
  tokenSupplyForMarketCap,
} from '@modules/token-crypto/token-market.util';

export type TokenForMcapQty = {
  price?: number | null;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  marketCap?: number | null;
};

function readPositiveEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** flowQty / qty admin = hệ số cường độ so với mức chuẩn env. */
export function qtyIntensityKnob(
  globalQty: number,
  kind: 'flow' | 'mm',
): number {
  const ref =
    kind === 'flow'
      ? readPositiveEnv(
          'MARKET_FLOW_QTY_REF',
          isProduction() ? 48 : 8,
        )
      : readPositiveEnv(
          'MARKET_MAKER_QTY_REF',
          isProduction() ? 350 : 80,
        );
  return Math.max(0.15, globalQty / ref);
}

export function resolveMarketCapKcForToken(token: TokenForMcapQty): number {
  const supply = tokenSupplyForMarketCap(
    token as Parameters<typeof tokenSupplyForMarketCap>[0],
  );
  const derived = deriveMarketCapKc(token.price, supply);
  if (derived > 0) return derived;
  const stored = token.marketCap;
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return 0;
}

export type McapQtyOptions = {
  /** Knob từ admin / preset (flowQty hoặc qty MM). */
  globalBaseQty: number;
  kind: 'flow' | 'mm';
  /** Số bậc sổ MM — chỉ dùng khi kind = mm. */
  levels?: number;
};

function clampQty(qty: number, kind: 'flow' | 'mm'): number {
  const min = readPositiveEnv(
    kind === 'flow' ? 'MARKET_FLOW_QTY_MIN' : 'MARKET_MAKER_QTY_MIN',
    kind === 'flow' ? 0.01 : 0.25,
  );
  const max = readPositiveEnv(
    kind === 'flow' ? 'MARKET_FLOW_QTY_MAX' : 'MARKET_MAKER_QTY_MAX',
    kind === 'flow' ? 500_000 : 2_000_000,
  );
  return Number(Math.min(max, Math.max(min, qty)).toFixed(4));
}

/**
 * Khối lượng base (token) cho một lệnh / một bậc sổ — tỷ lệ % vốn hoá KC.
 * Admin `flowQty` / `qty` chỉ là hệ số nhân, không phải số token cố định.
 */
export function baseTradeQtyFromMarketCap(
  token: TokenForMcapQty,
  opts: McapQtyOptions,
): number {
  const price = Number(token.price ?? 0);
  const mcap = resolveMarketCapKcForToken(token);
  const intensity = qtyIntensityKnob(opts.globalBaseQty, opts.kind);

  if (mcap <= 0 || price <= 0) {
    return clampQty(opts.globalBaseQty, opts.kind);
  }

  const fillBps = readPositiveEnv(
    opts.kind === 'flow' ? 'MARKET_FLOW_FILL_BPS' : 'MARKET_MM_LEVEL_BPS',
    opts.kind === 'flow' ? 1.8 : 6,
  );

  let quoteKcTarget = mcap * (fillBps / 10_000) * intensity;

  if (opts.kind === 'mm') {
    const levels = Math.max(1, Math.min(12, Math.floor(opts.levels ?? 8)));
    quoteKcTarget /= levels * 2;
  }

  const minQuoteKc = readPositiveEnv('MARKET_TRADE_MIN_QUOTE_KC', 8);
  const maxMcapFrac = readPositiveEnv('MARKET_TRADE_MAX_MCAP_FRAC', 0.0015);
  const maxQuoteKc = Math.min(
    mcap * maxMcapFrac,
    readPositiveEnv('MARKET_TRADE_MAX_QUOTE_KC', 1_500_000),
  );
  quoteKcTarget = Math.min(maxQuoteKc, Math.max(minQuoteKc, quoteKcTarget));

  let qty = quoteKcTarget / price;

  const supply = tokenSupplyForMarketCap(
    token as Parameters<typeof tokenSupplyForMarketCap>[0],
  );
  if (supply > 0) {
    const maxSupplyFrac = readPositiveEnv('MARKET_TRADE_MAX_SUPPLY_FRAC', 0.0015);
    qty = Math.min(qty, supply * maxSupplyFrac);
  }

  return clampQty(qty, opts.kind);
}

/** MM: đảm bảo mỗi bậc đủ sâu để flow ăn — ít nhất ~2.5× khối flow cùng token. */
export function mmBaseQtyFromMarketCap(
  token: TokenForMcapQty,
  globalMmQty: number,
  levels: number,
  flowQtyKnob: number,
): number {
  const mm = baseTradeQtyFromMarketCap(token, {
    globalBaseQty: globalMmQty,
    kind: 'mm',
    levels,
  });
  const flow = baseTradeQtyFromMarketCap(token, {
    globalBaseQty: flowQtyKnob,
    kind: 'flow',
  });
  const mult = readPositiveEnv('MARKET_MM_MIN_FLOW_MULT', 2.5);
  return clampQty(Math.max(mm, flow * mult), 'mm');
}

export function userBotMmQtyMult(): number {
  return readPositiveEnv('USER_BOT_MM_QTY_MULT', 2);
}

/** User-bot: cùng công thức MM, nhân hệ số (mặc định ×2). */
export function userBotBaseQtyFromMarketCap(
  token: TokenForMcapQty,
  globalMmQty: number,
  levels: number,
  flowQtyKnob: number,
): number {
  const mm = mmBaseQtyFromMarketCap(token, globalMmQty, levels, flowQtyKnob);
  return clampQty(mm * userBotMmQtyMult(), 'mm');
}

/**
 * Taker flow: ~3–4× MM và ~3–4× user-bot (mặc định 3.5× so với từng mức).
 */
export function flowTakerBaseQtyFromMarketCap(
  token: TokenForMcapQty,
  globalMmQty: number,
  levels: number,
  flowQtyKnob: number,
): number {
  const mm = mmBaseQtyFromMarketCap(token, globalMmQty, levels, flowQtyKnob);
  const userBot = mm * userBotMmQtyMult();
  const vsMm = readPositiveEnv('MARKET_FLOW_MM_QTY_MULT', 3.5);
  const vsUserBot = readPositiveEnv('MARKET_FLOW_USER_BOT_QTY_MULT', 3.5);
  return clampQty(Math.max(mm * vsMm, userBot * vsUserBot), 'flow');
}
