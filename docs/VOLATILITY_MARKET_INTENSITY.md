# Cường độ thị trường (Volatility slider)

Admin: **Cài đặt hệ thống → Thanh khoản & MM** (`/admin/market-settings`).

## Mục đích

Một thanh **5 mức** (`gentle` → `extreme`) điều khiển **hành vi giao dịch**, không chỉ biên độ giá hiển thị:

| Trục | Tham số |
|------|---------|
| Tần suất lệnh | `mmIntervalMs`, `flowIntervalMs`, số bot |
| Khối lượng | `qty`, `flowQty`, `levels` |
| Tỷ lệ khớp | `flow.passesPerTick`, `bothSidesPerTick`, `spreadStep` |
| Biến động giá | Chủ yếu từ **khớp lệnh**; mức mạnh thêm **lệch sổ nhẹ** (`bookSkewPct`) theo hướng flow |

## Giá từ giao dịch

Ở chế độ MM+flow 24/7 (không lịch / không GBM):

- Spot (`TokenCrypto.price`) cập nhật qua `matchOrders` sau khi flow/MM khớp.
- MM treo sổ quanh giá spot / mid sổ; **không** đẩy giá bằng sóng sin + `updatePriceLive`.
- Đổi mức slider: neo spot hiện tại, **ramp** tham số ~45s (`VOLATILITY_RAMP_MS`).

## API

- `GET /api/v1/admin/market-settings` — `currentVolatilityLevel`, `volatilityProfiles`, `volatilityRamping`
- `POST /api/v1/admin/market-settings/presets/volatility/:level` — lưu DB + hủy model giá đang chạy

## Code

- Preset: `backend/src/modules/market-maker/volatility-presets.util.ts`
- Ramp: `volatility-transition.service.ts`
- MM: `market-maker.service.ts` (`refreshLiquidityForToken`)
- Flow: `market-flow.service.ts`
- User-bot (taker market): `user-bot.service.ts` + script `scripts/ensure-user-bot.js`

## User-bot (giả lập người mua/bán thật)

`user-bot` là một user đặt lệnh theo **giá market** (mua = best ask, bán = best bid) để khớp với lệnh MM đang treo.

Env (backend):

- `USER_BOT_ENABLED` (`true/false`, dev mặc định theo MM)
- `USER_BOT_INTERVAL_MS` (mặc định `250`)
- `USER_BOT_QTY` (mặc định `2`)
- `USER_BOT_EMAIL` (mặc định `user-bot@kingcoin.local`)

Tạo/sync user:

```bash
cd backend
node scripts/ensure-user-bot.js
```

Xem thêm: [MARKET_MAKER.md](./MARKET_MAKER.md)
