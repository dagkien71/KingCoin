---
name: kingcoin-workspace
description: >-
  Monorepo KingCoin (Next.js frontend + NestJS/Prisma/MongoDB backend). Use when
  editing this repo, Vietnamese UI copy, or when the user says **chuẩn bị** /
  "prepare dev" / "start project" — then run the full local stack (Docker
  Mongo, prisma, seed, Nest on 3001, Next on 3000) until usable.
---

# KingCoin workspace

Cùng hệ với Rule [.cursor/rules/kingcoin-stack.mdc](../rules/kingcoin-stack.mdc) và Command Cursor **KingCoin — chuẩn bị** (file [.cursor/commands/kingcoin-chuan-bi.md](../commands/kingcoin-chuan-bi.md)).

## Layout

- **Frontend**: `frontend/` — Next.js Pages Router under `frontend/src/pages`; shared UI in `frontend/src/components`; domain modules in `frontend/src/modules`; API base URL and interceptors in `frontend/src/hooks/useConfigApi.ts` / `useFetchApi.ts`.
- **Backend**: `backend/` — Nest modules under `backend/src/modules`. Prisma in `backend/prisma`. Swagger: `http://localhost:3001/docs` (basic auth theo config), **not** port 3000.

## Conventions

- Path alias `@/*` maps to `frontend/src/*`.
- **Local stack:** [docs/DEV_SETUP.md](../../../docs/DEV_SETUP.md); Mongo dev **27018**; backend **3001** (`APP_PORT`); Next **3000**; `frontend/.env` cần `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.
- Prefer matching existing patterns (Formik/Yup, Redux slices).
- Do not commit secrets (`.env*`).

## Khi user nói **«chuẩn bị»** (hoặc tương đương: prepare dev, start full stack, bật môi trường)

Mục tiêu: **DB + API + web** sẵn sàng, user chỉ cần mở trình duyệt.

### Checklist (agent tự chạy lệnh, không chỉ hướng dẫn)

1. **Docker**
   - Nếu `docker info` lỗi: báo user mở Docker Desktop rồi nhắc lại «chuẩn bị».

2. **DB và schema** (từ **gốc repo** KingCoin):

   ```bash
   ./scripts/dev-up.sh
   ```

   Script này: `docker compose -f backend/docker-compose.dev.yml up -d`, đảm bảo replica set, `prisma db push`, `node backend/scripts/seed-demo-token.js` (seed nếu DB trống).

3. **API + Web một lệnh** (từ **gốc repo**, sau bước 2):

   ```bash
   npm install          # một lần ở gốc (concurrently)
   npm run start:all    # hoặc: npm start
   ```

   Chạy song song Nest **3001** + Next **3000** (`concurrently -k`). Hoặc gộp bước 2+3: `npm run dev:all` / `npm run dev`.

   Nếu port đã bật: chỉ `curl` health; không spawn thêm.

   Hai terminal riêng (khi cần debug):

   ```bash
   cd backend && npm run start:dev
   cd frontend && npm run dev
   ```

5. **Xác minh nhanh** (sau khi server lên):
   - `GET http://localhost:3001/api/v1/health` → 200
   - `GET http://localhost:3001/api/v1/token-crypto/all` → 200 và có `data` (sau seed có thể có token demo)

6. **Báo cho user**
   - Web: http://localhost:3000
   - API: http://localhost:3001/api/v1
   - Nếu đã có tài khoản: nhắc đăng nhập qua UI hoặc `POST /auth/login`

**Lưu ý:** Nếu port 3000/3001 đã bật bởi process cũ, không cần spawn thêm; chỉ cần xác minh health thành công.

## Token detail sidebar

`frontend/src/modules/token/detail/TokenCommentPanel.tsx` — bình luận token (API `/token-crypto/:id/comments`).

## Agent workflow (code)

1. Xác định frontend / backend / cả hai; bám module và style hiện có.
2. Luồng xuyên module chưa rõ → `graphify query "..."` hoặc xem rule [.cursor/rules/graphify.mdc](../rules/graphify.mdc); sau refactor lớn: `npm run graphify:update`.
3. Đổi API thì cập nhật `frontend/src/types/*.type.ts` hoặc DTO backend tương ứng.
4. `npm run lint` trong package vừa sửa; build frontend có thể fail do lint cũ — ưu tiên sửa phần liên quan thay đổi.
