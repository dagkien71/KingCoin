import type { MarketPreset } from "@/modules/admin/market-control-presets";
import type { ReactNode } from "react";

export function toLocalDatetimeValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatScheduleTime(ms: number): string {
  return new Date(ms).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRemainingMs(ms: number): string {
  if (ms <= 0) return "0 phút";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `~${totalMin} phút còn lại`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `~${h}h ${m}p còn lại` : `~${h}h còn lại`;
}

export const TONE_STYLES: Record<MarketPreset["tone"], string> = {
  up: "border-kc-up/40 bg-kc-up/[0.06] hover:border-kc-up/70 hover:bg-kc-up/10 shadow-[0_0_24px_-8px_rgba(34,197,94,0.25)]",
  down: "border-kc-down/40 bg-kc-down/[0.06] hover:border-kc-down/70 hover:bg-kc-down/10 shadow-[0_0_24px_-8px_rgba(239,68,68,0.2)]",
  neutral:
    "border-kc-border/80 bg-white/[0.02] hover:border-kc-border-strong hover:bg-white/[0.04]",
  warn: "border-amber-500/40 bg-amber-500/[0.06] hover:border-amber-500/70 hover:bg-amber-500/10 shadow-[0_0_24px_-8px_rgba(245,158,11,0.2)]",
  accent:
    "border-violet-500/40 bg-violet-500/[0.06] hover:border-violet-400/70 hover:bg-violet-500/10 shadow-[0_0_24px_-8px_rgba(139,92,246,0.25)]",
};

export function StatBox({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-lg border border-violet-500/10 bg-[#0a0812]/80 px-3 py-2">
      <p className="text-xs text-kc-muted">{label}</p>
      <p
        className={`num mt-0.5 text-sm font-semibold ${
          ok === undefined ? "text-kc-fg" : ok ? "text-kc-up" : "text-kc-muted"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs text-kc-muted">
      {label}
      {children}
    </label>
  );
}
