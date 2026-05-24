# Frontend: Realtime (Live UI)

**Checklist khi làm UI mới:** [UI_DATA_FRESHNESS_SPEC.md](../UI_DATA_FRESHNESS_SPEC.md) — mỗi vùng có cần cập nhật khi API/WS đổi không; nếu có thì phải implement.

**Path:**  
`frontend/src/context/market-live-context.tsx`  
`frontend/src/lib/market-realtime-socket.ts`  
`frontend/src/hooks/useLiveFetch.ts`, `useFetchApi.ts`  
`frontend/src/components/live/`

---

## 1. Chuẩn ngoài

| Pattern | Sàn |
|---------|-----|
| WebSocket push | Binance streams |
| Local patch best bid/ask | Ticker update |
| Order book snapshot + diff | Depth |
| Không flash full page loading | Professional terminal |

---

## 2. Kiến trúc (bắt buộc dùng thống nhất)

```
MarketLiveProvider (_app global + trade nested tokenId)
  → Socket.IO subscribe channels
  → pending tickers (ref) → flush mỗi DISPLAY_TICKER_MS (~300ms)
  → tickers{} display cache + flash up/down + revisions per stream
       ├── useLiveTicker / useLiveTokenDisplay  → UI giá (đã throttle)
       └── useLiveFetch(url, stream)  → silent REST refetch (book, trades, logs)
```

**Hiển thị giá:** WS vẫn nhận mọi tick; UI chỉ cập nhật tối đa ~3–4 lần/giây (`constants/live-display.ts`). NAV dashboard debounce thêm `NAV_PRICE_DEBOUNCE_MS`. Xem `PriceFlash`, `useLiveTokenDisplay`.

---

## 3. Streams

| Key | Khi bump | FE dùng |
|-----|----------|---------|
| `ticker` | Giá/volume WS | `useLiveTicker`, `applyTickerPatch` |
| `orderbook` | Sổ đổi | `useLiveFetch` orders/all |
| `trades` | Khớp mới | History tape silent refetch |
| `logs` | Trade (chart) | Chart logs silent refetch |
| `markets` | Bảng markets | Patch qua ticker cache |

**Không** bump `logs` khi chỉ ticker đổi (tránh reload chart).

---

## 4. Components live

| Component | Vùng |
|-----------|------|
| `LiveTokenPrice` | Bảng markets |
| `LiveTokenVol24` | Cột KL |
| `LiveToolbarPrice` / `LiveToolbarVol24` | Trade header |
| `LiveMidPrice` | Giữa order book |
| `LiveAssetQuotePrice` | Dashboard |

---

## 5. `useFetchApi` silent

- `silentOnLive: true` → `liveRevision` tăng không `setLoading(true)`
- Initial load vẫn có loading một lần

---

## 6. Socket ref-count

`subscribeChannel` / `unsubscribeChannel` đếm reference — nested `MarketLiveProvider` không gỡ nhầm `markets`.

---

## 7. Fallback

`LIVE_FALLBACK_MS` (~4s): **chỉ khi WS disconnect** — bump orderbook/trades, không spam markets.

---

## 8. Quy tắc cho dev mới

| Cần cập nhật | Dùng |
|-------------|------|
| Giá, vol24 | `useLiveTicker` + component live |
| Sổ lệnh, tape | `useLiveFetch` + stream đúng |
| Cả object token | Tránh `useLiveFetch` trên `/token-crypto/:id` cho ticker |

---

## 9. Gap

| Chuẩn | KingCoin |
|-------|----------|
| Book delta WS payload | Signal + REST |
| Single connection multiplex | ✅ Socket.IO |
| Private order WS | ❌ polling/refetch user orders |
