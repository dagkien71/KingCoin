import { isQuoteToken } from '@modules/market-maker/liquidity-target-tokens.util';

/** Token được phép perpetual — cùng tập base alt như spot (trừ KC/quote). */
export function isFuturesEligibleToken(token: {
  name?: string | null;
  symbol?: string | null;
  tokenKind?: string | null;
}): boolean {
  if (token.tokenKind === 'stablecoin') return false;
  return !isQuoteToken(token);
}
