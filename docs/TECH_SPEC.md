# KingCoin — TECH SPEC (v1 mô phỏng)

## Order state machine

| Status DB | API filter | Mô tả |
|-----------|------------|--------|
| `pending` | `pending` | Chờ khớp, còn `quantity` |
| `completed` | `complete` → map `completed` | Khớp hết |
| `canceled` | `cancel` → map `canceled` | Đã hủy |

Khớp: price-time, buyer giá cao vs seller giá thấp. Mỗi khớp tạo `TradeFill` + settlement KC/base.

## Settlement (2 chiều)

- **Buyer**: −KC (`quote`), +base token
- **Seller**: +KC, −base token
- Quote token id từ `QUOTE_TOKEN_NAME` (KingCoin)

## Ledger

`LedgerEntry`: `userId`, `amount`, `currency` (`KC`|`TOKEN`), `refType`, `refId`, `balanceAfter`, `note`.

Nguồn ghi: `trade`, `order_reserve`, `order_cancel`, listing fee, quest claim, convert.

**Escrow:** POST `/orders` trừ KC (mua) hoặc base (bán); DELETE hoàn phần `quantity` còn lại; khớp chỉ chuyển token/KC cho đối tác (không trừ lại buyer KC).

`User.balance` API = snapshot quote từ `BalanceToken` (sync khi ghi ledger).

## API chính

| Method | Path | Ghi chú |
|--------|------|---------|
| POST | `/orders` | Pre-check balance |
| PATCH | `/orders/:id` | Sửa lệnh pending |
| GET | `/orders/trades/recent` | Tape công khai |
| GET | `/orders/market-price?tokenId&side` | Giá market (best bid/ask) |
| GET | `/users/me/balances` | KC + tokens |
| GET | `/users/me/ledger` | Lịch sử |
| GET | `/quests` | Danh sách |
| POST | `/quests/:id/claim` | Nhận KC |
| POST | `/convert/swap` | Token A → token B (giá spot, quy KC) |

## WebSocket

Namespace `/realtime`. Channels: `orderbook:{tokenId}`, `trades:{tokenId}`.

## PnL

**PnL hiển thị (dashboard):** `dailyPnL` / `weeklyPnL` = thay đổi **NAV ước tính (KC)** so với mốc đầu ngày/tuần (`PortfolioPnlService`), không phải tổng KC đã chi khi mua. Cập nhật khi `GET /users/me`, sau khớp lệnh, sau convert.
