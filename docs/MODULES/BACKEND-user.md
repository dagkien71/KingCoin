# Module: `user` (Backend)

**Path:** `backend/src/modules/user/`  
**Controllers:** `user.controller`, `user-admin.controller`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Sàn thật |
|-----------|----------|
| Hồ sơ (avatar, username) | Account center |
| Watchlist / favorites | Markets star |
| Spot balances đa token | Wallet overview |
| PnL theo ngày (demo) | Dashboard PnL |

---

## 2. Mục đích

Quản lý **danh tính**, **số dư nội bộ** (KC + token), **watchlist**, và hook cho settlement từ `order` / `quest` / `convert`.

---

## 3. Phạm vi

| IN | OUT |
|----|-----|
| CRUD profile (`/users/me`) | Transfer P2P giữa user |
| `Balance` / `BalanceToken` adjust | On-chain balance sync |
| `getQuoteBalance`, `getTokenBalance` | Margin / futures wallet |
| Watchlist | Sub-account |

---

## 4. API

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/users/me` | User | Profile + orders embed (theo query) |
| PATCH | `/users/me` | User | Cập nhật username, avatar, … |
| POST | `/users/watch-list` | User | Toggle token id trong `watchList` |
| GET | `/users` (admin) | Admin | Danh sách user |
| POST/DELETE | `/users/:id` (admin) | Admin | Quản trị user |

**Ledger read:** chuyển sang module `ledger` (`/users/me/balances`, `/users/me/ledger`).

---

## 5. Mô hình số dư

```
User 1──1 Balance
Balance 1──* BalanceToken
  - tokenId = UUID TokenCrypto (KC cũng là một token quote)
  - amount = số lượng
```

**Quote KC:** `getQuoteTokenId()` đọc token có `name` = `QUOTE_TOKEN_NAME` (env, mặc định KingCoin).  
**Fallback:** `Balance.stableCoin` nếu chưa có quote token.

**Hàm nội bộ quan trọng:**

- `adjustBalanceTokenByUserId(userId, tokenId, delta)`
- `adjustBaseTokenByUserId` — đảm bảo row `BalanceToken` tồn tại
- `seedInitialQuoteTokenForUser`
- `incrementDailyPnL` — cộng KC notional khi khớp (buyer âm, seller dương)

---

## 6. Luồng watchlist

1. Client POST mảng token ids (toggle semantics theo implement controller).
2. Cập nhật `User.watchList`.
3. FE `/token/list` hiển thị sao.

---

## 7. Trạng thái implement

| Hạng mục | Trạng thái |
|----------|------------|
| Profile + watchlist | ✅ |
| Balance adjust (trade/quest) | ✅ |
| PnL fields trên User | ✅ (đơn giản, KC notional) |
| Security settings / API keys | ❌ Gap |
| Referral | ❌ Gap |

---

## 8. Frontend liên quan

- `pages/account`, `pages/account/dashboard`
- `hooks/useAuth.ts`
- Quest `onboarding-profile` kiểm tra username/avatar
