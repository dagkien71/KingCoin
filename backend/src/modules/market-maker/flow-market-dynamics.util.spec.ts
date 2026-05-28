import {
  pickProbePattern,
  probeFillCount,
  rollFlowQty,
} from '@modules/market-maker/flow-market-dynamics.util';

describe('flow-market-dynamics.util', () => {
  it('rollFlowQty returns positive values', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollFlowQty(5)).toBeGreaterThan(0);
    }
  });

  it('probeFillCount respects cap', () => {
    for (let i = 0; i < 30; i++) {
      const n = probeFillCount(4);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it('pickProbePattern includes retrace patterns', () => {
    const patterns = new Set<string>();
    for (let i = 0; i < 200; i++) {
      patterns.add(pickProbePattern(true));
    }
    expect(patterns.has('up_then_retrace')).toBe(true);
    expect(patterns.has('down_then_retrace')).toBe(true);
  });
});
