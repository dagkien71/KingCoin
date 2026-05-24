import {
  anchorLinearRampParams,
  defaultParamsForModel,
  modelPriceAt,
  PriceModelRun,
} from './price-path-models';

function makeRun(
  modelId: PriceModelRun['modelId'],
  params: PriceModelRun['params'],
  startAt = 0,
  endAt = 60_000,
): PriceModelRun {
  return {
    id: 'test-run',
    tokenId: 'tok',
    modelId,
    startAt,
    endAt,
    params,
    restoreOnEnd: true,
    status: 'active',
    createdAt: 0,
    priceAtStart: params.priceStart ?? 100,
  };
}

describe('price-path-models', () => {
  const spot = 100;

  it('linear_ramp: start → end at t=0 and t=1', () => {
    const run = makeRun('linear_ramp', { priceStart: 100, priceEnd: 110 });
    expect(modelPriceAt(run, 0)).toBe(100);
    expect(modelPriceAt(run, 59_999)).toBeCloseTo(110, 2);
  });

  it('linear_ramp dump: giá giảm dần theo thời gian', () => {
    const run = makeRun('linear_ramp', { priceStart: 100, priceEnd: 90 });
    expect(modelPriceAt(run, 0)).toBe(100);
    expect(modelPriceAt(run, 30_000)!).toBeLessThan(100);
    expect(modelPriceAt(run, 59_999)).toBeCloseTo(90, 2);
  });

  it('anchorLinearRampParams: pump không bị đảo khi client ref < spot', () => {
    const { priceStart, priceEnd } = anchorLinearRampParams(100, {
      priceStart: 90,
      priceEnd: 94.5,
    });
    expect(priceEnd).toBeGreaterThan(priceStart!);
    const run = makeRun('linear_ramp', { priceStart, priceEnd });
    expect(modelPriceAt(run, 59_999)!).toBeGreaterThan(100);
  });

  it('mean_reversion: approaches priceEnd', () => {
    const run = makeRun('mean_reversion', {
      priceStart: 110,
      priceEnd: 100,
      reversionSpeed: 8,
    });
    const mid = modelPriceAt(run, 30_000)!;
    const end = modelPriceAt(run, 59_999)!;
    expect(mid).toBeLessThan(110);
    expect(end).toBeCloseTo(100, 0);
  });

  it('sin_band: stays within [min,max]', () => {
    const run = makeRun('sin_band', {
      priceMin: 95,
      priceMax: 105,
      waveCycles: 2,
    });
    for (let t = 1000; t < 60_000; t += 5000) {
      const px = modelPriceAt(run, t)!;
      expect(px).toBeGreaterThanOrEqual(95);
      expect(px).toBeLessThanOrEqual(105);
    }
  });

  it('step_ladder: discrete levels', () => {
    const run = makeRun('step_ladder', {
      priceStart: 100,
      priceEnd: 110,
      steps: 3,
    });
    const a = modelPriceAt(run, 5_000)!;
    const b = modelPriceAt(run, 25_000)!;
    expect(a).toBe(100);
    expect(b).toBeGreaterThan(a);
  });

  it('triangle: dips then recovers', () => {
    const run = makeRun('triangle', {
      priceStart: 100,
      priceMin: 90,
      priceEnd: 102,
    });
    const low = modelPriceAt(run, 29_000)!;
    const finish = modelPriceAt(run, 59_000)!;
    expect(low).toBeLessThan(100);
    expect(finish).toBeGreaterThan(low);
  });

  it('gbm: deterministic for same run id', () => {
    const run = makeRun('gbm', { priceStart: 100, volatility: 0.03, drift: 0 });
    const a = modelPriceAt(run, 20_000)!;
    const b = modelPriceAt(run, 20_000)!;
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it('defaultParamsForModel returns positive prices', () => {
    for (const id of [
      'sin_band',
      'linear_ramp',
      'mean_reversion',
      'gbm',
      'step_ladder',
      'triangle',
      'exp_trend',
    ] as const) {
      const p = defaultParamsForModel(id, spot, 15);
      expect(p.priceStart ?? spot).toBeGreaterThan(0);
    }
  });
});
