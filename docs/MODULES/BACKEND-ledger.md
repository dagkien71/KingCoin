# Module: `ledger` (Backend)

**Path:** `backend/src/modules/ledger/`  
**Controller:** `ledger.controller.ts`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Sàn / ngân hàng |
|-----------|-----------------|
| Transaction history | Wallet → History |
| Running balance after tx | Post-balance |
| Multi-asset ledger | KC + từng coin |

---

## 2. Mục đích

**Sổ cái bất biến (append-only)** cho mọi biến động KC/token có audit: quest, listing fee, convert — và chuẩn bị mở rộng trade fee.

---

## 3. Phạm vi

| IN | OUT |
|----|-----|
| `LedgerEntry` append | Double-entry accounting đầy đủ |
| Snapshot balances API | Export CSV tax |
| Pagination ledger | Real-time push ledger |

---

## 4. API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/users/me/balances` | `{ quoteKc, tokens[] }` |
| GET | `/users/me/ledger` | Paginate entries |

---

## 5. Schema `LedgerEntry`

| Field | Ý nghĩa |
|-------|---------|
| `amount` | +/- số lượng |
| `currency` | `KC` \| `TOKEN` |
| `tokenId` | Token liên quan (quote id khi KC) |
| `refType` | `quest`, `listing_fee`, `convert`, … |
| `refId` | Id nhiệm vụ / token / … |
| `balanceAfter` | Snapshot sau giao dịch |
| `note` | Mô tả hiển thị |

---

## 6. Nguồn ghi ledger (hiện tại)

| refType | Module gọi |
|---------|------------|
| `quest` | `quest.service` claim |
| `listing_fee` | `token.service` create |
| `convert` | `convert.service` swap (2 dòng KC + TOKEN) |
| `order_reserve` / `order_cancel` / `order_amend` | Treo / hủy / sửa lệnh |
| `trade` | Khớp lệnh (`settleTrade`) |

---

## 7. `getBalances`

- `quoteKc` từ `getQuoteBalance`
- `tokens[]`: mọi `BalanceToken` khác quote, `amount > ε`, kèm `symbol`

---

## 8. Trạng thái implement

| Hạng mục | Trạng thái |
|----------|------------|
| Balances API | ✅ |
| Ledger list | ✅ |
| Trade fills → ledger | ✅ |

---

## 9. Frontend

- `pages/wallet/index.tsx`
- `pages/account/dashboard.tsx` (một phần)
