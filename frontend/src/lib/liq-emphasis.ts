/** Mức nhấn mạnh UI giá thanh lý theo khoảng cách tới mark (%). */
export type LiqEmphasisLevel = "calm" | "watch" | "danger";

export function liqEmphasisForDistance(distPct: number): LiqEmphasisLevel {
  if (!Number.isFinite(distPct) || distPct <= 5) return "danger";
  if (distPct <= 12) return "watch";
  return "calm";
}

export const LIQ_EMPHASIS = {
  calm: {
    box: "border-pink-500/40 bg-pink-500/10 ring-1 ring-pink-500/20",
    label: "text-pink-300",
    value: "text-rose-300",
    hint: "text-pink-200/75",
    icon: "text-pink-400",
  },
  watch: {
    box: "border-amber-500/50 bg-amber-500/12 ring-1 ring-amber-500/25",
    label: "text-amber-300",
    value: "text-yellow-300",
    hint: "text-amber-200/80",
    icon: "text-amber-400",
  },
  danger: {
    box: "border-red-500/55 bg-red-500/15 ring-1 ring-red-500/35",
    label: "text-red-300",
    value: "text-red-400",
    hint: "text-red-200/85",
    icon: "text-red-400",
  },
} as const satisfies Record<
  LiqEmphasisLevel,
  { box: string; label: string; value: string; hint: string; icon: string }
>;
