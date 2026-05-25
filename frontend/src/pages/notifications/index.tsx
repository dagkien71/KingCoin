import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotificationContext } from "@/context/notification-context";
import {
  fetchNotifications,
  type NotificationItem,
} from "@/lib/notification-api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { markRead, markAllRead, unreadCount, refresh } =
    useNotificationContext();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications({
        limit: 50,
        unreadOnly: filter === "unread",
      });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
    void refresh();
  }, [load, refresh]);

  return (
    <>
      <Head>
        <title>Thông báo — KingCoin</title>
      </Head>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-kc-fg">Thông báo</h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-kc-muted mt-1">
                <span className="mr-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-violet-500 px-2 text-xs font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
                tin chưa đọc
              </p>
            ) : (
              <p className="text-sm text-kc-muted mt-1">Không có tin mới</p>
            )}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void markAllRead().then(load);
              }}
            >
              Đọc tất cả
            </Button>
          ) : null}
        </div>

        <div className="mb-4 flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                filter === f
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-kc-muted hover:text-kc-fg"
              )}
            >
              {f === "all" ? "Tất cả" : "Chưa đọc"}
              {f === "unread" && unreadCount > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-kc-border rounded-xl border border-kc-border overflow-hidden">
          {loading ? (
            <li className="px-4 py-8 text-center text-kc-muted">Đang tải…</li>
          ) : items.length === 0 ? (
            <li className="px-4 py-8 text-center text-kc-muted">
              Không có thông báo
            </li>
          ) : (
            items.map((item) => {
              const deeplink =
                typeof item.payload?.deeplink === "string"
                  ? item.payload.deeplink
                  : undefined;
              const unread = item.readAt == null;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "px-4 py-3",
                    unread && "bg-violet-500/5"
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {unread ? (
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500"
                          aria-hidden
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium text-kc-fg">{item.title}</p>
                        <p className="text-sm text-kc-muted mt-0.5">
                          {item.body}
                        </p>
                        <p className="text-xs text-kc-muted/70 mt-1">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                      {deeplink ? (
                        <Link
                          href={deeplink}
                          className="shrink-0 text-xs text-violet-400 hover:underline"
                          onClick={() => {
                            if (!item.readAt) void markRead(item.id);
                          }}
                        >
                          Mở
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
            })
          )}
        </ul>
      </div>
    </>
  );
}
