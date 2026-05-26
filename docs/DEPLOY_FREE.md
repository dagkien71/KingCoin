# Deploy production miễn phí (KingCoin)

Stack gợi ý **0 đồng** cho demo / MVP, phù hợp monorepo Next.js + NestJS + MongoDB (Prisma cần **replica set**).

| Thành phần | Dịch vụ | Free tier | Ghi chú |
|------------|---------|-----------|---------|
| **Frontend** | [Vercel](https://vercel.com) | Hobby | Next.js 15, deploy từ GitHub |
| **Backend API + WebSocket** | [Render](https://render.com) | Web Service free | Cold start ~30–60s sau 15 phút idle |
| **MongoDB** | [MongoDB Atlas](https://www.mongodb.com/atlas) | M0 512MB | Có sẵn replica set — Prisma OK |

> **Lưu ý free Render:** service **ngủ** khi không có traffic. Lần mở đầu tiên chậm. Market maker / cron vẫn chạy khi service thức; nếu ngủ lâu, dùng [UptimeRobot](https://uptimerobot.com) ping `GET /api/v1/health` mỗi 10–14 phút (chỉ cho demo).

---

## 1. MongoDB Atlas

1. Tạo cluster **M0 FREE** (region gần Singapore nếu user VN).
2. Database Access → user + password.
3. Network Access → **Allow access from anywhere** (`0.0.0.0/0`) hoặc IP Render sau khi có.
4. Connect → Drivers → copy URI. **Bắt buộc** cluster **M0 (Replica Set)**, không dùng Serverless/Flex nếu app dùng transaction Prisma.
   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/kingcoin?retryWrites=true&w=majority
   ```
   Trên Render, `DATABASE_URL` phải có **tên DB** (`/kingcoin`) và user/pass **URL-encode** nếu có ký tự đặc biệt.
5. Lần đầu deploy backend, chạy (local hoặc Render Shell):
   ```bash
   cd backend && npx prisma db push
   node scripts/seed-demo-token.js
   node scripts/ensure-kingcoin-token.js
   node scripts/ensure-market-maker-user.js
   ```

---

## 2. Backend trên Render

1. Push repo lên **GitHub**.
2. Render → **New → Web Service** → chọn repo.
3. Cấu hình:
   - **Root Directory:** `backend`
   - **Runtime:** Docker *hoặc* Node
   - **Build Command:** `npm ci && npm run db:generate && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Health Check Path:** `/api/v1/health`

4. **Environment Variables** (bắt buộc / quan trọng):

   | Biến | Ví dụ |
   |------|--------|
   | `DATABASE_URL` | URI Atlas ở trên |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | chuỗi random dài (≥32 ký tự) |
   | `APP_PUBLIC_URL` | `https://king-coin-crypto-cex.vercel.app` |
   | `BASE_URL` | `https://kingcoin-api.onrender.com` |
   | `SWAGGER_PASSWORD` | mật khẩu vào `/docs` |

   Tuỳ chọn:

   | Biến | Mục đích |
   |------|----------|
   | `MARKET_MAKER_ENABLED` | `true` — bắt buộc nếu muốn thanh khoản trên prod |
   | `MARKET_MAKER_BOT_COUNT` | `12` (mặc định prod khi không set) — số bot treo sổ |
   | `MARKET_FLOW_BOT_COUNT` | `4` — bot khớp taker |
   | `MARKET_MAKER_LEVELS` | `10` — bậc giá mỗi bot |
   | `MARKET_MAKER_QTY` | `120` — khối lượng mỗi bậc |
   | `MARKET_FLOW_QTY` | `16` |

   Chi tiết: [MARKET_MAKER.md](./MARKET_MAKER.md), mẫu env: [env.production.liquidity.example](./env.production.liquidity.example). Sau deploy, bootstrap tạo `mm1`…`mm12` + `flow1`…`flow4` nếu chưa có.

   | `INITIAL_KC_BALANCE` | KC khi đăng ký, vd `2000` |
   | `CLD_CLOUD_NAME`, `CLD_API_KEY`, `CLD_API_SECRET` | Upload ảnh Cloudinary (free tier) |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push |

5. Sau deploy, kiểm tra:
   ```bash
   curl https://YOUR-API.onrender.com/api/v1/health
   curl https://YOUR-API.onrender.com/api/v1/token-crypto/all
   ```

**Docker:** repo đã có `backend/Dockerfile` — chọn Environment = Docker nếu muốn.

**PORT:** Render gán `PORT` tự động; app đọc `PORT` hoặc `APP_PORT`.

---

## 3. Frontend trên Vercel

1. [vercel.com](https://vercel.com) → Import GitHub repo.
2. **Root Directory:** `frontend`
3. Framework: Next.js (auto).
4. **Environment Variables:**

   | Biến | Giá trị |
   |------|---------|
   | `NEXT_PUBLIC_API_URL` | `https://kingcoin-mlnz.onrender.com/api/v1` |
   | `NEXT_PUBLIC_API_ORIGIN` | `https://kingcoin-mlnz.onrender.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://king-coin-crypto-cex.vercel.app` |

   `NEXT_PUBLIC_API_ORIGIN` cần cho **WebSocket** (`/realtime`). `NEXT_PUBLIC_APP_URL` dùng cho link mời/chia sẻ.

5. Deploy → mở https://king-coin-crypto-cex.vercel.app

6. Cập nhật backend `APP_PUBLIC_URL` = `https://king-coin-crypto-cex.vercel.app` (referral, link email).

---

## 4. Checklist sau deploy

- [ ] Đăng ký / đăng nhập user
- [ ] `/token/list` có token
- [ ] Trade / chart có giá (WS hoặc poll fallback)
- [ ] Admin login (`admin@kingcoin.local` nếu đã seed — **đổi mật khẩu prod**)
- [ ] Swagger `/docs` (basic auth)

---

## Phương án thay thế

| Nhu cầu | Gợi ý |
|---------|--------|
| **Không cold start, vẫn free** | Oracle Cloud Always Free VM (ARM) — chạy Docker Compose Mongo + API + build Next static hoặc PM2 |
| **Backend + DB gói** | Railway (credit/tháng), Fly.io (allowance) |
| **Chỉ frontend preview** | Vercel + API local tunnel (ngrok) — không khuyến nghị prod |

---

## Bảo mật production

- Không commit `.env` — chỉ set trên Vercel/Render.
- `JWT_SECRET` mạnh, khác dev.
- Atlas: hạn chế IP khi biết IP cố định của host.
- Tắt hoặc bảo vệ Swagger (`SWAGGER_PASSWORD`).
- Seed account demo: đổi password hoặc xóa trước khi public.

---

## Troubleshooting

| Triệu chứng | Gợi ý |
|-------------|--------|
| Prisma P2031 / transaction | URI Atlas phải cluster replica set (M0 OK) |
| Frontend gọi API CORS | Backend `cors: true` — kiểm tra URL `NEXT_PUBLIC_API_URL` đúng `/api/v1` |
| WS không kết nối | Set `NEXT_PUBLIC_API_ORIGIN` không có `/api/v1` |
| API 502 sau idle | Render free đang wake — ping health hoặc nâng plan |
| Build frontend fail | Env `NEXT_PUBLIC_*` phải có lúc build trên Vercel |
