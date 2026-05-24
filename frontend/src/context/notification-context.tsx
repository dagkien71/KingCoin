import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hook";
import { RootState } from "@/store/store";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribePush,
  fetchNotificationPreferences,
  type NotificationItem,
} from "@/lib/notification-api";
import {
  connectUserSocket,
  disconnectUserSocket,
} from "@/lib/user-realtime-socket";
import { registerKingCoinServiceWorker } from "@/lib/register-service-worker";

type NotificationContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  enableWebPush: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext requires NotificationProvider");
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { sessionToken } = useAppSelector((s: RootState) => s.sessionToken);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications({ limit: 30 }),
        fetchUnreadCount(),
      ]);
      setItems(list.items);
      setUnreadCount(count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      setItems([]);
      setUnreadCount(0);
      disconnectUserSocket();
      return;
    }
    void refresh();
    void registerKingCoinServiceWorker();

    const socket = connectUserSocket(sessionToken);
    const onNotification = (payload: NotificationItem) => {
      if (!payload?.id) return;
      if (seenIds.current.has(payload.id)) return;
      seenIds.current.add(payload.id);
      if (seenIds.current.size > 300) {
        const arr = [...seenIds.current];
        seenIds.current = new Set(arr.slice(-150));
      }

      setItems((prev) => {
        if (prev.some((n) => n.id === payload.id)) return prev;
        return [payload, ...prev].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);

      const priority = payload.priority;
      const showToast =
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        (priority === "critical" || priority === "high");

      if (showToast) {
        toast.info(payload.title, { autoClose: 4000 });
      }
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [sessionToken, refresh]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  const enableWebPush = useCallback(async () => {
    try {
      const prefs = await fetchNotificationPreferences();
      const key =
        prefs.vapidPublicKey ??
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
        "";
      if (!key) {
        toast.error("Chưa cấu hình VAPID cho Web Push.");
        return false;
      }
      const { subscribeWebPush } = await import(
        "@/lib/register-service-worker"
      );
      const sub = await subscribeWebPush(key);
      if (!sub) return false;
      await subscribePush(sub.toJSON());
      toast.success("Đã bật thông báo trình duyệt.");
      return true;
    } catch {
      toast.error("Không bật được Web Push.");
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      enableWebPush,
    }),
    [items, unreadCount, loading, refresh, markRead, markAllRead, enableWebPush]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/** Optional hook — không throw khi ngoài provider */
export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
