import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "accent" | "up" | "down" | "muted";
};

export function Badge({
  className,
  tone = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "default" &&
          "bg-kc-surface text-kc-fg border border-kc-border",
        tone === "accent" && "bg-kc-accent-muted text-kc-accent border border-kc-accent/25",
        tone === "up" && "bg-kc-up/15 text-kc-up",
        tone === "down" && "bg-kc-down/15 text-kc-down",
        tone === "muted" && "bg-white/[0.04] text-kc-muted",
        className
      )}
      {...props}
    />
  );
}
