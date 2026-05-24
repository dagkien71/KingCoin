# Module: `notification` (Backend)

**Path:** `backend/src/modules/notification/`  
**Spec:** [`NOTIFICATION_SPEC.md`](../NOTIFICATION_SPEC.md)

---

## API

| Method | Path |
|--------|------|
| GET | `/notifications` |
| GET | `/notifications/unread-count` |
| PATCH | `/notifications/read-all` |
| PATCH | `/notifications/:id/read` |
| GET/PATCH | `/notifications/preferences` |
| POST/DELETE | `/notifications/push-subscribe` |
| GET/POST/DELETE | `/price-alerts` |

---

## Services

| Service | Role |
|---------|------|
| `NotificationService` | `notify()`, inbox, preferences, dedupe |
| `WebPushService` | VAPID + gửi push |
| `PriceAlertService` | CRUD + `scanAndTrigger()` |
| `NotificationJobsService` | Cron price alerts (5s), quest claimable (1m) |

---

## Event wiring

Gọi `NotificationService.notify()` từ: `order`, `futures-engine`, `convert`, `quest`, `auth`, `token-crypto`.

---

## Env

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@kingcoin.local
```
