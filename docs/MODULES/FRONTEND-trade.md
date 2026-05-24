# Frontend: Trade Terminal

**Path:** `frontend/src/pages/trade/`, `frontend/src/modules/trade/`

---

## 1. Chuẩn ngoài (Binance Spot UI)

| Vùng | Chuẩn |
|------|--------|
| Pair header | Symbol, last price, 24h change, volume |
| Chart | Candle / line from trades |
| Order book | Bids green, asks red, mid price |
| Order form | Limit/Market, buy/sell, % slider |
| Open orders | User pending |
| Recent trades | Public tape |
| Order history | User fills |

---

## 2. Routes

| Route | Component |
|-------|-----------|
| `/trade` | Redirect default pair |
| `/trade/[name]` | `Trade` → `MarketLiveProvider` + `TradeTerminal` |
| `/trade/history` | Lệnh + fills user |

`name` = token `name` slug (e.g. `KingCoin`).

---

## 3. Cấu trúc trang `/trade/[name]`

```
PairToolbar (LiveToolbarPrice / Vol24)
├── Chart | Summary tabs
│   └── DbTokenPriceChart (logs + spotPrice)
├── Order book | History tabs
│   └── ViewVolumeOrder | HistoryOrder
├── SetOrder (limit/market UI)
└── MyOrder (user.orders từ profile)
```

**Bootstrap:** `useFetchApi` token một lần → `tokenId` cho WS provider.

---

## 4. Components

### `set-order`
- Formik: buy/sell, limit/market, price, quantity, % balance
- `referencePrice` từ `useLiveTicker` (patch WS)
- POST `/orders` qua `useMutation`
- Market: gửi `price = referencePrice` (⚠️ không walk book)

### `view-volume-order`
- `useLiveFetch` buy/sell books — **silent** refetch on `orderbook`
- `LiveMidPrice` — chỉ giữa sổ re-render
- Manual refresh button

### `history-order`
- `useLiveFetch` `/orders/trades/recent` stream `trades`

### `my-order`
- Data từ `user.orders` (refetch sau đặt lệnh)

### `summary`
- Token metadata, ATH/ATL (static từ token object)

---

## 5. Hành vi UX đặc thù KingCoin

| Hành vi | Mô tả |
|---------|--------|
| Cặp gốc KC | Badge “Cặp gốc” |
| Demo legacy | Badge Demo |
| Disclaimer chart | DB `TokenCryptoLog` |

---

## 6. Gap UI vs sàn thật

| Tính năng | Trạng thái |
|-----------|------------|
| Depth aggregation | Per-order rows (64 cap) |
| Market order slippage | ❌ |
| TP/SL tab | UI có, không gửi engine |
| Margin toggle | UI decorative |
| TradingView embed | Dùng chart nội bộ |

---

## 7. API map

| UI | Endpoint |
|----|----------|
| Token | GET `/token-crypto/:slug` |
| Logs | GET `/crypto-logs/:id` |
| Book | GET `/orders/all?...` |
| Place | POST `/orders` |
| Tape | GET `/orders/trades/recent` |
| User orders | embedded `/users/me` |
