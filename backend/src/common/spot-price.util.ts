import { BadRequestException } from '@nestjs/common';

/** Giá spot tối thiểu (tránh 0 / âm trên DB và chart). */
export const MIN_SPOT_PRICE = 1e-8;

/**
 * Giá spot hợp lệ: finite và ≥ MIN_SPOT_PRICE.
 * Giá âm → từ chối rõ ràng (không âm thầm).
 */
export function assertPositiveSpotPrice(
  price: number,
  label = 'Giá',
): number {
  if (!Number.isFinite(price)) {
    throw new BadRequestException(`${label} không hợp lệ.`);
  }
  if (price < 0) {
    throw new BadRequestException(`${label} token không được âm.`);
  }
  if (price < MIN_SPOT_PRICE) {
    throw new BadRequestException(
      `${label} phải ≥ ${MIN_SPOT_PRICE} (số dương).`,
    );
  }
  return price;
}

/** Dùng khi blend path/MM — ép sàn, không throw (tránh tick crash). */
export function floorSpotPrice(price: number): number {
  if (!Number.isFinite(price)) return MIN_SPOT_PRICE;
  return Math.max(MIN_SPOT_PRICE, price);
}
