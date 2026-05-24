import { formatPnLLine } from "@/modules/account/portfolio";

export function formatKc(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pnlTone(amount: number): "success" | "warn" | "default" {
  if (amount > 0) return "success";
  if (amount < 0) return "warn";
  return "default";
}

export function renderPnl(amount?: number | null, pct?: number | null) {
  const { text, positive } = formatPnLLine(amount, pct);
  return { text, positive };
}
