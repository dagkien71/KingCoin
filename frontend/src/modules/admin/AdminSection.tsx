"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  step?: number;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminSection({
  step,
  title,
  subtitle,
  icon,
  children,
  className,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-[#12101c]/95 to-[#0a0812]/85 p-5 sm:p-6",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-600/[0.08] blur-2xl" />

      <div className="relative mb-4 flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {step != null ? (
              <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 font-mono text-[10px] text-violet-300/90">
                {String(step).padStart(2, "0")}
              </span>
            ) : null}
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
