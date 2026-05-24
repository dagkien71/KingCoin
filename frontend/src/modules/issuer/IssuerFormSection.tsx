"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  step: number;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function IssuerFormSection({
  step,
  title,
  subtitle,
  icon,
  children,
  className,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0f1623]/90 to-[#0a0f18]/80 p-5 sm:p-6",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/[0.07] blur-2xl" />

      <div className="relative mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_-6px_rgba(16,185,129,0.4)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-kc-muted">
              {String(step).padStart(2, "0")}
            </span>
            <h2 className="text-base font-semibold text-kc-fg">{title}</h2>
          </div>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-kc-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="relative">{children}</div>
    </motion.section>
  );
}
