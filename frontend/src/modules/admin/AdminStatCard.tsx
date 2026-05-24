import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warn" | "muted";
  className?: string;
};

const toneClass = {
  default: "border-white/[0.08] bg-white/[0.03]",
  success: "border-emerald-500/25 bg-emerald-500/[0.06]",
  warn: "border-amber-500/25 bg-amber-500/[0.06]",
  muted: "border-kc-border/40 bg-black/20",
};

export function AdminStatCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        toneClass[tone],
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-kc-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-kc-fg">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-kc-muted">{hint}</p> : null}
    </div>
  );
}
