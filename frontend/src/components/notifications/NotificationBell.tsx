import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineBell } from "react-icons/hi";
import { cn } from "@/lib/cn";
import { useNotificationsOptional } from "@/context/notification-context";
import type { NotificationItem } from "@/lib/notification-api";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Vừa xong";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} phút`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} giờ`;
  return d.toLocaleDateString("vi-VN");
}

function ItemRow({
  item,
  unreadIndex,
  onRead,
}: {
  item: NotificationItem;
  /** Số thứ tự trong các tin chưa đọc (1, 2, 3…) */
  unreadIndex?: number;
  onRead: (id: string) => void;
}) {
  const deeplink =
    typeof item.payload?.deeplink === "string"
      ? item.payload.deeplink
      : "/notifications";
  return (
    <Link
      href={deeplink}
      onClick={() => {
        if (!item.readAt) void onRead(item.id);
      }}
      className={cn(
        "block px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06]",
        !item.readAt && "bg-violet-500/10"
      )}
    >
      <div className="flex items-start gap-2">
        {!item.readAt && unreadIndex != null ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white"
            aria-hidden
          >
            {unreadIndex > 99 ? "99+" : unreadIndex}
          </span>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <p className="min-w-0 flex-1 font-medium text-kc-fg line-clamp-1">
          {item.title}
        </p>
      </div>
      <p className="text-xs text-kc-muted line-clamp-2 mt-0.5">{item.body}</p>
      <p className="text-[10px] text-kc-muted/80 mt-1">
        {formatTime(item.createdAt)}
      </p>
    </Link>
  );
}

export default function NotificationBell() {
  const ctx = useNotificationsOptional();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!ctx) return null;

  const { items, unreadCount, markRead, markAllRead, enableWebPush, refresh } =
    ctx;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-kc-border text-kc-fg hover:bg-white/[0.04]"
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} chưa đọc`
            : "Thông báo"
        }
      >
        <HiOutlineBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-kc-bg bg-violet-500 px-1 text-[11px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-kc-border bg-kc-bg shadow-xl">
          <div className="flex items-center justify-between border-b border-kc-border px-3 py-2">
            <span className="text-sm font-semibold text-kc-fg">
              Thông báo
              {unreadCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs text-violet-400 hover:underline"
                onClick={() => void markAllRead()}
              >
                Đọc tất cả
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-kc-border/60">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-kc-muted">
                Chưa có thông báo
              </p>
            ) : (
              (() => {
                let unreadIdx = 0;
                return items.slice(0, 10).map((item) => {
                  const num = !item.readAt ? ++unreadIdx : undefined;
                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      unreadIndex={num}
                      onRead={markRead}
                    />
                  );
                });
              })()
            )}
          </div>
          <div className="flex flex-col gap-1 border-t border-kc-border p-2">
            <Link
              href="/notifications"
              className="rounded-lg px-3 py-2 text-center text-xs font-medium text-violet-400 hover:bg-white/[0.04]"
              onClick={() => setOpen(false)}
            >
              Xem tất cả
            </Link>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-center text-[11px] text-kc-muted hover:text-kc-fg"
              onClick={() => void enableWebPush()}
            >
              Bật thông báo trình duyệt
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
