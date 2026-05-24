import { FuturesSide } from '@prisma/client';

export function notionalKc(size: number, markPrice: number): number {
  return Math.abs(size) * markPrice;
}

/** Giá vào bình quân khi cộng thêm size cùng chiều. */
export function mergeEntryPrice(
  existingSize: number,
  existingEntry: number,
  addSize: number,
  addPrice: number,
): number {
  const total = existingSize + addSize;
  if (total <= 0) return addPrice;
  return (existingSize * existingEntry + addSize * addPrice) / total;
}

/** Đòn bẩy hiệu dụng sau gộp vị thế (notional / margin). */
export function effectiveLeverage(
  size: number,
  markPrice: number,
  marginKc: number,
  maxLeverage: number,
): number {
  if (marginKc <= 0 || markPrice <= 0) return 1;
  const lev = Math.round(notionalKc(size, markPrice) / marginKc);
  return Math.min(Math.max(1, lev), maxLeverage);
}

export function sizeFromMargin(
  marginKc: number,
  leverage: number,
  markPrice: number,
): number {
  if (markPrice <= 0 || leverage <= 0) return 0;
  return (marginKc * leverage) / markPrice;
}

export function marginFromSize(
  size: number,
  leverage: number,
  markPrice: number,
): number {
  if (leverage <= 0) return 0;
  return (Math.abs(size) * markPrice) / leverage;
}

export function unrealizedPnlKc(
  side: FuturesSide,
  size: number,
  entryPrice: number,
  markPrice: number,
): number {
  if (side === FuturesSide.long) {
    return size * (markPrice - entryPrice);
  }
  return size * (entryPrice - markPrice);
}

export function marginRatio(
  marginKc: number,
  uPnl: number,
  size: number,
  markPrice: number,
): number {
  const notional = notionalKc(size, markPrice);
  if (notional <= 0) return 0;
  return (marginKc + uPnl) / notional;
}

export function estimateLiqPrice(
  side: FuturesSide,
  entryPrice: number,
  leverage: number,
  maintenanceRate: number,
): number {
  const initialRate = 1 / leverage;
  if (side === FuturesSide.long) {
    return entryPrice * (1 - initialRate + maintenanceRate);
  }
  return entryPrice * (1 + initialRate - maintenanceRate);
}

export function closeReturnKc(
  marginPortion: number,
  uPnlPortion: number,
): number {
  return Math.max(0, marginPortion + uPnlPortion);
}

export type TpSlInput = {
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
};

/** Long: TP > ref, SL < ref. Short: TP < ref, SL > ref. */
export function validateTpSlPrices(
  side: FuturesSide,
  referencePrice: number,
  input: TpSlInput,
): { takeProfitPrice: number | null; stopLossPrice: number | null } {
  if (!referencePrice || referencePrice <= 0) {
    throw new Error('Giá tham chiếu không hợp lệ.');
  }
  let tp: number | null = null;
  let sl: number | null = null;
  if (input.takeProfitPrice != null && input.takeProfitPrice > 0) {
    tp = input.takeProfitPrice;
    if (side === FuturesSide.long && tp <= referencePrice) {
      throw new Error('Long: TP phải cao hơn giá hiện tại.');
    }
    if (side === FuturesSide.short && tp >= referencePrice) {
      throw new Error('Short: TP phải thấp hơn giá hiện tại.');
    }
  }
  if (input.stopLossPrice != null && input.stopLossPrice > 0) {
    sl = input.stopLossPrice;
    if (side === FuturesSide.long && sl >= referencePrice) {
      throw new Error('Long: SL phải thấp hơn giá hiện tại.');
    }
    if (side === FuturesSide.short && sl <= referencePrice) {
      throw new Error('Short: SL phải cao hơn giá hiện tại.');
    }
  }
  if (tp != null && sl != null) {
    if (side === FuturesSide.long && sl >= tp) {
      throw new Error('Long: SL phải thấp hơn TP.');
    }
    if (side === FuturesSide.short && sl <= tp) {
      throw new Error('Short: SL phải cao hơn TP.');
    }
  }
  return { takeProfitPrice: tp, stopLossPrice: sl };
}

export function isTakeProfitHit(
  side: FuturesSide,
  mark: number,
  tp: number,
): boolean {
  return side === FuturesSide.long ? mark >= tp : mark <= tp;
}

export function isStopLossHit(
  side: FuturesSide,
  mark: number,
  sl: number,
): boolean {
  return side === FuturesSide.long ? mark <= sl : mark >= sl;
}
