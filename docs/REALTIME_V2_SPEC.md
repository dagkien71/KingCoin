# Realtime V2 — Smoothing giá & biểu đồ

Đặc tả kiến trúc cập nhật giá live (Phase 1: frontend lerp; Phase 2: backend emit-first).

Tham chiếu:
- [UI_DATA_FRESHNESS_SPEC.md](./UI_DATA_FRESHNESS_SPEC.md)
- [CHART_CANDLESTICK_SPEC.md](./CHART_CANDLESTICK_SPEC.md)
- [MODULES/FRONTEND-realtime.md](./MODULES/FRONTEND-realtime.md)

---

## 1. Phạm vi

| Trong V2 | Ngoài V2 |
|----------|----------|
| Lerp giá hiển thị (UI, chart forming bar, NAV) | Book delta WS |
| Tách ingest raw / display smoothed | Redis Socket.IO scale |
| Fallback REST khi WS mất | Thay Lightweight Charts |
| Phase 2: emit WS trước, persist DB sau | |

**Nguyên tắc:** Component **không** đọc Socket.IO trực tiếp — chỉ qua `MarketLiveProvider` / hooks.

---

## 2. Ba lớp

```
Layer 1 — Ingest:  WS ticker/markets → rawTargetsRef (merge ngay, không throttle)
Layer 2 — Smooth:  PriceSmootherEngine + requestAnimationFrame → lerp tới target
Layer 3 — Display:  useSmoothedPrice(profile) / useLiveTicker (profile ui)
                    revisions → useLiveFetch (orderbook, trades, logs)
```

### Smoothing (exponential lerp)

```
alpha = 1 - exp(-dt / tau)
current += (target - current) * alpha
```

| Profile | tau mặc định | Dùng cho |
|---------|--------------|----------|
| `ui` | 180 ms | Markets, toolbar, mid price |
| `chart` | 420 ms | Forming bar OHLC |
| `nav` | 550 ms | NAV dashboard |

- **Flash** (up/down): khi **target** price đổi, không phải mỗi frame lerp.
- `prefers-reduced-motion`: `current = target` ngay.

---

## 3. Chart

- `spotPrice` prop = `useSmoothedPrice(id, "chart")`.
- Pipeline OHLC không đổi: `buildOhlcvSeries(logs, bucketMs, spotPrice)`.
- `DbTokenPriceChart`: `main.update(last)` khi chỉ forming bar đổi; không `setData` full series.
- Stream `logs` chỉ bump khi **trade** (không khi chỉ ticker).

---

## 4. WebSocket streams

| Event | Channel | FE |
|-------|---------|-----|
| `ticker` | `ticker:{tokenId}` | Ingest raw |
| `markets` | `markets` | Ingest raw (bảng markets) |
| `orderbook` | `orderbook:{tokenId}` | bump → useLiveFetch |
| `trade` | `trades:{tokenId}` | bump trades + logs |

---

## 5. Fallback WS mất

Khi `!connected`, mỗi `LIVE_FALLBACK_MS` (~4s):

1. Poll `GET /token-crypto/all` (silent).
2. Merge `price`, `volumes`, `%` vào raw targets.
3. Smoother vẫn lerp — giá không đứng hình.
4. Bump `orderbook` / `trades` nếu có `tokenId` scoped (giữ v1).

Production: Socket transport **websocket only** (`market-realtime-socket.ts`).

---

## 6. Biến môi trường (frontend)

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `NEXT_PUBLIC_SMOOTH_TAU_UI_MS` | 180 | tau profile ui |
| `NEXT_PUBLIC_SMOOTH_TAU_CHART_MS` | 420 | tau profile chart |
| `NEXT_PUBLIC_SMOOTH_TAU_NAV_MS` | 550 | tau profile nav |
| `NEXT_PUBLIC_PRICE_FLASH_MS` | 550 | Thời gian flash |
| `NEXT_PUBLIC_LIVE_FALLBACK_MS` | 4000 | Poll khi WS down |

**Backend (Phase 2):**

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `PRICE_PERSIST_DEBOUNCE_MS` | 800 | Debounce ghi DB sau `updatePriceLive` |

**Deprecated:** `NEXT_PUBLIC_DISPLAY_TICKER_MS`, `NEXT_PUBLIC_NAV_PRICE_DEBOUNCE_MS` (thay bằng tau profiles).

---

## 7. Hooks

```ts
useSmoothedPrice(tokenId, "ui" | "chart" | "nav")  // patch đã lerp
useLiveTicker(tokenId)                             // alias profile ui (backward compat)
useLiveTokenDisplay(token)                         // token + patch ui + flash
useLiveFetch(url, { stream })                      // không đổi
```

---

## 8. Phase 2 — Backend (outline)

1. `RealtimeService.emitTickerFast(tokenId, payload)` — WS only, no DB.
2. `TokenCryptoService.persistPriceDebounced(tokenId, price)` — ghi DB 500–1000ms/token.
3. MM: `emitTickerFast` mỗi tick; `updatePrice` debounced.
4. `syncPriceChangePercents` / `updateRanks` — cron hoặc sau trade (`writeLog: true`).

**Source of truth:** REST/DB cho khớp lệnh; WS cho display; reconcile on trade.

---

## 9. Kiểm thử

1. `/trade/demo` — toolbar + nến cuối trượt mượt.
2. Zoom chart giữa — viewport không nhảy.
3. DevTools WS off — giá lerp từ poll fallback.
4. `prefers-reduced-motion` — giá nhảy thẳng target.
5. Markets 10+ token — một RAF loop, FPS ổn.

---

## 10. File triển khai

| File | Vai trò |
|------|---------|
| `frontend/src/lib/live/price-smoother.ts` | Engine RAF + lerp |
| `frontend/src/lib/live/smooth-profiles.ts` | tau theo profile |
| `frontend/src/context/market-live-context.tsx` | Ingest + provider |
| `frontend/src/hooks/useSmoothedPrice.ts` | Hook display |
| `docs/REALTIME_V2_SPEC.md` | Đặc tả (file này) |
