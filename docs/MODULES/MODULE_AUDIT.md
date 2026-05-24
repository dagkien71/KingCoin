# Kiểm tra module vs đặc tả (audit)

**Ngày audit:** 2026-05-21  
**Cách chạy lại:** `python3 scripts/audit-modules.py` (backend `http://localhost:3001`)

## Tóm tắt

| Module | Khớp đặc tả | Ghi chú |
|--------|-------------|---------|
| **health** | ✅ | `GET /health` → status ok |
| **auth** | ✅ | Register, login, seed KC 100k |
| **user** | ✅ | `/users/me`, balances |
| **token-crypto** | ✅ | List, detail by name, price, logs |
| **token-log** | ✅ | Chart logs có dữ liệu sau MM/trade |
| **order** | ✅ | Escrow treo lệnh + hủy hoàn KC + ledger `trade` / `order_cancel` |
| **ledger** | ✅ | Pagination OK; ghi đủ refType |
| **quest** | ✅ | 3 quest, claim + ledger quest |
| **convert** | ✅ | Swap KC↔token + ledger |
| **market-maker** | ✅ | Book 10 buy / sell (Demo), giá dao động, MM skip KC/KC |
| **realtime** | ✅ | WS connect; ticker/markets (cần `python-socketio` cho script) |
| **upload/casl** | ⚠️ | Không smoke trong audit; upload dùng khi create token |
| **FE build** | ✅ | Sau export `TokenVolumes` |
| **FE live** | ✅ | `useLiveTicker` / silent `useLiveFetch` theo đặc tả |
| **FE trade** | ⚠️ | Market = limit giá tham chiếu; TP/SL chặn gửi API |

---

## Chi tiết theo module

### auth + user

| Đặc tả | Thực tế |
|--------|---------|
| Register + bcrypt | ✅ |
| Login + JWT | ✅ |
| `INITIAL_KC_BALANCE` | ✅ User mới ~100 000 KC |
| Demo user seed | ⚠️ `demo@kingcoin.local` có thể **0 KC** (dữ liệu cũ) — không phải lỗi module |

### token-crypto + token-log

| Đặc tả | Thực tế |
|--------|---------|
| `GET /token-crypto/all` | ✅ |
| `GET /token-crypto/KingCoin` | ✅ |
| `GET /crypto-logs/:id` | ✅ (48+ logs trên KC) |
| Listing fee KC | ✅ (code có; cần user đủ KC) |
| `broadcastTicker` | ✅ |

### order + TradeFill

| Đặc tả | Thực tế |
|--------|---------|
| Price-time match | ✅ |
| Self-trade skip | ✅ |
| Settlement KC ↔ base | ✅ (đã test POST buy → 201) |
| `GET /orders/all` order book | ✅ |
| `GET /orders/trades/recent` | ✅ |
| `DELETE` cancel + **refund balance** | ❌ Repository xóa/cancel **không** `adjustBalance` |
| Ledger `refType=trade` | ❌ Chỉ adjust balance, không `ledger.append` |
| Market order | ❌ FE gửi limit tại giá tham chiếu |

### ledger

| Đặc tả | Thực tế |
|--------|---------|
| `GET /users/me/balances` | ✅ |
| `GET /users/me/ledger` | ❌ **500** do `page`/`perPage` truyền sai vào `paginate()` — **đã sửa** |
| Ledger quest/convert/listing | ✅ |
| Ledger mỗi trade | ❌ Gap đã ghi trong đặc tả |

### quest

| Đặc tả | Thực tế |
|--------|---------|
| 3 quest default | ✅ |
| Claim + KC + ledger | ✅ (daily-login claim được khi chưa cooldown) |
| Social/referral quests | ❌ Chưa có |

### convert

| Đặc tả | Thực tả |
|--------|---------|
| `POST /convert/swap` | ✅ 201 |
| Giá theo `token.price` | ✅ |
| 2 dòng ledger | ✅ (sau fix ledger API đọc được) |

### market-maker + bot-inventory

| Đặc tả | Thực tế |
|--------|---------|
| MM enabled dev | ✅ Log `MM: Demo KingCoin — N bậc` |
| Skip quote KC/KC | ✅ WARN trong log |
| Order book depth | ✅ ~10 levels / side (Demo) |
| `creditNewTokenToBots` | ✅ Code path on create |

### realtime

| Đặc tả | Thực tế |
|--------|---------|
| Namespace `/realtime` | ✅ |
| subscribe markets / ticker | ✅ |
| `markets` payload kèm price | ✅ (backend đã spread payload) |

### Frontend (đối chiếu đặc tả FRONTEND-*)

| Đặc tả | Thực tế |
|--------|---------|
| Live chỉ patch ô giá | ✅ `LiveTokenPrice`, `LiveToolbarPrice`, … |
| Sổ lệnh silent refetch | ✅ `useLiveFetch` + `silentOnLive` |
| Token list không refetch cả bảng | ✅ `useFetchApi` + live cells |
| `/wallet` ledger | ⚠️ Phụ thuộc API ledger (đã fix BE) |
| TP/SL | ✅ Toast chặn — khớp đặc tả “không gửi engine” |

---

## Lỗi đã sửa trong audit

1. **`ledger.service.ts`** — `paginate(model, args, { page, perPage })` thay vì nhét `page` vào `findMany`.
2. **`frontend/src/types/token.type.ts`** — export `TokenVolumes` (build fail).

---

## Đã sửa (2026-05-21 bổ sung)

3. **Order escrow:** `reserveOrderFunds` khi POST; `releaseOrderFunds` khi DELETE; `settleTrade` không trừ KC/base lần hai.
4. **Ledger trade:** `refType=trade`, `order_reserve`, `order_cancel`.

## Chuẩn hóa bổ sung (2026-05-21)

- PATCH escrow + `order_amend`
- `GET /orders/market-price` (market order)
- `ensure-demo-user-kc.js`, `cancel-stale-pending-orders.js` trong `dev-up.sh`
- FE: nhãn ledger, market price, bỏ tab TP/SL

## Việc phase sau (không v1)

- Referral, social quest, 2FA, trading fee maker/taker

---

## Tham chiếu

- Đặc tả: [README.md](./README.md)
- Script: [scripts/audit-modules.py](../../scripts/audit-modules.py)
