# Frontend: Futures Terminal

**Path (planned):** `frontend/src/pages/futures/`, `frontend/src/modules/futures/`  
**Đặc tả:** [FUTURES_SPEC.md](../FUTURES_SPEC.md)

---

## 1. Chuẩn ngoài (Binance USDT-M)

| Vùng | Chuẩn |
|------|--------|
| Header | Perp badge, mark, funding (Pha 2) |
| Form | Long/Short, leverage, cost/size |
| Positions | Size, entry, mark, liq, uPnL, ROE, Close |
| History | Orders + realized PnL |

---

## 2. Routes (đề xuất)

| Route | Mô tả |
|-------|--------|
| `/futures` | → default pair |
| `/futures/[slug]` | Terminal |

Nav header: **Futures** cạnh Giao dịch (spot).

---

## 3. Tái sử dụng

| Thành phần | Nguồn |
|------------|--------|
| Chart | `DbTokenPriceChart` + logs |
| Order book | `ViewVolumeOrder` (tham chiếu giá) |
| Live mark | `useLiveTokenDisplay` |
| Layout shell | `AppShell` / `MarketLiveProvider` |

---

## 4. Tab trade hiện có

`my-order` — `positions` đang `placeholder: true` → thay bằng `FuturesPositionsPanel` hoặc chỉ dùng trên route `/futures`.

---

## 5. Data freshness

| Khối | Hook |
|------|------|
| Mark, uPnL | `useLiveTicker` + display throttle |
| Positions | `useLiveFetch(..., { stream: 'futures' })` hoặc poll |
| Sau submit | `refetch` balances + positions |

---

## 6. Trạng thái

**Planned** — chưa implement.
