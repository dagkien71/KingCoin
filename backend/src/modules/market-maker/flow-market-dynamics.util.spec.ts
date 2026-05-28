import {
  pickFlowTokenNames,
  planAsymmetricFlowSteps,
  pickProbePattern,
  rollFlowQty,
} from '@modules/market-maker/flow-market-dynamics.util';

describe('flow-market-dynamics.util', () => {
  it('rollFlowQty returns positive values', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollFlowQty(5)).toBeGreaterThan(0);
    }
  });

  it('planAsymmetricFlowSteps favors one-sided ticks', () => {
    let singleSide = 0;
    for (let i = 0; i < 400; i++) {
      const steps = planAsymmetricFlowSteps(`tok-${i % 5}`, false);
      if (steps.length === 1) singleSide++;
    }
    expect(singleSide).toBeGreaterThan(180);
  });

  it('counter-retrace stays much smaller than push', () => {
    for (let i = 0; i < 150; i++) {
      const steps = planAsymmetricFlowSteps(`tok-r-${i}`, false);
      if (steps.length === 2 && steps[0].side !== steps[1].side) {
        expect(steps[1].qtyScale).toBeLessThan(0.35);
      }
    }
  });

  it('pickFlowTokenNames returns subset', () => {
    const names = ['A', 'B', 'C', 'D'];
    const picked = pickFlowTokenNames(names, 1);
    expect(picked.length).toBe(1);
    expect(names).toContain(picked[0]);
  });

  it('pickProbePattern still returns valid patterns', () => {
    const patterns = new Set<string>();
    for (let i = 0; i < 80; i++) {
      patterns.add(pickProbePattern(false));
    }
    expect(patterns.size).toBeGreaterThan(0);
  });
});
