import { BadRequestException } from '@nestjs/common';
import {
  assertPositiveSpotPrice,
  floorSpotPrice,
  MIN_SPOT_PRICE,
} from './spot-price.util';

describe('spot-price.util', () => {
  it('rejects negative price', () => {
    expect(() => assertPositiveSpotPrice(-1)).toThrow(BadRequestException);
    expect(() => assertPositiveSpotPrice(-0.001)).toThrow(/không được âm/);
  });

  it('rejects zero and sub-min positive', () => {
    expect(() => assertPositiveSpotPrice(0)).toThrow(BadRequestException);
    expect(() => assertPositiveSpotPrice(MIN_SPOT_PRICE / 10)).toThrow(
      BadRequestException,
    );
  });

  it('accepts valid price', () => {
    expect(assertPositiveSpotPrice(1.5)).toBe(1.5);
  });

  it('floorSpotPrice never returns negative', () => {
    expect(floorSpotPrice(-100)).toBe(MIN_SPOT_PRICE);
    expect(floorSpotPrice(0)).toBe(MIN_SPOT_PRICE);
    expect(floorSpotPrice(2)).toBe(2);
  });
});
