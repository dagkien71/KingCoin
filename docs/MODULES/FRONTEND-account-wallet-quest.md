# Frontend: Account, Wallet, Quest, Convert, Admin

---

## 1. Chuẩn ngoài

| Màn | Sàn |
|-----|-----|
| Dashboard assets | Wallet spot list |
| Transaction history | Wallet history |
| Earn / tasks | Rewards hub |
| Convert | Convert portal |
| Admin | Exchange ops console |

---

## 2. Account

Đặc tả đầy đủ: [ACCOUNT_PROFILE_DASHBOARD_SPEC.md](../ACCOUNT_PROFILE_DASHBOARD_SPEC.md).

| Route | Chức năng |
|-------|-----------|
| `/account` | Profile: avatar, username, introduction, xác minh, quick links |
| `/account/dashboard` | NAV ước tính, holdings user-only, PnL API, phân bổ donut, ledger |

**Live price:** `LiveAssetQuotePrice` + `useMarketLive` tickers cho NAV.

---

## 3. Wallet `/wallet`

- GET `/users/me/balances`
- GET `/users/me/ledger` paginate
- Hiển thị KC + tokens + lịch sử `refType`

**Chuẩn ngoài:** deposit/withdraw buttons — **không** (mô phỏng).

---

## 4. Quest `/quest`

Đặc tả: [QUEST_MARKETING_SPEC.md](../QUEST_MARKETING_SPEC.md).

- GET `/quests` — eligible, progress, cooldown
- POST `/quests/:id/engage` — social/share
- POST `/quests/:id/claim`
- GET `/users/me/referral` — mã + link mời
- UI: tab category, ReferralBanner, QuestCard (`frontend/src/modules/quest/`)

---

## 5. Convert `/convert`

- Chọn token, direction KC↔token, amount
- `useLiveTicker` cho giá tham chiếu selected
- POST `/convert/swap`

---

## 6. Trade history `/trade/history`

- Fills + orders paginate (user)

---

## 7. Admin `/admin`

- Basic: users list, tokens list (admin role)
- **Gap:** MM control, quest editor, ledger audit UI

---

## 8. Middleware private

`/wallet`, `/quest`, `/token/create`, `/admin` — cần login.
