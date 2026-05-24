# Frontend: Markets & Token

**Path:** `pages/token/`, `pages/markets.tsx`, `components/search/`

---

## 1. Chuẩn ngoài

| Màn | CoinGecko / Binance |
|-----|---------------------|
| Markets table | Rank, name, price, %, mcap, volume |
| Search | Quick jump to pair |
| Token detail | About, links, chart |
| Launch token | Launchpad form + fee |

---

## 2. Routes

| Route | Mô tả |
|-------|--------|
| `/markets` | Alias → `/token/list` |
| `/token/list` | Bảng markets + sort + search |
| `/token/[id]` | Chi tiết uuid |
| `/token/create` | Form phát hành (private) |

---

## 3. `/token/list`

- `useFetchApi` `/token-crypto/all` — load **một lần** (sort đổi → query params)
- `LiveTokenPrice`, `LiveTokenVol24` — **chỉ ô** cập nhật WS
- Watchlist: POST `/users/watch-list`
- Row click → `/token/:id`

**Cột % 1h/24h/7d:** hiển thị từ `volumes` JSON (có thể không khớp CoinGecko % change thật).

---

## 4. `/token/[id]`

- Token detail + chart logs
- Comment module **tắt** (placeholder)

---

## 5. `/token/create`

- Upload logo (Cloudinary)
- Validation `lib/token/create-validation.ts`
- POST `/token-crypto` → popup success → link trade

---

## 6. Search (`components/search`)

- `useFetchApi` all tokens
- Filter client-side, navigate `/trade/{name}`
- Giá live: có thể bổ sung `useLiveTicker` trên dropdown (optional)

---

## 7. Gap

| Tính năng | Trạng thái |
|-----------|------------|
| Sparkline 7d | ❌ |
| Categories / tags | ❌ |
| Favorite sync server | ✅ watchlist |
