import { PriceAlertDirection } from '@prisma/client';

/** Pure helper — dùng trong test và PriceAlertService. */
export function isPriceAlertTriggered(
  direction: PriceAlertDirection,
  currentPrice: number,
  targetPrice: number,
): boolean {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return false;
  if (direction === PriceAlertDirection.above) {
    return currentPrice >= targetPrice;
  }
  return currentPrice <= targetPrice;
}
