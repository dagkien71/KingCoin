import {
  VOLATILITY_MARKET_PROFILES,
  VOLATILITY_ORDER,
  inferVolatilityLevel,
  volatilityPresetFor,
} from '@modules/market-maker/volatility-presets.util';

describe('volatility-presets.util', () => {
  const order = [
    'gentle',
    'moderate',
    'stable',
    'strong',
    'extreme',
  ] as const;

  it('exports five levels in slider order', () => {
    expect(VOLATILITY_ORDER).toEqual(order);
  });

  it('monotonic flow activity gentle → extreme', () => {
    let prevPasses = 0;
    let prevSweep = 0;
    for (const id of order) {
      const { flow } = VOLATILITY_MARKET_PROFILES[id];
      expect(flow.passesPerTick).toBeGreaterThanOrEqual(prevPasses);
      expect(flow.sweepMaxFills).toBeGreaterThanOrEqual(prevSweep);
      prevPasses = flow.passesPerTick;
      prevSweep = flow.sweepMaxFills;
    }
    expect(VOLATILITY_MARKET_PROFILES.extreme.flow.bothSidesPerTick).toBe(true);
    expect(VOLATILITY_MARKET_PROFILES.gentle.flow.bothSidesPerTick).toBe(false);
  });

  it('monotonic mm/flow intervals gentle → extreme', () => {
    let prevMm = Infinity;
    let prevFlow = Infinity;
    for (const id of order) {
      const p = volatilityPresetFor(id)!;
      expect(p.mmIntervalMs!).toBeLessThanOrEqual(prevMm);
      expect(p.flowIntervalMs!).toBeLessThanOrEqual(prevFlow);
      prevMm = p.mmIntervalMs!;
      prevFlow = p.flowIntervalMs!;
    }
  });

  it('book skew zero until strong', () => {
    expect(VOLATILITY_MARKET_PROFILES.gentle.pricing.bookSkewPct).toBe(0);
    expect(VOLATILITY_MARKET_PROFILES.moderate.pricing.bookSkewPct).toBe(0);
    expect(VOLATILITY_MARKET_PROFILES.stable.pricing.bookSkewPct).toBe(0);
    expect(VOLATILITY_MARKET_PROFILES.strong.pricing.bookSkewPct).toBeGreaterThan(
      0,
    );
    expect(
      VOLATILITY_MARKET_PROFILES.extreme.pricing.bookSkewPct,
    ).toBeGreaterThan(VOLATILITY_MARKET_PROFILES.strong.pricing.bookSkewPct);
  });

  it('preset includes volatilityLevel', () => {
    for (const id of order) {
      expect(volatilityPresetFor(id)?.volatilityLevel).toBe(id);
    }
  });

  it('inferVolatilityLevel prefers stored level', () => {
    expect(inferVolatilityLevel(0.99, 'gentle')).toBe('gentle');
  });
});
