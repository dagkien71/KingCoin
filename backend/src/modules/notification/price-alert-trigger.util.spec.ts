import { PriceAlertDirection } from '@prisma/client';
import { isPriceAlertTriggered } from './price-alert-trigger.util';

describe('isPriceAlertTriggered', () => {
  it('above triggers when price >= target', () => {
    expect(
      isPriceAlertTriggered(PriceAlertDirection.above, 10, 10),
    ).toBe(true);
    expect(
      isPriceAlertTriggered(PriceAlertDirection.above, 11, 10),
    ).toBe(true);
    expect(
      isPriceAlertTriggered(PriceAlertDirection.above, 9, 10),
    ).toBe(false);
  });

  it('below triggers when price <= target', () => {
    expect(
      isPriceAlertTriggered(PriceAlertDirection.below, 5, 5),
    ).toBe(true);
    expect(
      isPriceAlertTriggered(PriceAlertDirection.below, 4, 5),
    ).toBe(true);
    expect(
      isPriceAlertTriggered(PriceAlertDirection.below, 6, 5),
    ).toBe(false);
  });

  it('rejects non-positive prices', () => {
    expect(
      isPriceAlertTriggered(PriceAlertDirection.above, 0, 1),
    ).toBe(false);
  });
});
