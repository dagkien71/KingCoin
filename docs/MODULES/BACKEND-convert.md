# Module: `convert` (Backend)

**Path:** `backend/src/modules/convert/`  
**API:** `POST /convert/swap`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Sàn |
|-----------|-----|
| Instant convert | Binance Convert |
| Fixed rate từ last price | Market price estimate |
| Không order book | One-click swap |

---

## 2. Mục đích

Đổi nhanh **giữa hai token bất kỳ** (KC, alt A, alt B, …) theo `TokenCrypto.price` hiện tại — giá quy chiếu qua KC.

---

## 3. Request

```json
{
  "fromTokenId": "uuid",
  "toTokenId": "uuid",
  "amount": number
}
```

- `amount`: số lượng **token nguồn** (`fromTokenId`) user bán.
- `amountOut = amount * price(from) / price(to)` (giá TOKEN/KC).

---

## 4. Luồng

1. Hai token khác nhau, `price > 0`.
2. Kiểm tra số dư `fromTokenId`.
3. Trừ `amount` from, cộng `amountOut` to; 2 ledger lines.
4. `syncUserNavPnL`; trả balances + `amountOut`, symbols.

**Không** tạo `Order`, **không** ảnh hưởng order book.

---

## 5. Gap

| Chuẩn ngoài | KingCoin |
|-------------|----------|
| Slippage / spread | Không |
| Quote refresh countdown | Không |
| Max size per day | Không |

---

## 6. Frontend

- `pages/convert/index.tsx` — hai dropdown (gửi / nhận), ước tính live
