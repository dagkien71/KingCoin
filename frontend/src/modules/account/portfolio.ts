/**
 * NAV / holdings — mọi alt quy đổi theo giá TOKEN/KC hiện tại (KC ≈ USDT).
 * @see docs/STABLECOIN_KC_SPEC.md#quy-đổi-vốn-nav--kc-như-usdt
 */
import type { IBalanceSnapshot } from "@/types/trade.type";
import type { ITokenCrypto } from "@/types/token.type";

export type HoldingRow = {
  tokenId: string;
  symbol: string;
  name: string;
  logo?: string;
  amount: number;
  priceKc: number;
  valueKc: number;
  sharePct: number;
};

export type PortfolioSummary = {
  quoteKc: number;
  altValueKc: number;
  totalKc: number;
  holdings: HoldingRow[];
  kcSharePct: number;
  altSharePct: number;
};

export function priceForToken(
  token: Pick<ITokenCrypto, "id" | "price">,
  livePriceById?: Map<string, number>
): number {
  const live = livePriceById?.get(token.id);
  if (live != null && live > 0) return live;
  return token.price ?? 0;
}

export function buildPortfolio(
  balances: IBalanceSnapshot | undefined,
  tokensById: Map<string, ITokenCrypto>,
  livePriceById?: Map<string, number>,
  minValueKc = 0
): PortfolioSummary {
  const quoteKc = balances?.quoteKc ?? 0;
  const holdings: HoldingRow[] = [];

  for (const bal of balances?.tokens ?? []) {
    const meta = tokensById.get(bal.tokenId);
    const priceKc = meta
      ? priceForToken(meta, livePriceById)
      : 0;
    const valueKc = bal.amount * priceKc;
    if (
      minValueKc > 0 &&
      priceKc > 0 &&
      valueKc < minValueKc &&
      bal.amount > 0
    ) {
      continue;
    }
    holdings.push({
      tokenId: bal.tokenId,
      symbol: bal.symbol ?? meta?.symbol ?? "—",
      name: meta?.name ?? bal.symbol ?? "Token",
      logo: meta?.logo,
      amount: bal.amount,
      priceKc,
      valueKc,
      sharePct: 0,
    });
  }

  holdings.sort((a, b) => b.valueKc - a.valueKc);

  const altValueKc = holdings.reduce((s, h) => s + h.valueKc, 0);
  const totalKc = quoteKc + altValueKc;

  for (const h of holdings) {
    h.sharePct = totalKc > 0 ? (h.valueKc / totalKc) * 100 : 0;
  }

  const kcSharePct = totalKc > 0 ? (quoteKc / totalKc) * 100 : 100;
  const altSharePct = totalKc > 0 ? (altValueKc / totalKc) * 100 : 0;

  return {
    quoteKc,
    altValueKc,
    totalKc,
    holdings,
    kcSharePct,
    altSharePct,
  };
}

export function formatPnLLine(
  amount?: number | null,
  pct?: number | null
): { text: string; positive: boolean } {
  const a = amount ?? 0;
  const positive = a >= 0;
  const sign = positive ? "+" : "";
  const amountStr = `${sign}${a.toFixed(2)} KC`;
  const showPct =
    pct != null &&
    Number.isFinite(pct) &&
    (Math.abs(pct) >= 0.01 || Math.abs(a) < 0.005);
  const pctStr = showPct ? ` (${sign}${pct.toFixed(2)}%)` : "";
  return { text: `${amountStr}${pctStr}`, positive };
}
