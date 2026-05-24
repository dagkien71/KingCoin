"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onStart: () => void;
  onLater: () => void;
};

export default function TourWelcomeModal({ open, onStart, onLater }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onLater}
      />
      <div
        role="dialog"
        aria-labelledby="tour-welcome-title"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-md rounded-xl border border-kc-border bg-kc-elevated p-6 shadow-kc",
          "animate-fade-in"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-kc-accent">
          Hướng dẫn mới
        </p>
        <h2
          id="tour-welcome-title"
          className="mt-2 text-xl font-semibold text-kc-fg"
        >
          Bạn muốn xem hướng dẫn nhanh ~2 phút?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-kc-muted">
          Chúng tôi sẽ chỉ từng bước: tìm token, giao dịch Spot, ví, nhiệm vụ và
          chuyển đổi — phù hợp nếu bạn mới tham gia thị trường KingCoin.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" type="button" onClick={onLater}>
            Để sau
          </Button>
          <Button variant="primary" type="button" onClick={onStart}>
            Bắt đầu
          </Button>
        </div>
      </div>
    </div>
  );
}
