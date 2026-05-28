import {
  baseTradeQtyFromMarketCap,
  flowTakerBaseQtyFromMarketCap,
  mmBaseQtyFromMarketCap,
  resolveMarketCapKcForToken,
  userBotBaseQtyFromMarketCap,
} from './token-mcap-qty.util';

describe('token-mcap-qty', () => {
  const bigCap = {
    price: 2.5,
    circulatingSupply: 50_000_000,
    marketCap: 125_000_000,
  };

  const smallCap = {
    price: 0.5,
    circulatingSupply: 200_000,
    marketCap: 100_000,
  };

  it('resolveMarketCapKcForToken derives from price × supply', () => {
    expect(resolveMarketCapKcForToken(bigCap)).toBe(125_000_000);
  });

  it('scales flow qty up for larger market cap', () => {
    const big = baseTradeQtyFromMarketCap(bigCap, {
      globalBaseQty: 8,
      kind: 'flow',
    });
    const small = baseTradeQtyFromMarketCap(smallCap, {
      globalBaseQty: 8,
      kind: 'flow',
    });
    expect(big).toBeGreaterThan(small * 50);
  });

  it('mm qty per level is at least flow mult', () => {
    const mm = mmBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    const flow = baseTradeQtyFromMarketCap(bigCap, {
      globalBaseQty: 8,
      kind: 'flow',
    });
    expect(mm).toBeGreaterThanOrEqual(flow * 2.5);
  });

  it('user-bot qty is 2x mm base by default', () => {
    const mm = mmBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    const ub = userBotBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    expect(ub).toBeGreaterThanOrEqual(mm * 2 - 0.01);
  });

  it('taker flow is ~3.5x mm and ~3.5x user-bot', () => {
    const mm = mmBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    const ub = userBotBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    const flow = flowTakerBaseQtyFromMarketCap(bigCap, 100, 12, 8);
    expect(flow).toBeGreaterThanOrEqual(mm * 3.5 - 0.01);
    expect(flow).toBeGreaterThanOrEqual(ub * 3.5 - 0.01);
  });

  it('falls back to global knob when mcap unknown', () => {
    expect(
      baseTradeQtyFromMarketCap({ price: 0 }, { globalBaseQty: 12, kind: 'flow' }),
    ).toBe(12);
  });
});
