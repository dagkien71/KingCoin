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
            <p className="text-sm text-kc-muted mt-1">
              {unreadCount > 0
                ? `${unreadCount} chưa đọc`
                : "Tất cả đã đọc"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void markAllRead().then(load);
              }}
            >
              Đánh dấu đã đọc tất cả
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
              return (
                <li
                  key={item.id}
                  className={cn(
                    "px-4 py-3",
                    !item.readAt && "bg-violet-500/5"
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-kc-fg">{item.title}</p>
                      <p className="text-sm text-kc-muted mt-0.5">{item.body}</p>
                      <p className="text-xs text-kc-muted/70 mt-1">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 items-end">
                      {deeplink ? (
                        <Link
                          href={deeplink}
                          className="text-xs text-violet-400 hover:underline"
                          onClick={() => {
                            if (!item.readAt) void markRead(item.id);
                          }}
                        >
                          Mở
                        </Link>
                      ) : null}
                      {!item.readAt ? (
                        <button
                          type="button"
                          className="text-xs text-kc-muted hover:text-kc-fg"
                          onClick={() => void markRead(item.id).then(load)}
                        >
                          Đã đọc
                        </button>
                      ) : null}
                    </div>
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
