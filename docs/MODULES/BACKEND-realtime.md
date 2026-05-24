# Module: `realtime` (Backend)

**Path:** `backend/src/modules/realtime/`  
**Namespace:** Socket.IO `/realtime`

---

## 1. Chuẩn tham chiếu (ngoài)

| Kênh | Binance WebSocket |
|------|-------------------|
| `ticker@symbol` | 24h ticker |
| `depth@symbol` | Order book diff |
| `trade@symbol` | Agg trades |
| `!ticker@arr` | All symbols |

---

## 2. Mục đích

Đẩy **tín hiệu thay đổi** tới FE để cập nhật **cục bộ** (giá, sổ lệnh, tape) không reload trang.

---

## 3. Protocol

**Client → Server**

| Event | Body | Hành vi |
|-------|------|---------|
| `subscribe` | `{ channel }` | `socket.join(channel)` |
| `unsubscribe` | `{ channel }` | `leave` |

**Server → Client**

| Event | Channel | Payload |
|-------|---------|---------|
| `ticker` | `ticker:{tokenId}` | `{ tokenId, price, volumes, at }` |
| `orderbook` | `orderbook:{tokenId}` | `{ tokenId, at }` |
| `trade` | `trades:{tokenId}` | fill summary |
| `markets` | `markets` | `{ tokenId, price?, volumes?, at }` |
| `notification` | `user:{userId}` (JWT) | payload thông báo — xem [`NOTIFICATION_SPEC.md`](../NOTIFICATION_SPEC.md) |

**Kết nối có auth:** client gửi `auth: { token: accessToken }` khi connect Socket.IO; server verify JWT và join room user. Không cho `subscribe` channel `user:*` của user khác.

---

## 4. Ai broadcast?

| Nguồn | Events |
|-------|--------|
| `TokenCryptoService.updatePrice` | `ticker` + `markets` |
| `MarketMakerService` refresh | `orderbook`, `ticker` |
| `OrderService` match | `trade`, (orderbook via trade handler) |

---

## 5. FE contract (tham chiếu)

- Global subscribe `markets` trong `_app` `MarketLiveProvider`.
- Trang trade subscribe thêm `ticker|orderbook|trades:{tokenId}`.
- Giá: patch từ WS (`useLiveTicker`), không refetch cả trang.
- Orderbook: `useLiveFetch` **silent** refetch REST.

---

## 6. Gap

| Chuẩn ngoài | KingCoin |
|-------------|----------|
| Depth diff deltas | Full REST refetch on signal |
| Kline stream | REST logs + chart |
| Auth private user stream | **Đã có:** JWT `auth.token` → auto-join `user:{userId}`; event `notification` |

---

## 7. Ops

- CORS `*` trên gateway (dev); production nên thu hẹp origin.
- URL: `{API_ORIGIN}/realtime`
