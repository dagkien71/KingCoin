"use client";

import { cn } from "@/lib/cn";
import type { SquareAuthor } from "@/types/square.type";
import type { ReactNode } from "react";

export function squareInitials(author: SquareAuthor): string {
  const u = author.username?.trim();
  if (u && u.length >= 2) return u.slice(0, 2).toUpperCase();
  return author.id.slice(-2).toUpperCase();
}

export function SquarePageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-screen bg-kc-bg px-4 py-8 sm:px-6",
        className
      )}
    >
      <div className="mx-auto max-w-xl space-y-6">{children}</div>
    </main>
  );
}

export function SquarePanel({
  children,
  className,
  noPadding,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-kc-border bg-kc-surface/80 shadow-kc-glow backdrop-blur-sm",
        !noPadding && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SquareAvatar({
  author,
  size = "md",
  className,
}: {
  author: SquareAuthor;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (author.avatar?.trim()) {
    return (
      <img
        src={author.avatar}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-kc-border", dim, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kc-accent/40 to-amber-600/20 font-semibold text-kc-accent ring-2 ring-kc-border/80",
        dim,
        className
      )}
    >
      {squareInitials(author)}
    </span>
  );
}

export function SquareKindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; className: string }> = {
    text: { label: "Bài viết", className: "bg-white/5 text-kc-muted" },
    order_spot: { label: "Spot", className: "bg-amber-500/15 text-amber-300" },
    order_futures: { label: "Futures", className: "bg-violet-500/15 text-violet-300" },
    poll: { label: "Bình chọn", className: "bg-sky-500/15 text-sky-300" },
  };
  const m = map[kind] ?? map.text;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        m.className
      )}
    >
      {m.label}
    </span>
  );
}

export function SquareEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-kc-border/80 bg-kc-surface/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kc-accent/10 text-2xl">
        ◇
      </div>
      <p className="font-medium text-kc-fg">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-kc-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SquareFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-kc-border bg-kc-surface/60 p-5"
        >
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-kc-elevated" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded bg-kc-elevated" />
              <div className="h-3 w-full rounded bg-kc-elevated/80" />
              <div className="h-3 w-4/5 rounded bg-kc-elevated/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const squareInputClass =
  "w-full rounded-xl border border-kc-border bg-kc-bg/60 px-3.5 py-2.5 text-sm text-kc-fg placeholder:text-kc-muted/70 transition focus:border-kc-accent/50 focus:outline-none focus:ring-2 focus:ring-kc-accent/20";

export const squareSegmentClass = (active: boolean, compact?: boolean) =>
  cn(
    "rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm",
    !compact && "flex-1",
    active
      ? "bg-kc-accent text-kc-bg shadow-sm"
      : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
  );
