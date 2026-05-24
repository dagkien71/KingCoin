import {
  buildPriceChangePercents,
  percentChange,
} from './price-change.util';

describe('price-change.util', () => {
  it('percentChange: +10% when price rises', () => {
    expect(percentChange(110, 100)).toBe(10);
  });

  it('percentChange: -5% when price falls', () => {
    expect(percentChange(95, 100)).toBe(-5);
  });

  it('percentChange: null when past <= 0', () => {
    expect(percentChange(100, 0)).toBeNull();
  });

  it('buildPriceChangePercents uses past as denominator', () => {
    const r = buildPriceChangePercents(105, 100, 100, 100);
    expect(r.priceChange1h).toBe(5);
    expect(r.priceChange24h).toBe(5);
    expect(r.priceChange7d).toBe(5);
  });
});
