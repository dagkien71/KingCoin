# Market maker (KingCoin)

Module **`MarketMakerService`** treo lệnh giới hạn hai phía (mua/bán) quanh **giá token trong DB** để sổ lệnh luôn có volume — phù hợp môi trường **demo / dev**.

## Cơ chế nền tảng

- **Theo từng giây (mặc định)**: `setInterval` gọi refresh thanh khoản **mỗi ~1 giây** (`MARKET_MAKER_INTERVAL_MS`, mặc định `1000`, tối thiểu `500`). Mỗi lượt: xóa các lệnh MM **pending & chưa khớp** cho token đích, rồi đặt lại **N bậc** mua + bán quanh giá DB (dao động + nhiễu từng bậc).
- **Cron dự phòng**: mỗi **45 giây** (trường hợp interval bị lỗi im lặng).
- **Khớp lệnh** dùng `OrderService.matchOrders`: **hai lệnh cùng `userId` không khớp với nhau**, nên MM phải là **user riêng**; trader thường đặt lệnh có thể khớp với MM.

## Dashboard điều khiển (admin)

Trang **`/admin/market-control`** (tài khoản `role=admin`):

- Bật/tắt MM và bot flow runtime
- Chỉnh **spread step**, **số bậc** sổ lệnh (global / từng token)
- **Lịch điều giá A→B**: trong khoảng thời gian, giá dao động sóng sin giữa `priceMin`–`priceMax`; MM treo sổ theo mục tiêu; hết B khôi phục giá trước lịch
- **Tăng/giảm giá spot** (+/− %), **đặt giá** cố định, **đẩy mid** sổ lệnh (không đổi DB)
- **Đường giá + sổ lệnh:** biến động lớn (≥ ~2.5%) đi **nhiều bước** thay vì teleport; mỗi bước refresh MM + flow sweep — [ORDERBOOK_PRICE_PATH_SPEC.md](./ORDERBOOK_PRICE_PATH_SPEC.md)
- **Bias mid** mỗi refresh, **kéo mid** về `targetPrice`, tạm dừng MM theo token
- API: `GET/PATCH /api/v1/admin/market-control`, `POST .../refresh`, `.../tokens/:id/nudge`, v.v.
- **Quản lý bot MM:** `/admin/mm-bots` — `GET/PATCH /api/v1/admin/mm-bots`, bật/tắt từng bot, hủy lệnh, refresh riêng.
- **Phương pháp 2 (mô hình đường giá):** `GET .../models`, `POST .../tokens/:id/model-run` — xem [MARKET_CONTROL_MODELS.md](./MARKET_CONTROL_MODELS.md) (GBM, OU, ramp, test plan QA).
- **KingCoin (KC) stablecoin:** không dùng lịch/mô hình trên KC — [STABLECOIN_KC_SPEC.md](./STABLECOIN_KC_SPEC.md).

Cấu hình lưu **trong RAM** process API — restart server trở về `.env`.

## Bật tính năng

- **Môi trường dev (`NODE_ENV` khác `production`)**: market maker **bật mặc định** nếu bạn **không** set `MARKET_MAKER_ENABLED`. Muốn tắt hoàn toàn: `MARKET_MAKER_ENABLED=false`.
- **Production**: chỉ chạy khi `MARKET_MAKER_ENABLED=true`.

Trong `backend/.env` (tuỳ chọn):

```env
# Production bắt buộc true; dev có thể bỏ qua (mặc định bật)
# MARKET_MAKER_ENABLED=true

# Nhiều token (theo field `name` trong DB), cách nhau bằng dấu phẩy
# MARKET_MAKER_TOKEN_NAMES=KingCoin,Demo KingCoin

# Hoặc một token (ưu tiên thấp hơn MARKET_MAKER_TOKEN_NAMES)
# MARKET_MAKER_TOKEN_NAME=KingCoin

# Hậu tố cặp trong trường `pair` (mặc định KC, khớp UI)
# QUOTE_DISPLAY_SYMBOL=KC

# Chu kỳ refresh (ms). Mặc định 1000 = mỗi giây; tối thiểu 500.
# MARKET_MAKER_INTERVAL_MS=1000

# tuỳ chọn:
# MARKET_MAKER_EMAIL=marketmaker@kingcoin.local
# MARKET_MAKER_LEVELS=6
# MARKET_MAKER_SPREAD_STEP=0.0025
# MARKET_MAKER_QTY=80
# Dao động quanh giá DB (± tỷ lệ), mặc định 0.006 = ±0.6%
# MARKET_MAKER_OSCILLATE_PCT=0.006
# Nhiễu ngẫu nhiên mỗi bậc mua/bán, mặc định 0.0005 ≈ 0.05%
# MARKET_MAKER_LEVEL_NOISE_PCT=0.0005
```

Sau khi bật API (`npm run start:dev`), MM **chạy sớm một lần** (~vài trăm ms), rồi **lặp theo `MARKET_MAKER_INTERVAL_MS`** (mặc định mỗi giây).

## Khớp ngay khi user đặt đúng giá thị trường

Sau khi user đặt lệnh, engine chạy `matchOrders` rồi **`MmInstantFillService`**: nếu giá lệnh **≈ giá spot** (`token.price`) hoặc **giá market API** (best ask khi mua / best bid khi bán), trong biên `MM_INSTANT_FILL_TOLERANCE_PCT` (mặc định **0,2%**), MM đặt lệnh **đối ứng cùng giá** → khớp ngay.

```env
# Tắt riêng tính năng này (vẫn giữ MM sổ lệnh)
# MM_INSTANT_FILL_ENABLED=false
# MM_INSTANT_FILL_TOLERANCE_PCT=0.002
```

Cần user MM (`ensure-market-maker-user.js`) đủ KC/base trong kho bot (`ensure-bot-inventory.js`).

## Luồng taker (mua MM bán / bán MM mua)

User **`MarketFlowService`** (email mặc định `flow@kingcoin.local`) luân phiên mỗi tick:

- **Lẻ:** đặt lệnh **mua** đúng giá **lệnh bán rẻ nhất** của MM trên token base (vd. DEMO) → khớp với MM bán.
- **Chẵn:** đặt lệnh **bán** đúng giá **lệnh mua cao nhất** của MM → khớp với MM mua.

Cần user tách biệt MM (engine không khớp hai lệnh cùng `userId`). Chuẩn bị:

```bash
cd backend
node scripts/ensure-flow-trader-user.js
```

Biến tuỳ chọn trong `backend/.env`:

```env
# Tắt bot taker nhưng giữ MM
# MARKET_FLOW_ENABLED=false

# MARKET_FLOW_EMAIL=flow@kingcoin.local
# Chu kỳ khớp (ms), mặc định 1500
# MARKET_FLOW_INTERVAL_MS=1500
# Khối lượng mỗi lượt (token base), mặc định 8
# MARKET_FLOW_QTY=8
# Token base theo field name trong DB (nhiều token: dấu phẩy)
# MARKET_FLOW_BASE_TOKEN_NAMES=Demo KingCoin
```

## Nhiều bot MM (production)

Mặc định **production** (`NODE_ENV=production`): **12** bot MM (`mm1@kingcoin.local` … `mm12`) + **4** bot flow (`flow1` … `flow4`), mỗi bot treo full ladder (mid lệch nhau một chút → sổ dày hơn).

```bash
cd backend
node scripts/ensure-liquidity-bots.js
node scripts/ensure-bot-inventory.js
```

Env (xem `docs/env.production.liquidity.example`):

| Biến | Gợi ý prod |
|------|------------|
| `MARKET_MAKER_ENABLED` | `true` |
| `MARKET_MAKER_BOT_COUNT` | `12` (mặc định prod nếu không set) |
| `MARKET_FLOW_BOT_COUNT` | `4` |
| `MARKET_MAKER_LEVELS` | `10` |
| `MARKET_MAKER_QTY` | `120` |
| `MARKET_FLOW_QTY` | `16` |
| `MARKET_MAKER_INTERVAL_MS` | `800` |
| `MARKET_FLOW_INTERVAL_MS` | `700` |

Hoặc liệt kê email: `MARKET_MAKER_BOT_EMAILS=mm1@...,mm2@...` (không gồm flow).

## Chuẩn bị user MM (một bot / dev)

```bash
cd backend
node scripts/ensure-market-maker-user.js
# hoặc mọi bot:
node scripts/ensure-liquidity-bots.js

MM và flow cần **KC** (mua) + **token base** (bán) để lưu hành trên sổ lệnh.

### Khi tạo token mới

Mỗi lần niêm yết (API `POST /token-crypto`, admin/agent, hoặc script seed), **`BotInventoryService.creditNewTokenToBots`** tự cấp **cùng một lượng tối thiểu** token đó cho **mọi bot** trong danh sách:

- Mặc định: `marketmaker@kingcoin.local` + `flow@kingcoin.local`
- Hoặc khai báo đủ list: `MARKET_MAKER_BOT_EMAILS=mm1@...,mm2@...,flow@...` (dấu phẩy)

Số lượng mỗi token base (trừ KingCoin quote): `MARKET_MAKER_BASE_BALANCE=5000000` (`.env`).

Đồng bộ thủ công toàn bộ token cho mọi bot:

```bash
cd backend && node scripts/ensure-bot-inventory.js
```

Nếu thêm bot MM mới: tạo user script (`ensure-market-maker-user.js` / `ensure-flow-trader-user.js`), thêm email vào `MARKET_MAKER_BOT_EMAILS`, rồi chạy `ensure-bot-inventory.js`.

Giá sổ lệnh dao động mỗi chu kỳ refresh (không cố định một mức):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `MARKET_MAKER_WANDER_PCT` | `0.004` | Random walk quanh mid (~±0.4%/tick) |
| `MARKET_MAKER_LEVEL_JITTER_PCT` | `0.0015` | Lệch thêm từng bậc giá |
| `MARKET_MAKER_SPREAD_STEP` | `0.0025` | Khoảng cách % giữa các bậc |
| `MARKET_MAKER_INTERVAL_MS` | `1000` | Tần suất đặt lại lệnh MM |
```

Mặc định email `marketmaker@kingcoin.local`, mật khẩu seed `mm-dev-change-me` (đổi qua `MARKET_MAKER_PASSWORD` khi chạy script).

## Lưu ý

- **Giá mid** lấy từ `TokenCrypto.price`; cập nhật giá token (admin / job khác) sẽ ảnh hưởng lượt refresh MM tiếp theo.
- Cân bằng ví KC/token trong `matchOrders` có thể chưa đồng bộ 100% với model `Balance` — cải tiến riêng nếu cần sổ sách chính xác.
- Production cần **risk limit**, **audit**, và thường tách MM ra service + API nội bộ.
