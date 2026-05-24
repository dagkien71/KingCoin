import {
  anchorLinearRampParams,
  anchorPathParamsToSpot,
  anchorSinBandParams,
  modelPriceAt,
  PriceModelRun,
} from './price-path-models';

function makeRun(
  params: PriceModelRun['params'],
  spot = 100,
): PriceModelRun {
  return {
    id: 'anchor-test',
    tokenId: 'tok',
    modelId: 'linear_ramp',
    startAt: 0,
    endAt: 60_000,
    params,
    restoreOnEnd: true,
    status: 'active',
    createdAt: 0,
    priceAtStart: spot,
  };
}

describe('anchorPathParamsToSpot', () => {
  it('linear_ramp: pump intent từ ref thấp hơn spot → vẫn ramp lên từ spot', () => {
    const anchored = anchorLinearRampParams(100, {
      priceStart: 90,
      priceEnd: 94.5,
    });
    expect(anchored.priceStart).toBe(100);
    expect(anchored.priceEnd).toBeCloseTo(105, 4);

    const run = makeRun(anchored, 100);
    expect(modelPriceAt(run, 0)).toBe(100);
    expect(modelPriceAt(run, 30_000)!).toBeGreaterThan(100);
    expect(modelPriceAt(run, 59_999)!).toBeCloseTo(105, 2);
  });

  it('linear_ramp: dump intent → ramp xuống từ spot', () => {
    const anchored = anchorLinearRampParams(100, {
      priceStart: 100,
      priceEnd: 95,
    });
    expect(anchored.priceStart).toBe(100);
    expect(anchored.priceEnd).toBe(95);

    const run = makeRun(anchored, 100);
    expect(modelPriceAt(run, 59_999)!).toBeCloseTo(95, 2);
    expect(modelPriceAt(run, 30_000)!).toBeLessThan(100);
  });

  it('sin_band: neo theo spot, giữ biên %', () => {
    const anchored = anchorSinBandParams(200, {
      priceStart: 100,
      priceMin: 97,
      priceMax: 103,
    });
    expect(anchored.priceStart).toBe(200);
    expect(anchored.priceMin).toBeCloseTo(194, 2);
    expect(anchored.priceMax).toBeCloseTo(206, 2);
  });

  it('bulk-style: cùng params client, spot khác nhau → mỗi token đúng hướng', () => {
    const client = { priceStart: 80, priceEnd: 84 };
    const a = anchorPathParamsToSpot('linear_ramp', 100, client);
    const b = anchorPathParamsToSpot('linear_ramp', 50, client);
    expect(a.priceEnd).toBeGreaterThan(a.priceStart!);
    expect(b.priceEnd).toBeGreaterThan(b.priceStart!);
    expect(a.priceStart).toBe(100);
    expect(b.priceStart).toBe(50);
    expect(a.priceEnd).toBeCloseTo(105, 4);
    expect(b.priceEnd).toBeCloseTo(52.5, 4);
  });
});
