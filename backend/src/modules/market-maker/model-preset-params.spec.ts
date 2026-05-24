import { modelParamsFromPreset } from './model-preset-params.util';

describe('modelParamsFromPreset', () => {
  it('pump scenario params + spot token → neo ramp lên từ spot', () => {
    const params = modelParamsFromPreset(undefined, 'linear_ramp', 100, {
      priceStart: 80,
      priceEnd: 84,
    });
    expect(params.priceStart).toBe(100);
    expect(params.priceEnd).toBeCloseTo(105, 4);
  });

  it('dump scenario params + spot token → neo ramp xuống', () => {
    const params = modelParamsFromPreset(undefined, 'linear_ramp', 100, {
      priceStart: 100,
      priceEnd: 95,
    });
    expect(params.priceStart).toBe(100);
    expect(params.priceEnd).toBe(95);
  });

  it('preset model-pump-ramp không ghi đè hướng dump từ extra', () => {
    const params = modelParamsFromPreset(
      'model-pump-ramp',
      'linear_ramp',
      100,
      { priceStart: 100, priceEnd: 90 },
    );
    expect(params.priceEnd).toBe(90);
  });

  it('sideway sin_band neo theo spot từng token', () => {
    const extra = {
      priceStart: 100,
      priceMin: 95,
      priceMax: 105,
      waveCycles: 4,
    };
    const p50 = modelParamsFromPreset(undefined, 'sin_band', 50, extra);
    const p200 = modelParamsFromPreset(undefined, 'sin_band', 200, extra);
    expect(p50.priceMin).toBeCloseTo(47.5, 2);
    expect(p50.priceMax).toBeCloseTo(52.5, 2);
    expect(p200.priceMin).toBeCloseTo(190, 2);
    expect(p200.priceMax).toBeCloseTo(210, 2);
  });
});
