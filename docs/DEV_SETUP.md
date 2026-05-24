# Chạy local: Frontend ↔ Backend ↔ MongoDB

**Một lệnh chuẩn bị DB** (Mongo + `db push` + seed): từ gốc repo chạy `./scripts/dev-up.sh` (xem [scripts/dev-up.sh](../scripts/dev-up.sh)).

## Vì sao cần replica set?

Prisma + MongoDB trong repo này yêu cầu **replica set**. MongoDB cài sẵn trên máy **không** bật `--replSet` thì Prisma sẽ lỗi (ví dụ `P2031`).

Cách nhanh nhất: **Docker** — file `backend/docker-compose.dev.yml` (một container, cổng host **27018**).

## Bước 1 — Mongo dev

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml exec mongo-dev mongosh --port 27018 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27018"}]})'
```

Lần đầu sau khi sửa compose/xóa volume, chạy lại `rs.initiate` (chỉ khi chưa có PRIMARY).

`backend/.env` đã cấu hình mẫu:

- `DATABASE_URL=mongodb://127.0.0.1:27018/starter?replicaSet=rs0`
- `APP_PORT=3001` (tránh trùng cổng với Next.js **3000**)

## Bước 2 — Schema & dữ liệu mẫu

```bash
cd backend
npm run db:generate
npm run db:push
```

Seed token demo (một lần, khi collection token còn trống):

```bash
cd backend && node scripts/seed-demo-token.js
```

## Bước 3 — Backend & Frontend

**Một lệnh** (từ gốc repo, sau `dev-up`):

```bash
npm install          # một lần
npm run start:all    # Nest :3001 + Next :3000
```

Chuẩn bị DB + chạy luôn: `npm run dev:all`.

Hoặc hai terminal — `frontend/.env` cần `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`:

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Kiểm tra có data từ DB

```bash
curl -s "http://localhost:3001/api/v1/token-crypto/all" | head -c 500
```

Trên UI: mở **http://localhost:3000/token/list** — danh sách token gọi `GET /token-crypto/all`.

## Quest marketing & KC (tuỳ chọn trong `backend/.env`)

| Biến | Gợi ý dev | Mô tả |
|------|-----------|--------|
| `INITIAL_KC_BALANCE` | `2000` | KC khi đăng ký (tránh `100000` — quest mất ý nghĩa) |
| `QUEST_DELAYED_CLAIM_SECONDS` | `45` | Chờ sau «Làm ngay» trước khi claim social/share |
| `REFERRAL_MAX_PER_MONTH` | `20` | Cap lượt mời/tháng/referrer |
| `APP_PUBLIC_URL` | `http://localhost:3000` | Link mời `register?ref=` |
| `QUEST_SOCIAL_FACEBOOK_URL` | URL fanpage | Quest follow Facebook |
| `QUEST_SOCIAL_ZALO_URL` | URL Zalo | Quest follow Zalo |

Đặc tả: [QUEST_MARKETING_SPEC.md](./QUEST_MARKETING_SPEC.md). Sau khi sửa schema quest/referral, chạy `npm run db:push` trong `backend/`.

## Thông báo & Web Push (tuỳ chọn)

| Biến | Mô tả |
|------|--------|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Tạo: `npx web-push generate-vapid-keys` trong `backend/` |
| `VAPID_SUBJECT` | `mailto:dev@kingcoin.local` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cùng public key — `frontend/.env` |

Đặc tả: [NOTIFICATION_SPEC.md](./NOTIFICATION_SPEC.md). Web Push chỉ hoạt động trên `localhost` hoặc HTTPS. Sau schema notification: `cd backend && npm run db:push`.

## Ghi chú

- Swagger backend: `http://localhost:3001/docs` (có thể cần basic auth theo `swagger` trong config).
- Nếu dùng lại cluster 3 node (`docker-compose.yml` + volume ngoài), đổi lại `DATABASE_URL` trong `backend/.env` cho phù hợp.
