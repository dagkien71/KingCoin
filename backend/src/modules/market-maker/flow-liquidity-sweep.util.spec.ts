import {
  aggregateAskLiquidityInBand,
  aggregateBidLiquidityInBand,
  rollTakerChunkQty,
} from './flow-liquidity-sweep.util';

describe('flow-liquidity-sweep', () => {
  it('rollTakerChunkQty varies around base', () => {
    const samples = Array.from({ length: 30 }, () => rollTakerChunkQty(1000));
    expect(Math.min(...samples)).toBeLessThan(950);
    expect(Math.max(...samples)).toBeGreaterThan(680);
  });

  it('aggregates asks within slip band', () => {
    const asks = [
      { price: 10, quantity: 50 },
      { price: 10.01, quantity: 80 },
      { price: 10.05, quantity: 200 },
    ];
    const { limitPrice, totalQty } = aggregateAskLiquidityInBand(asks, 0.002);
    expect(limitPrice).toBe(10.01);
    expect(totalQty).toBe(130);
  });

  it('aggregates bids within slip band', () => {
    const bids = [
      { price: 10, quantity: 40 },
      { price: 9.99, quantity: 60 },
    ];
    const { limitPrice, totalQty } = aggregateBidLiquidityInBand(bids, 0.001);
    expect(limitPrice).toBe(9.99);
    expect(totalQty).toBe(100);
  });
});
