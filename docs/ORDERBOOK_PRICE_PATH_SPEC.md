# Order book — đường giá & thanh khoản dọc path

Khi admin **pump/dump** (đặt giá, nudge ±%, mô hình ramp), giá spot không được “dịch chuyển tức thì” trong khi sổ lệnh MM chỉ treo quanh **mid mới** — khoảng trống giữa giá cũ và mới trông giả.

## Mục tiêu

1. Biến động lớn → đi **nhiều bước** (walk) hoặc đã có **path driver** (lịch / `linear_ramp` / `step_ladder`).
2. Mỗi bước: **refresh sổ MM** quanh mid bước đó; **MarketFlow** có thể khớp vài lệnh → tape có volume thật.
3. Path driver (PP1/PP2): khi `currentTarget` lệch đủ so với lần refresh sổ trước → refresh + sweep (hook).

## Backend

| Thành phần | Vai trò |
|------------|---------|
| `orderbook-path.util.ts` | `computePricePathSteps`, ngưỡng env |
| `orderbook-path.service.ts` | `walkSpotToTarget`, `nudgeWithBookPath`, `setPriceWithBookPath` |
| `MmControlService` | `beginPathWalk` / `endPathWalk`, hook `registerPathBookRefreshHook` |
| `MarketMakerService` | `getPathMid` khi refresh; hook refresh sổ |
| `MarketFlowService` | `sweepAlongPath` — khớp theo hướng pump/dump |

## Env (tùy chọn)

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `PRICE_PATH_MIN_PCT_FOR_WALK` | `0.025` | \|Δ\|/from ≥ ngưỡng → walk thay vì teleport |
| `PRICE_PATH_STEP_PCT` | `0.008` | Kích thước bước ~0.8% |
| `PRICE_PATH_MAX_STEPS` | `24` | Tối đa số bước |
| `PRICE_PATH_STEP_DELAY_MS` | `100` | Delay giữa các bước walk |
| `PATH_BOOK_REFRESH_MIN_PCT` | `0.004` | Path tick: refresh sổ khi target lệch ≥ 0.4% |

## API admin

`POST .../set-price`, `POST .../nudge` trả thêm khi walk:

```json
{ "price": 3, "previous": 1, "pathMode": "walk", "pathSteps": 12 }
```

`pathMode`: `instant` | `walk`.

## Tránh giật giá (pump admin)

Trong lúc **path walk**, Market Maker **không** blend spot về giá DB cũ (`pathWalkActive`). Cuối walk: `setSpotPrice` + `flushPricePersist` — hủy debounce ghi đè.

## Không áp dụng

- **KC** (stablecoin): không path / schedule (giữ rule hiện có).
- Khi đã có **lịch hoặc model run** đang chạy: không chồng walk instant (dùng path driver).

## UI

Preset instant ±3%: backend tự walk nếu đủ ngưỡng. Copy preset có thể ghi “đi bước + lấp sổ” thay vì “teleport”.
