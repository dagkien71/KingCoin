import type { FuturesSide } from "@/types/futures.type";

/** Khớp backend `futures-math.util.ts` — dùng cho uPnL live trên UI. */
export function notionalKc(size: number, markPrice: number): number {
  return Math.abs(size) * markPrice;
}

export function unrealizedPnlKc(
  side: FuturesSide,
  size: number,
  entryPrice: number,
  markPrice: number
): number {
  if (side === "long") {
    return size * (markPrice - entryPrice);
  }
  return size * (entryPrice - markPrice);
}

export function marginRatio(
  marginKc: number,
  uPnl: number,
  size: number,
  markPrice: number
): number {
  const notional = notionalKc(size, markPrice);
  if (notional <= 0) return 0;
  return (marginKc + uPnl) / notional;
}

export function sizeFromMargin(
  marginKc: number,
  leverage: number,
  markPrice: number
): number {
  if (markPrice <= 0 || leverage <= 0) return 0;
  return (marginKc * leverage) / markPrice;
}

export function estimateLiqPrice(
  side: FuturesSide,
  entryPrice: number,
  leverage: number,
  maintenanceRate: number
): number {
  const initialRate = 1 / leverage;
  if (side === "long") {
    return entryPrice * (1 - initialRate + maintenanceRate);
  }
  return entryPrice * (1 + initialRate - maintenanceRate);
}

export function roePercent(unrealizedPnlKc: number, marginKc: number): number {
  if (!marginKc || marginKc <= 0) return 0;
  return (unrealizedPnlKc / marginKc) * 100;
}

/** Khoảng cách giá mark → giá thanh lý (%). */
export function liqDistancePct(
  side: FuturesSide,
  markPrice: number,
  liqPrice: number
): number {
  if (!markPrice || markPrice <= 0 || !liqPrice) return 0;
  if (side === "long") {
    return ((markPrice - liqPrice) / markPrice) * 100;
  }
  return ((liqPrice - markPrice) / markPrice) * 100;
}

/** Thanh sức khỏe margin: 0 = sát thanh lý, 100|100 = an toàn. */
export function marginHealthPct(
  marginRatio: number,
  leverage: number,
  maintenanceRate: number
): number {
  const initial = 1 / leverage;
  if (initial <= maintenanceRate) return 100;
  const pct = ((marginRatio - maintenanceRate) / (initial - maintenanceRate)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function marginHealthTone(
  marginRatio: number,
  maintenanceRate: number
): "safe" | "warn" | "danger" {
  if (marginRatio <= maintenanceRate * 1.25) return "danger";
  if (marginRatio <= maintenanceRate * 3) return "warn";
  return "safe";
}

export type TpSlInput = {
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
};

/** Long: TP > ref, SL < ref. Short: TP < ref, SL > ref. */
export function validateTpSlPrices(
  side: FuturesSide,
  referencePrice: number,
  input: TpSlInput
): { takeProfitPrice: number | null; stopLossPrice: number | null; error?: string } {
  if (!referencePrice || referencePrice <= 0) {
    return { takeProfitPrice: null, stopLossPrice: null, error: "Giá tham chiếu không hợp lệ." };
  }
  let tp: number | null = null;
  let sl: number | null = null;
  const rawTp = input.takeProfitPrice;
  const rawSl = input.stopLossPrice;
  if (rawTp != null && String(rawTp).trim() !== "" && Number(rawTp) > 0) {
    tp = Number(rawTp);
    if (side === "long" && tp <= referencePrice) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Long: TP phải cao hơn mark." };
    }
    if (side === "short" && tp >= referencePrice) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Short: TP phải thấp hơn mark." };
    }
  }
  if (rawSl != null && String(rawSl).trim() !== "" && Number(rawSl) > 0) {
    sl = Number(rawSl);
    if (side === "long" && sl >= referencePrice) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Long: SL phải thấp hơn mark." };
    }
    if (side === "short" && sl <= referencePrice) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Short: SL phải cao hơn mark." };
    }
  }
  if (tp != null && sl != null) {
    if (side === "long" && sl >= tp) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Long: SL phải thấp hơn TP." };
    }
    if (side === "short" && sl <= tp) {
      return { takeProfitPrice: null, stopLossPrice: null, error: "Short: SL phải cao hơn TP." };
    }
  }
  return { takeProfitPrice: tp, stopLossPrice: sl };
}

export function parseOptionalPrice(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}
