# Module: `order` + `TradeFill` (Backend)

**Path:** `backend/src/modules/order/`  
**Controller:** `order.controller.ts`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Binance Spot |
|-----------|--------------|
| Limit buy/sell | Limit order |
| Order book depth | Bids aggregated by price |
| Price-time matching | Highest bid ≥ lowest ask |
| Trade tape (recent trades) | Recent trades |
| Pre-trade balance check | Available balance |
| Cancel / amend pending | Cancel / replace (replace ⚠️) |

**KingCoin không có:** IOC/FOK/GTX, stop-limit thật, market order khớp ngay theo best price (FE có UI market nhưng giá gửi = reference).

---

## 2. Mục đích

**Matching engine off-chain** cho cặp `TOKEN/KC`: đặt lệnh, khớp, settlement hai chiều, ghi `TradeFill`, cập nhật giá & log.

---

## 3. Phạm vi

| IN | OUT |
|----|-----|
| POST limit (buy/sell) | Cross-margin |
| `matchOrders` price-time | Partial fill UI chi tiết từng fill trên order |
| GET order book (`/orders/all`) | OCO / bracket |
| GET recent trades | Funding rate |
| PATCH pending order | Hủy lệnh trả balance (⚠️ xem gap) |
| DELETE order | |

---

## 4. API

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/orders` | Tạo lệnh + auto match |
| GET | `/orders` | Lệnh của user (paginate) |
| GET | `/orders/all` | Sổ lệnh công khai (pending, theo token, side) |
| GET | `/orders/:id` | Chi tiết |
| PATCH | `/orders/:id` | Sửa giá/số lượng pending → re-match |
| DELETE | `/orders/:id` | Xóa (⚠️ kiểm tra hoàn tiền) |
| GET | `/orders/trades/recent?tokenId&limit` | Tape công khai |
| GET | `/orders/trades` | Fills của user (paginate) |

**Query order book:** `tokenId`, `type=buy|sell`, `status=pending`, `perPage` (max 64), `orderBy=price:asc|desc`.

---

## 5. State machine

| DB `OrderStatus` | API filter | Ý nghĩa |
|------------------|------------|---------|
| `pending` | `pending` | Còn quantity chưa khớp |
| `completed` | `complete` | Khớp hết |
| `canceled` | `cancel` | Đã hủy |

Field `quantity` = **phần còn lại**; `matchedQuantity` = đã khớp.

---

## 6. Thuật toán khớp (`matchOrders`)

1. Lấy pending buys (sort **giá giảm**, time ASC) và sells (sort **giá tăng**, time ASC).
2. Khi `buy.price >= sell.price` và **khác `userId`**:
   - `tradeQty = min(buy.qty, sell.qty)`
   - `matchPrice = sell.price` (price improvement cho buyer — giống nhiều CEX khi sell là maker)
3. Cập nhật trạng thái hai lệnh, tạo `TradeFill`.
4. `settleTrade` — chuyển KC ↔ base.
5. `updatePrice` + `createLog` + `broadcastTrade` + orderbook WS.

**Self-trade:** bỏ qua cặp cùng `userId` (MM user phải khác trader).

---

## 7. Settlement (`settleTrade`)

Cặp `BASE/KC` (`tradedTokenId !== quoteId`):

| Bên | KC (quote) | Base token |
|-----|------------|------------|
| Buyer | −price×qty | +qty |
| Seller | +price×qty | −qty |

**PnL:** `incrementDailyPnL` seller +notional, buyer −notional.

**Ledger:** mỗi khớp ghi `refType=trade` (buyer +token, seller +KC). Treo lệnh: `order_reserve`; hủy: `order_cancel`.

---

## 8. Pre-check balance (`validateOrderBalance`)

| Loại | Kiểm tra |
|------|----------|
| Buy | KC ≥ price × quantity |
| Sell base | Base balance ≥ quantity |
| Sell KC (hiếm) | KC ≥ quantity |

---

## 9. `TradeFill`

Public tape & lịch sử: `price`, `quantity`, `buyOrderId`, `sellOrderId`, `createdAt`.

---

## 10. Trạng thái implement

| Hạng mục | Trạng thái |
|----------|------------|
| Limit + match + fill | ✅ |
| Order book API | ✅ |
| Recent trades | ✅ |
| Market order | ✅ `GET /orders/market-price` |
| Escrow treo / hủy / PATCH amend | ✅ |
| Ledger per trade | ✅ |
| Trading fee maker/taker | ❌ phase sau |

---

## 11. Frontend liên quan

- `modules/trade/components/set-order`
- `view-volume-order` (sổ lệnh)
- `history-order` (tape)
- `my-order`
- `pages/trade/history`
