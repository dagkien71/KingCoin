# Đặc tả hệ thống thông báo — KingCoin

Tham chiếu kỹ thuật: [`MODULES/BACKEND-notification.md`](MODULES/BACKEND-notification.md), [`MODULES/FRONTEND-notification.md`](MODULES/FRONTEND-notification.md), [`UI_DATA_FRESHNESS_SPEC.md`](UI_DATA_FRESHNESS_SPEC.md).

---

## 1. Mục tiêu

- **Inbox** lưu lịch sử thông báo (MongoDB), đọc/đánh dấu đã đọc.
- **Bell** trên header: badge số chưa đọc, dropdown 10 mục gần nhất.
- **WebSocket** kênh `user:{userId}` — event `notification` khi app đang mở.
- **Web Push** (VAPID) khi tab đóng — user bật trong cài đặt.
- **Toast** foreground (priority ≥ high) qua `NotificationProvider`.
- **Cảnh báo giá** do user đặt (above/below, one-shot).

**Không Phase 1:** email, SMS, deposit/withdraw, comment moderation, login security alerts.

---

## 2. Kênh giao

| Kênh | Mô tả |
|------|--------|
| `in_app` | Ghi `Notification` + WS |
| `toast` | `react-toastify` khi tab visible |
| `web_push` | Service worker + `web-push` (nếu đã subscribe) |

---

## 3. NotificationType & ưu tiên

| Type | Priority | Khi phát |
|------|----------|----------|
| `ORDER_PLACED` | normal | Lệnh treo sau đặt |
| `ORDER_PARTIAL_FILL` | high | Khớp một phần |
| `ORDER_FILLED` | high | Khớp hết |
| `ORDER_CANCELLED` | normal | Hủy lệnh |
| `FUTURES_OPENED` | normal | Mở vị thế |
| `FUTURES_CLOSED` | high | Đóng vị thế |
| `FUTURES_LIQUIDATED` | critical | Thanh lý |
| `FUTURES_MARGIN_WARNING` | high | Margin ratio gần ngưỡng (debounce/position) |
| `CONVERT_SUCCESS` | normal | Swap thành công |
| `CONVERT_FAILED` | normal | (dự phòng API) |
| `QUEST_CLAIMABLE` | normal | Đủ điều kiện claim |
| `QUEST_CLAIMED` | normal | Đã nhận KC |
| `REFERRAL_MILESTONE` | normal | Đạt mốc giới thiệu |
| `SIGNUP_BONUS` | low | KC đăng ký |
| `LISTING_FEE` | normal | Trừ phí listing |
| `TOKEN_LISTED` | normal | Token phát hành thành công |
| `PRICE_ALERT` | high | Giá chạm ngưỡng |
| `ADMIN_ORDER_PLACED` | normal | **Chỉ admin** — user (không bot) đặt lệnh spot |

---

## 4. Payload chuẩn

```json
{
  "deeplink": "/trade/slr",
  "tokenId": "uuid",
  "symbol": "SLR",
  "orderId": "...",
  "positionId": "...",
  "amountKc": 100,
  "pnlKc": -12.5,
  "dedupeKey": "ORDER_FILL:fillId:userId"
}
```

---

## 5. REST API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/notifications` | Danh sách (limit, cursor, unreadOnly) |
| GET | `/notifications/unread-count` | Số chưa đọc |
| PATCH | `/notifications/:id/read` | Đánh dấu đã đọc |
| PATCH | `/notifications/read-all` | Đọc hết |
| GET/PATCH | `/notifications/preferences` | Web push + opt-out types |
| POST | `/notifications/push-subscribe` | Lưu subscription |
| DELETE | `/notifications/push-subscribe` | Hủy theo endpoint |
| GET/POST/DELETE | `/price-alerts` | CRUD cảnh báo giá |

---

## 6. WebSocket

- Namespace `/realtime` (hiện có).
- Client gửi JWT: `auth: { token: accessToken }`.
- Server auto-join `user:{userId}`; **cấm** subscribe `user:*` khác.
- Event: `notification` — payload giống REST item.

---

## 7. Cảnh báo giá

- `marketKind`: `spot` | `futures` — giá spot = `TokenCrypto.price`, futures = mark price.
- `direction`: `above` | `below`.
- One-shot: sau trigger → `active=false`, `triggeredAt` set.
- Cron ~5s quét alerts active.

---

## 8. Giới hạn & dedupe

- Tối đa **500** bản ghi/user; cron dọn bản cũ.
- `dedupeKey` trùng trong **24h** → bỏ qua (tránh spam fill).

---

## 9. Env

| Biến | Mô tả |
|------|--------|
| `VAPID_PUBLIC_KEY` | Web Push public |
| `VAPID_PRIVATE_KEY` | Web Push private |
| `VAPID_SUBJECT` | `mailto:...` hoặc URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | FE hiển thị/subscribe |

---

## 10. Phase 2 (chưa code)

`ORDER_AMEND`, deposit/withdraw, admin broadcast, comment reply, 2FA login alert.
