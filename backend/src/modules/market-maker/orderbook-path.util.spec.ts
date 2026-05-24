import {
  computePricePathSteps,
  relativeMovePct,
  shouldWalkPricePath,
} from './orderbook-path.util';

describe('orderbook-path.util', () => {
  const cfg = {
    minPctForWalk: 0.03,
    stepPct: 0.01,
    minSteps: 2,
    maxSteps: 20,
  };

  it('relativeMovePct', () => {
    expect(relativeMovePct(100, 103)).toBeCloseTo(0.03);
    expect(relativeMovePct(1, 3)).toBeCloseTo(2);
  });

  it('shouldWalk when move >= min pct', () => {
    expect(shouldWalkPricePath(1, 1.02, cfg)).toBe(false);
    expect(shouldWalkPricePath(1, 1.04, cfg)).toBe(true);
  });

  it('computePricePathSteps ends at target with multiple steps for 1→3', () => {
    const steps = computePricePathSteps(1, 3, cfg);
    expect(steps.length).toBeGreaterThan(2);
    expect(steps[0]).toBeGreaterThan(1);
    expect(steps[steps.length - 1]).toBe(3);
  });

  it('small move is single step', () => {
    const steps = computePricePathSteps(10, 10.1, cfg);
    expect(steps).toEqual([10.1]);
  });
});
