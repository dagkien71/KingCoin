# Đặc tả biểu đồ nến (OHLC) — KingCoin

Tài liệu mô tả cách biểu đồ giá trên trang **Trade** và **Token detail** phải hoạt động, căn theo thực hành sàn (TradingView / Binance) và thư viện [Lightweight Charts v5](https://tradingview.github.io/lightweight-charts/).

## 1. Mục tiêu

| Mục tiêu | Mô tả |
|----------|--------|
| Đọc được | Nến có thân + bóng rõ, khoảng cách nến ổn định, mặc định ~60–80 nến gần nhất (không ép cả lịch sử vào một màn hình). |
| Giống sàn thật | OHLC chuẩn từ từng lần khớp lệnh; trục giá phải; thời gian theo bucket (không hiển thị pane volume). |
| Live | Giá spot API cập nhật **nến đang hình thành** (cùng bucket), không tạo điểm thời gian lạ mỗi lần poll. |
| Tương tác | Zoom (wheel), kéo (pan), crosshair + OHLC; nút **Mới nhất** / **Fit**; giữ viewport khi user đã zoom (poll không nhảy). |

## 2. Nguồn dữ liệu

- **Lịch sử:** `TokenCryptoLog` — mỗi bản ghi = một lần ghi giá sau khớp lệnh (`price`, `volume`, `timestamp`).
- **Giá hiện tại:** `token.price` từ API + patch WebSocket `ticker` (`useLiveTicker` trên trang trade) — cập nhật **nến đang hình thành** (forming bar) mỗi khi giá đổi, không chờ log mới.

### Quy tắc gộp nến (aggregation)

Với khung thời gian `bucketMs` (vd. 5 phút = 300_000 ms):

```
bucketStart = floor(timestampMs / bucketMs) * bucketMs
open  = giá tick đầu tiên trong bucket (theo thời gian)
high  = max(giá các tick)
low   = min(giá các tick)
close = giá tick cuối trong bucket
volume = sum(volume các tick)
```

- Tick sắp xếp tăng dần theo `timestamp` trước khi gộp.
- **Khung 1D:** bucket theo **ngày UTC**; truyền vào chart dạng `BusinessDay` `{ year, month, day }` (yêu cầu Lightweight Charts cho DWM — không dùng timestamp số).
- **Nến đang hình thành:** nếu `now` thuộc bucket cuối, cập nhật `close/high/low` bằng `spotPrice`; nếu chưa có bucket cho `now`, thêm bucket mới với `open = close trước`.

### Khoảng trống (gap)

- Không sinh hàng nghìn nến flat giữa hai ngày không giao dịch (tránh lag).
- Cho phép **lấp tối đa 3 bucket trống** giữa hai nến có dữ liệu (nến flat `O=H=L=C=close trước`, volume 0) để đường thời gian không “nhảy” khi MM khớp cách vài phút.
- Trục thời gian Lightweight Charts vẫn hiển thị khoảng cách thật giữa các timestamp xa nhau.

## 3. Khung thời gian (timeframe)

| Nhóm | ID | Bucket | Ghi chú |
|------|-----|--------|---------|
| Mặc định trade | `5m` | 5 phút | Phù hợp log khớp lệch nhịp, dễ đọc |
| Ngắn | `1m`, `3m` | 1–3 phút | Khi có nhiều log |
| Trung | `15m`, `30m`, `1h` | | |
| Dài | `4h`, `1d` | | Tổng quan |

Không hiển thị 1s/3s/… trên UI chính (dữ liệu log không đủ mật độ → nến 1–2 cột, gây hiểu nhầm).

## 4. Bố cục UI

```
┌─────────────────────────────────────────────────────────┐
│ [1m][3m][5m]…[1d]     [Mới nhất] [Fit]                  │  ← toolbar
├─────────────────────────────────────────────────────────┤
│ 21/05 14:35  O 1.23  H 1.25  L 1.22  C 1.24            │  ← legend OHLC
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Biểu đồ nến (full height)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Màu: tăng `#22c55e`, giảm `#ef4444`, nền `#12181f`.
- Crosshair: hiển thị OHLC tại thời điểm trỏ chuột; không trỏ → hiển thị **nến mới nhất**.

## 5. Viewport & hành vi

| Chế độ | Khi nào | Hành vi |
|--------|---------|---------|
| `recent-bars` (trade) | Mở trang / đổi TF / nút Mới nhất | Hiển thị ~64 nến cuối, `barSpacing` ≈ 10px, `rightOffset` 8 |
| `recent-bars` (token detail) | Mở trang, TG mặc định **15m** | ≥16 nến: ~28 nến cuối; **&lt;16 nến**: `fitContent` + `barSpacing` theo chiều rộng (tránh 2 nến dồn trái) |
| `fit-all` | Preview / tùy chọn | `fitContent()` toàn bộ chuỗi (giới hạn tối đa 800 nến) |
| User zoom/pan | Wheel / pinch / nút **+** **−** / kéo trục thời gian | `barSpacing` từ **0.5** (zoom ra) đến **96px** (zoom vào sâu); lưu viewport khi đã zoom |
| Live tick | Poll / WS log | Nếu chưa khóa viewport → `scrollToRealTime()` |

## 6. Trường hợp đặc biệt

| Tình huống | Hiển thị |
|------------|----------|
| 0 log | Empty state (hướng dẫn seed / chờ khớp) |
| 1 log | Area/line 2 điểm (không ép 1 nến) |
| ≥ 2 bucket | Candlestick |
| > 800 nến sau gộp | Cắt giữ **800 nến mới nhất** |

## 7. File triển khai

| File | Vai trò |
|------|---------|
| `frontend/src/lib/chart-ohlcv.ts` | Gộp OHLCV + forming bar + gap fill |
| `frontend/src/constants/chart-timeframe.ts` | Danh sách TF |
| `frontend/src/constants/chart-layout.ts` | Bar spacing, số nến visible |
| `frontend/src/components/charts/DbTokenPriceChart.tsx` | UI + Lightweight Charts v5 panes |
| `docs/CHART_CANDLESTICK_SPEC.md` | Đặc tả (file này) |

## 8. Kiểm thử thủ công

1. `/dev/trade-chart-preview` — mock 150 log/phút: nến đều, zoom ổn.
2. `/trade/demo` — đặt lệnh khớp: nến cuối nhúc, legend đúng.
3. Đổi 1m ↔ 5m ↔ 1h: không crash, Mới nhất về đúng cửa sổ.
4. Zoom vào giữa, chờ poll: viewport không nhảy.
