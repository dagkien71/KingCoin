/** Định dạng trục giá / legend — đồng bộ DbTokenPriceChart. */

export function formatChartPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
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
