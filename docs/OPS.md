# KingCoin — Vận hành (OPS)

## Health & API

- Health: `GET http://localhost:3001/api/v1/health`
- Swagger: `http://localhost:3001/docs`
- Danh sách token: `GET /api/v1/token-crypto/all`

## Khởi động dev

```bash
./scripts/dev-up.sh          # Mongo replica set + prisma push + seed
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Seed & tài khoản demo

| Script | Mục đích |
|--------|----------|
| `npm run seed` | Seed Prisma cơ bản |
| `npm run seed:kingcoin` | Token quote KingCoin |
| `npm run seed:marketmaker` | User MM |
| `npm run credit:kingcoin-balance` | Cộng KC cho user |

Biến môi trường: `QUOTE_TOKEN_NAME=KingCoin`, `TOKEN_LISTING_FEE_KC=1000`.

## Market maker

Xem [MARKET_MAKER.md](./MARKET_MAKER.md). MM user mặc định: `marketmaker@kingcoin.local`.

## Admin

- Backend: routes `admin/*` (role `admin`)
- Frontend: `/admin` — danh sách user & token

## Credit KC thủ công

Dùng script `credit:kingcoin-balance` hoặc quest claim qua API `POST /quests/:id/claim`.

## WebSocket (tùy chọn)

Namespace: `/realtime`. Subscribe:

```json
{ "channel": "trades:<tokenId>" }
```

Sự kiện: `trade`, `orderbook`.

## Troubleshooting

| Triệu chứng | Gợi ý |
|-------------|--------|
| Prisma transaction lỗi | Mongo phải replica set (`dev-up.sh`) |
| Số dư không đổi sau khớp | Kiểm tra `TradeFill` + settlement trong `order.service` |
| Volume 0 | Cron `syncVolumesFromTradeLogs` — cần log từ khớp lệnh |
