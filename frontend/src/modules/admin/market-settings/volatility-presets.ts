/** Khớp backend `VolatilityLevelId` — preset số lấy từ API. */
export type VolatilityLevelId =
  | "gentle"
  | "moderate"
  | "stable"
  | "strong"
  | "extreme";

export const VOLATILITY_LEVEL_ORDER: VolatilityLevelId[] = [
  "gentle",
  "moderate",
  "stable",
  "strong",
  "extreme",
];

/** Fallback khi API chưa tải — nhãn slider */
export const VOLATILITY_LEVEL_LABELS: Record<VolatilityLevelId, string> = {
  gentle: "Nhẹ",
  moderate: "Vừa",
  stable: "Ổn định",
  strong: "Mạnh",
  extreme: "Cực mạnh",
};

export function volatilityLevelIndex(id: VolatilityLevelId): number {
  return VOLATILITY_LEVEL_ORDER.indexOf(id);
}
