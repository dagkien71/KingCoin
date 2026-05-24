# Frontend: Shell, Auth, Layout

**Path:** `frontend/src/components/layout/`, `pages/login`, `pages/register`, `middleware.ts`, `hooks/useAuth.ts`, `store/`

---

## 1. Chuẩn ngoài

| Thành phần | Sàn |
|------------|-----|
| Header: Markets, Trade, Wallet | Top nav |
| Login / Register | Account gateway |
| Session cookie + redirect | Standard web app |
| Footer legal disclaimer | Risk disclosure |

---

## 2. `middleware.ts`

| Route | Rule |
|-------|------|
| `/` | → `/home` |
| `/account`, `/token/create`, `/wallet`, `/quest`, `/admin` | Cần cookie `sessionToken` |
| `/login`, `/register` | Đã login → `/account` |

**Gap:** `/trade` public (xem sàn không login); đặt lệnh redirect login trong form.

---

## 3. Layout

| Component | Vai trò |
|-----------|---------|
| `app-shell` | Header + footer + children |
| `header` | Nav, search, auth |
| `site-footer` | Links terms/privacy/risk |
| `protectedLayout` | Account sub-layout |

---

## 4. Auth state

- Redux `authSlice` + `sessionTokenSlice`
- `useAuth`: `GET /users/me`, `updateUserInfo`, watchlist
- `useMutation`: POST login/register — **không throw**, parse `error.message`
- `useConfigApi`: gắn Bearer từ cookie

---

## 5. Pages

| Page | API |
|------|-----|
| `/login` | POST `/auth/login` |
| `/register` | POST `/auth/register` |
| `/home` | Landing |
| `/faq`, `/terms`, `/privacy`, `/risk` | Static legal |

---

## 6. Config

- `NEXT_PUBLIC_API_URL` → `constant/config.ts`
- `NEXT_PUBLIC_API_ORIGIN` → WebSocket

---

## 7. Trạng thái

| Hạng mục | Trạng thái |
|----------|------------|
| Cookie session | ✅ |
| Protected routes | ✅ |
| `/account/security` 2FA | ❌ |
