import { FuturesSide } from '@prisma/client';
import {
  closeReturnKc,
  effectiveLeverage,
  marginFromSize,
  marginRatio,
  mergeEntryPrice,
  sizeFromMargin,
  unrealizedPnlKc,
  validateTpSlPrices,
} from './futures-math.util';

describe('futures-math.util', () => {
  it('sizeFromMargin and marginFromSize are inverse', () => {
    const mark = 10;
    const lev = 10;
    const margin = 100;
    const size = sizeFromMargin(margin, lev, mark);
    expect(size).toBeCloseTo(100);
    expect(marginFromSize(size, lev, mark)).toBeCloseTo(100);
  });

  it('long uPnL increases when mark rises', () => {
    const pnl = unrealizedPnlKc(FuturesSide.long, 10, 5, 6);
    expect(pnl).toBeCloseTo(10);
  });

  it('short uPnL increases when mark falls', () => {
    const pnl = unrealizedPnlKc(FuturesSide.short, 10, 5, 4);
    expect(pnl).toBeCloseTo(10);
  });

  it('marginRatio drops toward liquidation', () => {
    const margin = 100;
    const size = 100;
    const entry = 10;
    const markBad = 9.1;
    const uPnl = unrealizedPnlKc(FuturesSide.long, size, entry, markBad);
    const ratio = marginRatio(margin, uPnl, size, markBad);
    expect(ratio).toBeLessThan(0.02);
  });

  it('closeReturnKc never negative', () => {
    expect(closeReturnKc(50, -80)).toBe(0);
    expect(closeReturnKc(50, 30)).toBe(80);
  });

  it('validateTpSlPrices for long', () => {
    const r = validateTpSlPrices(FuturesSide.long, 10, {
      takeProfitPrice: 11,
      stopLossPrice: 9,
    });
    expect(r.takeProfitPrice).toBe(11);
    expect(r.stopLossPrice).toBe(9);
  });

  it('mergeEntryPrice is size-weighted average', () => {
    expect(mergeEntryPrice(10, 5, 10, 7)).toBeCloseTo(6);
  });

  it('effectiveLeverage caps at max', () => {
    expect(effectiveLeverage(100, 10, 100, 10)).toBe(10);
    expect(effectiveLeverage(100, 10, 50, 15)).toBe(15);
  });
});
