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

function isUnread(item: NotificationItem) {
  return item.readAt == null;
}

function ItemRow({
  item,
  onRead,
}: {
  item: NotificationItem;
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
        isUnread(item) && "bg-violet-500/10"
      )}
    >
      <div className="flex items-start gap-2">
        {isUnread(item) ? (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500"
            aria-hidden
          />
        ) : null}
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

  const unreadFromItems = items.filter(isUnread).length;
  const badgeCount = Math.max(unreadCount, unreadFromItems);

  return (
    <div className="relative overflow-visible" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative flex h-9 w-9 items-center justify-center overflow-visible rounded-lg border border-kc-border text-kc-fg hover:bg-white/[0.04]"
        aria-label={
          badgeCount > 0
            ? `Thông báo, ${badgeCount} chưa đọc`
            : "Thông báo"
        }
      >
        <HiOutlineBell className="h-5 w-5" />
        {badgeCount > 0 ? (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-kc-bg">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-kc-border bg-kc-bg shadow-xl">
          <div className="flex items-center justify-between border-b border-kc-border px-3 py-2">
            <span className="text-sm font-semibold text-kc-fg">Thông báo</span>
            {badgeCount > 0 ? (
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
              items.slice(0, 10).map((item) => (
                <ItemRow key={item.id} item={item} onRead={markRead} />
              ))
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
