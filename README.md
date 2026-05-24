# KingCoin

Monorepo gồm **frontend** (Next.js 15, React 19, Redux, Tailwind) và **backend** (NestJS 10, Prisma, MongoDB): giao diện token, giao dịch, tài khoản; API auth JWT, token crypto, order, upload (Cloudinary), v.v.

## Cấu trúc

| Thư mục    | Mô tả                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `frontend` | Ứng dụng Next.js (`src/pages`), gọi API backend qua hooks (`useFetchApi`, `useConfigApi`).     |
| `backend`  | API NestJS, Prisma schema, migrations, seed. Chi tiết: [backend/README.md](backend/README.md). |

## Chạy nhanh

Hướng dẫn đầy đủ (Mongo Docker dev, cổng backend **3001**, frontend **3000**): **[docs/DEV_SETUP.md](docs/DEV_SETUP.md)**.

Tóm tắt:

```bash
./scripts/dev-up.sh   # Mongo + prisma db push + seed (lần đầu / sau khi tắt Docker)
```

**Một lệnh chạy API + web** (từ gốc repo, sau khi đã `dev:up`):

```bash
npm install          # một lần ở gốc repo (cài concurrently)
npm run start:all    # backend :3001 + frontend :3000
```

Hoặc chuẩn bị DB rồi chạy luôn:

```bash
npm run dev:all
```

Hai terminal riêng (nếu cần):

```bash
cd backend && npm run start:dev    # cổng 3001
cd frontend && npm run dev         # cổng 3000
```

Mở [http://localhost:3000](http://localhost:3000). `frontend/.env` cần `NEXT_PUBLIC_API_URL` trỏ tới API (mặc định `http://localhost:3001/api/v1`).

## Tài liệu

| Doc | Mô tả |
|-----|--------|
| [docs/DEV_SETUP.md](docs/DEV_SETUP.md) | Chạy môi trường local |
| [docs/PRODUCT_SPEC_KINGCOIN.md](docs/PRODUCT_SPEC_KINGCOIN.md) | Đặc tả sản phẩm cấp cao |
| [docs/MODULES/README.md](docs/MODULES/README.md) | Đặc tả logic **từng module** (backend + frontend) |
| [docs/TECH_SPEC.md](docs/TECH_SPEC.md) | API, matching, ledger |
| [docs/PAGE_MAP.md](docs/PAGE_MAP.md) | Sitemap frontend |

## Ghi chú cho dev

- **Trang token** (`frontend/src/pages/token/[id].tsx`): khối cộng đồng hiện dùng component mock `modules/token/detail/comment.tsx` (UI tĩnh).

- **Biểu đồ giá** trade / token: dữ liệu từ API `GET /crypto-logs/:tokenId` (`TokenCryptoLog`) + giá spot token; mỗi lần khớp lệnh backend ghi thêm một log (giá khớp, khối lượng).

## Cursor

- Rule (luôn áp dụng trong project): [.cursor/rules/kingcoin-stack.mdc](.cursor/rules/kingcoin-stack.mdc)
- Skill + checklist **chuẩn bị**: [.cursor/skills/kingcoin-workspace/SKILL.md](.cursor/skills/kingcoin-workspace/SKILL.md)
- Command nhanh trong Cursor: **KingCoin — chuẩn bị…** → [.cursor/commands/kingcoin-chuan-bi.md](.cursor/commands/kingcoin-chuan-bi.md)
