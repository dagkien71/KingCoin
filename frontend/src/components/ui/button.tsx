import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", disabled, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-kc-bg disabled:pointer-events-none disabled:opacity-45 rounded-lg",
          variant === "primary" &&
            "bg-kc-accent text-kc-bg shadow-kc-glow hover:bg-kc-accent-hover",
          variant === "secondary" &&
            "bg-kc-surface text-kc-fg border border-kc-border hover:bg-kc-elevated hover:border-kc-border-strong",
          variant === "ghost" &&
            "text-kc-muted hover:text-kc-fg hover:bg-white/[0.04]",
          variant === "danger" &&
            "bg-kc-down/15 text-kc-down border border-kc-down/30 hover:bg-kc-down/25",
          size === "sm" && "h-8 px-3 text-sm gap-1.5",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2",
          className
        )}
        {...props}
      />
    );
  }
);
