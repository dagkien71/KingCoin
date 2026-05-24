"use client";

import { cn } from "@/lib/cn";
import type { TickerFlash } from "@/context/market-live-context";
import { ReactNode } from "react";

type Props = {
  flash?: TickerFlash | null;
  className?: string;
  children: ReactNode;
};

/** Highlight ngắn khi giá vừa đổi (sau throttle display) */
export function PriceFlash({ flash, className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm transition-[background-color,color] duration-300",
        flash === "up" && "bg-kc-up/20 text-kc-up",
        flash === "down" && "bg-kc-down/20 text-kc-down",
        className
      )}
    >
      {children}
    </span>
  );
}
