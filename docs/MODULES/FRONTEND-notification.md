# Module: Notifications (Frontend)

**Spec:** [`NOTIFICATION_SPEC.md`](../NOTIFICATION_SPEC.md)

---

## Files

| File | Role |
|------|------|
| `context/notification-context.tsx` | Provider, WS listener, toast foreground |
| `lib/notification-api.ts` | REST |
| `lib/user-realtime-socket.ts` | Socket + JWT |
| `lib/register-service-worker.ts` | SW + Web Push subscribe |
| `public/sw.js` | Push handler |
| `components/notifications/NotificationBell.tsx` | Header dropdown |
| `components/notifications/PriceAlertPanel.tsx` | Form cảnh báo giá |
| `pages/notifications/index.tsx` | Inbox full page |
| `hooks/useGlobalTradingNotify.ts` | Refetch balances on trading notifications |

---

## Usage

- `NotificationProvider` bọc app trong `_app.tsx`.
- Bell trong `header.tsx` (user đã login).
- `PriceAlertPanel` trên trade / futures / token detail.

---

## Web Push (dev)

- Chỉ hoạt động trên `localhost` hoặc HTTPS.
- Cần `NEXT_PUBLIC_VAPID_PUBLIC_KEY` khớp backend.
