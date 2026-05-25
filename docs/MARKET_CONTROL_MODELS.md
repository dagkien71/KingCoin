# Điều khiển giá — Phương pháp 2 (mô hình đường giá)

Tài liệu mô tả các **mô hình** dùng để điều khiển spot/mid theo thời gian, tách với **Phương pháp 1** (combo preset + lịch sóng sin thủ công trên dashboard).

## KingCoin (KC) — stablecoin

KC là **stablecoin quote** (`tokenKind: stablecoin`). **Không** áp dụng lịch PP1 hay mô hình PP2 trên KC. Đặc tả đầy đủ: [STABLECOIN_KC_SPEC.md](./STABLECOIN_KC_SPEC.md).

## Phương pháp 1 vs 2

| | PP1 | PP2 |
|---|-----|-----|
| UI | Gói combo + «Tùy chỉnh» lịch sin | Tab «Mô hình giá» — preset ramp/OU/GBM/… |
| Backend | `POST .../schedule` | `POST .../tokens/:id/model-run` |
| Công thức | `scheduledPriceAt` (sin trong band) | `modelPriceAt` trong `price-path-models.ts` |
| Xung đột | Bật PP2 **hủy** lịch PP1 và ngược lại | |

API catalog: `GET /api/v1/admin/market-control/models`

## Bàn điều khiển nhanh (dynamic %)

Trên `/admin/market-control`, khối **Bàn điều khiển nhanh** (trên phạm vi áp dụng):

| Thành phần | Mô tả |
|------------|--------|
| Loại | Pump / Dump / Sideway / ±% ngay |
| Biên độ | Chip 1–20% + ô tùy chỉnh (0.5–50%) |
| Thời lượng | Chip 5–60 phút + ô tùy chỉnh (nudge không cần) |
| Khôi phục | Bật/tắt `restoreOnEnd` sau khi hết giờ |
| Xem trước | Giá tham chiếu → giá đích theo % |

**API:** Pump/Dump → `linear_ramp` + `params.priceEnd` theo spot từng mã (`POST bulk/model-run` hoặc single). Sideway → `sin_band` + `priceMin`/`priceMax`. ±% ngay → `POST .../nudge` với `pct` (chỉ một mã).

Tùy chọn lưu `localStorage` key `kc-mm-scenario-v1` (lần chạy sau nhớ % / phút).

## Quản lý setup đang chạy

Trang **Điều khiển thị trường** (`/admin/market-control`) có khối **Setup đang chạy** (đầu trang):

| Cột | Nội dung |
|-----|----------|
| Mã | Symbol + tên token |
| Loại | PP1 (lịch sin) hoặc PP2 (mô hình) |
| Chi tiết | Tên mô hình / band giá, giá mục tiêu hiện tại |
| Thời gian | Bắt đầu → kết thúc, thời gian còn lại |
| Tiến độ | % progress |
| Thao tác | **Xem** (chọn mã) · **Hủy** từng dòng · **Hủy tất cả** |

Dữ liệu từ `GET /admin/market-control` (poll 5s). Hủy hàng loạt: `POST /admin/market-control/bulk/cancel-paths` với `tokenIds` các mã đang liệt kê.

## Áp dụng setup theo nhóm / tất cả alt

Trên dashboard admin, chọn **Phạm vi áp dụng setup**:

| Chế độ | Mô tả |
|--------|--------|
| Một mã | Như trước — một token trong dropdown |
| Nhóm chọn | Checkbox nhiều alt — cùng một setup |
| Tất cả alt | Mọi token (trừ KC stablecoin) |

API bulk:

| Method | Path | Dùng cho |
|--------|------|----------|
| POST | `/admin/market-control/bulk/schedule-relative` | PP1 — `minRatio`/`maxRatio` theo **giá spot từng mã** |
| POST | `/admin/market-control/bulk/model-run` | PP2 — `presetId` + params theo spot từng mã |
| PATCH | `/admin/market-control/bulk/tokens` | Spread / levels chung cho nhóm |
| POST | `/admin/market-control/bulk/cancel-paths` | Hủy lịch + mô hình trên nhóm |

±% ngay, reset một mã — vẫn chỉ **một mã**.

## Mô hình hỗ trợ

### 1. `sin_band` — Sóng sin trong dải
- **Ý nghĩa:** Sideway, nến thân ngắn lắc quanh vùng min–max.
- **Tham số:** `priceMin`, `priceMax`, `waveCycles`.
- **Tham chiếu:** Dao động tuần hoàn (thành phần Fourier cơ bản).

### 2. `linear_ramp` — Ramp tuyến tính
- **Ý nghĩa:** Pump/dump đều từ `priceStart` → `priceEnd`.
- **Tham số:** `priceStart`, `priceEnd`.
- **Tham chiếu:** Xu hướng xác định / chuỗi nến thân dài một hướng.

### 3. `mean_reversion` — Hồi quy về mức trung tính (OU rời rạc)
- **Công thức:** \(P(t) = \mu + (P_0 - \mu)\, e^{-k t}\), \(t \in [0,1]\) theo tiến độ khoảng thời gian.
- **Tham số:** `priceStart`, `priceEnd` (= μ), `reversionSpeed` (= k).
- **Tham chiếu:** [Ornstein–Uhlenbeck](https://en.wikipedia.org/wiki/Ornstein%E2%80%93Uhlenbeck_process) / Vasicek.

### Preset nhanh: biến động mạnh theo xu hướng

| Preset ID | Mô hình | Mô tả |
|-----------|---------|--------|
| `model-volatile-trend-up` | `gbm` | Drift **+0.14**, volatility **~4.8%** — lắc mạnh, nghiêng tăng ~25 phút |
| `model-volatile-trend-down` | `gbm` | Drift **−0.14**, volatility **~4.8%** — lắc mạnh, nghiêng giảm ~25 phút |

Có trong tab **PP2 — Mô hình giá** và gói **Lịch giá** (combo PP1). Bulk `presetId` neo `priceStart` theo spot từng mã, giữ drift/vol.

### 4. `gbm` — Geometric Brownian Motion (demo)
- **Công thức:** \(\log P = \log P_0 + (\mu - \frac{1}{2}\sigma^2)t + \sigma\sqrt{t}\,Z\)
- **Nhiễu:** xác định từ `run.id` + progress (reproducible khi test).
- **Tham số:** `priceStart`, `drift`, `volatility`.
- **Tham chiếu:** [GBM — QuantStart](https://www.quantstart.com/articles/geometric-brownian-motion-simulation-with-python/), Black–Scholes.

### 5. `step_ladder` — Bậc thang
- **Ý nghĩa:** Giá nhảy từng bậc — nến «bậc» rõ.
- **Tham số:** `priceStart`, `priceEnd`, `steps`.

### 6. `triangle` — V-shape
- **Ý nghĩa:** Nửa đầu giảm về `priceMin`, nửa sau hồi về `priceEnd`.
- **Tham số:** `priceStart`, `priceMin`, `priceEnd`.

### 7. `exp_trend` — Xu hướng mũ
- **Ý nghĩa:** Tăng/giảm phi tuyến quanh `priceStart`.
- **Tham số:** `priceStart`, `priceEnd`, `expFactor`.

## Unit test (backend)

```bash
cd backend && npm test -- price-path-models.spec
```

File: `backend/src/modules/market-maker/price-path-models.spec.ts`

## Kế hoạch kiểm thử thủ công (QA)

**Chuẩn bị:** Admin đăng nhập, MM bật, chọn token (vd KingCoin), ghi `price₀` lúc bắt đầu.

### TC-M01 — Linear ramp pump
1. Tab **Mô hình giá** → «Pump ramp (+5%)».
2. **Kỳ vọng:** Trong ~10 phút spot/mid tăng dần; chart nến xanh liên tiếp; hết hạn khôi phục ≈ `price₀` nếu `restoreOnEnd: true`.
3. **API:** `GET /admin/market-control` → `modelRun.modelId === 'linear_ramp'`, `progress` 0→1.

### TC-M02 — Linear ramp dump
1. «Dump ramp (−5%)».
2. **Kỳ vọng:** Giá giảm đều ~5%; MM spread thu hẹp (wander thấp khi path active).

### TC-M03 — Sin sideway
1. «Sideway sin» 20 phút.
2. **Kỳ vọng:** Giá không vượt `[priceMin, priceMax]`; biểu đồ sideway.

### TC-M04 — Mean reversion
1. «Hồi quy về spot».
2. **Kỳ vọng:** Đầu kỳ giá cao hơn spot; cuối kỳ tiệm cận `priceEnd` ≈ spot ban đầu.

### TC-M05 — GBM demo
1. «GBM demo».
2. **Kỳ vọng:** Đường giá không cố định như ramp; cùng `run.id` + thời điểm → cùng giá (deterministic noise).
3. Chạy 2 lần **khác** run id → đường khác nhau.

### TC-M06 — Step ladder
1. «Bậc thang lên».
2. **Kỳ vọng:** Giá đứng yên từng đoạn rồi nhảy bậc (quan sát ticker 1s).

### TC-M07 — V-shape
1. «V-shape recovery».
2. **Kỳ vọng:** Nửa đầu giảm, nửa sau hồi; đáy gần `priceMin`.

### TC-M08 — Hủy mô hình
1. Bật bất kỳ mô hình → gói PP1 «Hủy lịch» không áp dụng; dùng hủy model: `POST .../model-run/cancel`.
2. **Kỳ vọng:** `modelRun` null; MM trở wander bình thường.

### TC-M09 — Xung đột PP1 / PP2
1. Đang chạy lịch sin PP1 → bật mô hình PP2.
2. **Kỳ vọng:** Lịch PP1 bị hủy; chỉ còn `modelRun`.

### TC-M10 — Neo giá (±% / set price)
1. Đang chạy mô hình → «+3% ngay» hoặc đặt giá.
2. **Kỳ vọng:** Mô hình dừng; neo spot; lệnh MM pending bị hủy.

### TC-M11 — Chart & WS
1. Mở chart token, chạy ramp 10 phút.
2. **Kỳ vọng:** `TokenCryptoLog` / ticker WS cập nhật; nến forming theo spot (xem `CHART_CANDLESTICK_SPEC.md`).

## Ghi chú vận hành

- State mô hình/lịch trong **RAM** — restart API mất run (giá DB giữ nguyên).
- Tick 1 giây; spot bám target theo blend động (~38–72%/giây) để ramp đủ trong cửa sổ duration.
- Preset «chạy ngay»: gửi `durationMin` / `minutes` — server neo `startAt=now`, tránh lệch đồng hồ trình duyệt.
- Không commit secret `.env`.
