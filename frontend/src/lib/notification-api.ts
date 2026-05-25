import { Api } from "@/api";
import { IResponse } from "@/types/response";

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  priority: "critical" | "high" | "normal" | "low";
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResult = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export type PriceAlertRow = {
  id: string;
  userId: string;
  tokenId: string;
  marketKind: "spot" | "futures";
  direction: "above" | "below";
  targetPrice: number;
  active: boolean;
  triggeredAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(params?: {
  limit?: number;
  unreadOnly?: boolean;
  readOnly?: boolean;
  cursor?: string;
}) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.unreadOnly) q.set("unreadOnly", "true");
  if (params?.readOnly) q.set("readOnly", "true");
  if (params?.cursor) q.set("cursor", params.cursor);
  const suffix = q.toString() ? `?${q}` : "";
  const res = await Api.get<IResponse<NotificationListResult>>(
    `/notifications${suffix}`
  );
  return res.data.data;
}

export async function fetchUnreadCount() {
  const res = await Api.get<IResponse<{ count: number }>>(
    "/notifications/unread-count"
  );
  return res.data.data.count;
}

export async function markNotificationRead(id: string) {
  const res = await Api.patch<IResponse<NotificationItem>>(
    `/notifications/${id}/read`
  );
  return res.data.data;
}

export async function markAllNotificationsRead() {
  const res = await Api.patch<IResponse<{ count: number }>>(
    "/notifications/read-all"
  );
  return res.data.data.count;
}

export async function fetchNotificationPreferences() {
  const res = await Api.get<
    IResponse<{
      webPushEnabled: boolean;
      disabledTypes: string[];
      vapidPublicKey: string | null;
    }>
  >("/notifications/preferences");
  return res.data.data;
}

export async function updateNotificationPreferences(body: {
  webPushEnabled?: boolean;
  disabledTypes?: string[];
}) {
  const res = await Api.patch<IResponse<unknown>>(
    "/notifications/preferences",
    body
  );
  return res.data.data;
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  await Api.post("/notifications/push-subscribe", {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });
}

export async function unsubscribePush(endpoint: string) {
  await Api.delete("/notifications/push-subscribe", { data: { endpoint } });
}

export async function fetchPriceAlerts(tokenId?: string) {
  const q = tokenId ? `?tokenId=${encodeURIComponent(tokenId)}` : "";
  const res = await Api.get<IResponse<PriceAlertRow[]>>(`/price-alerts${q}`);
  return res.data.data;
}

export async function createPriceAlert(body: {
  tokenId: string;
  marketKind?: "spot" | "futures";
  direction: "above" | "below";
  targetPrice: number;
}) {
  const res = await Api.post<IResponse<PriceAlertRow>>("/price-alerts", body);
  return res.data.data;
}

export async function deletePriceAlert(id: string) {
  await Api.delete(`/price-alerts/${id}`);
}
