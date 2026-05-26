import { resolveTokenPriceFractionDigits } from "@/utils/format-number";

/** Định dạng trục giá / legend — đồng bộ hiển thị giá token. */

export function formatChartPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  }
  const fd = resolveTokenPriceFractionDigits(abs);
  const rounded = Number(value.toFixed(fd));
  return rounded.toLocaleString("vi-VN", {
    minimumFractionDigits: fd,
    maximumFractionDigits: fd,
  });
}

export function formatChartVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatLegendTime(timeSec: number, showSeconds: boolean): string {
  const d = new Date(timeSec * 1000);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
  });
}
