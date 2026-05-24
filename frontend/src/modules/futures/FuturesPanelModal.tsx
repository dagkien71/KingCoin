"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineX } from "react-icons/hi";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
};

export function FuturesPanelModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="futures-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-[1] flex max-h-[min(90vh,640px)] w-full flex-col overflow-hidden rounded-t-2xl border border-kc-border bg-kc-elevated shadow-2xl sm:rounded-2xl",
          size === "lg" ? "sm:max-w-lg" : "sm:max-w-md"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kc-border px-4 py-3">
          <div>
            <h2
              id="futures-modal-title"
              className="text-sm font-bold text-kc-fg"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] text-kc-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-kc-muted transition hover:bg-white/[0.06] hover:text-kc-fg"
            aria-label="Đóng"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-kc-border bg-kc-surface/40 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
