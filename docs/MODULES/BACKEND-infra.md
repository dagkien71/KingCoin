# Module: Hạ tầng — `upload`, `cloudinary`, `casl`, `health`

---

## `upload` + `cloudinary`

### Chuẩn ngoài
Avatar / token logo upload như profile CEX (S3/Cloudinary).

### KingCoin
- POST `/upload` → Cloudinary (config `s3.config` / cloudinary provider).
- FE `components/upload` dùng khi tạo token.

### Phạm vi
| IN | OUT |
|----|-----|
| Single file image | Virus scan, CDN signed URL policy |

---

## `casl`

### Chuẩn ngoài
RBAC: admin full, agent scoped, user own resources.

### KingCoin
- `@UseAbility` trên admin/agent controllers.
- Roles: `admin`, `user`, `agent` (`app.roles.ts`).
- `AccessGuard` + factories trong `casl/`.

### Controllers bảo vệ
- `user-admin.controller`
- `token-admin.controller`, `token-agent.controller`

---

## `health`

| Route | Mô tả |
|-------|--------|
| GET `/health` | Liveness |
| GET `/health/memory` | Heap |
| GET `/health/disk` | Disk |

Dùng CI smoke / k8s probe.

---

## `app.module` cross-cutting

| Thành phần | Vai trò |
|------------|---------|
| `AuthGuard` | JWT global |
| `ThrottlerGuard` | 120 req / 60s |
| `ScheduleModule` | Cron MM, token price |
| `PrismaModule` | Mongo + middleware logging |

---

## Prisma providers

- `createUserMiddleware` — audit user on write
- Replica set Mongo **bắt buộc** cho transaction Prisma
