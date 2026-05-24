import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-kc-border bg-kc-elevated px-3.5 text-sm text-kc-fg placeholder:text-kc-muted",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kc-accent/50 focus-visible:border-kc-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
