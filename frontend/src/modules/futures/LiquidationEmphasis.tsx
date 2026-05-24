"use client";

import {
  LIQ_EMPHASIS,
  liqEmphasisForDistance,
} from "@/lib/liq-emphasis";
import clsx from "clsx";
import { HiOutlineExclamationCircle } from "react-icons/hi";

type Props = {
  price: string;
  distancePct: number;
  /** Nhãn chính — mặc định "Giá thanh lý" */
  label?: string;
  compact?: boolean;
  className?: string;
};

export function LiquidationEmphasis({
  price,
  distancePct,
  label = "Giá thanh lý",
  compact = false,
  className,
}: Props) {
  const level = liqEmphasisForDistance(distancePct);
  const styles = LIQ_EMPHASIS[level];

  return (
    <div
      className={clsx(
        "rounded-lg border",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        styles.box,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <HiOutlineExclamationCircle
            className={clsx(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              styles.icon,
              level === "danger" && "animate-pulse"
            )}
            aria-hidden
          />
          <div>
            <p
              className={clsx(
                "font-semibold uppercase tracking-wide",
                compact ? "text-[9px]" : "text-[10px]",
                styles.label
              )}
            >
              {label}
            </p>
            <p className={clsx("mt-0.5 text-[10px]", styles.hint)}>
              Cách mark ~{distancePct.toFixed(2)}%
              {level === "danger"
                ? " · Rất gần thanh lý"
                : level === "watch"
                  ? " · Theo dõi sát"
                  : null}
            </p>
          </div>
        </div>
        <span
          className={clsx(
            "num shrink-0 text-right font-bold",
            compact ? "text-xs" : "text-sm",
            styles.value
          )}
        >
          {price}
        </span>
      </div>
    </div>
  );
}
