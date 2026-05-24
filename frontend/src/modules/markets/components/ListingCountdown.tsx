"use client";

import { cn } from "@/lib/cn";
import { parseCountdown, type CountdownParts } from "@/types/upcoming-listing.type";
import { useEffect, useState } from "react";

export function useCountdown(targetIso: string): CountdownParts {
  const [parts, setParts] = useState(() => parseCountdown(targetIso));

  useEffect(() => {
    const tick = () => setParts(parseCountdown(targetIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return parts;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Countdown gọn — một dòng, phù hợp card nhỏ */
export function CountdownMini({
  targetIso,
  className,
}: {
  targetIso: string;
  className?: string;
}) {
  const { days, hours, minutes, seconds, isPast, isLive } =
    useCountdown(targetIso);

  if (isLive || isPast) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-kc-up/10 px-2 py-0.5 text-[10px] font-semibold text-kc-up ring-1 ring-kc-up/25",
          className
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kc-up opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-kc-up" />
        </span>
        Sắp mở
      </span>
    );
  }

  const segments = [
    { v: days, u: "d" },
    { v: pad(hours), u: "h" },
    { v: pad(minutes), u: "m" },
    { v: pad(seconds), u: "s" },
  ];

  return (
    <div
      className={cn("inline-flex items-center gap-0.5 tabular-nums", className)}
      role="timer"
      aria-live="polite"
    >
      {segments.map((s, i) => (
        <span key={s.u} className="inline-flex items-baseline">
          {i > 0 ? (
            <span className="px-0.5 text-[9px] text-kc-muted/60">:</span>
          ) : null}
          <span className="num text-xs font-bold text-kc-accent">{s.v}</span>
          <span className="text-[8px] text-kc-muted">{s.u}</span>
        </span>
      ))}
    </div>
  );
}

/** Khối countdown lớn — giữ cho trang chi tiết nếu cần */
export function CountdownBlocks({
  targetIso,
  compact,
}: {
  targetIso: string;
  compact?: boolean;
}) {
  const { days, hours, minutes, seconds, isPast, isLive } =
    useCountdown(targetIso);

  if (isLive || isPast) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-kc-up/10 px-2 py-1 text-[10px] font-semibold text-kc-up ring-1 ring-kc-up/25">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kc-up opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-kc-up" />
        </span>
        Sắp mở cửa
      </div>
    );
  }

  const units = [
    { label: "d", value: pad(days) },
    { label: "h", value: pad(hours) },
    { label: "m", value: pad(minutes) },
    { label: "s", value: pad(seconds) },
  ];

  return (
    <div
      className={cn("inline-flex gap-1", compact && "gap-0.5")}
      role="timer"
      aria-live="polite"
    >
      {units.map((u) => (
        <div
          key={u.label}
          className={cn(
            "flex min-w-[2rem] flex-col items-center rounded-md border border-kc-accent/20 bg-kc-bg/60 py-1",
            compact ? "px-1" : "px-1.5"
          )}
        >
          <span className="num text-sm font-bold tabular-nums text-kc-accent">
            {u.value}
          </span>
          <span className="text-[8px] font-medium uppercase text-kc-muted">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
