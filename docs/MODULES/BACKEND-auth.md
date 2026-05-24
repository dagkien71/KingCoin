# Module: `auth` (Backend)

**Path:** `backend/src/modules/auth/`  
**Phụ thuộc:** `user`, JWT, Prisma `TokenWhiteList`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Sàn / app thật |
|-----------|----------------|
| Đăng ký email + mật khẩu | Binance, OKX, Coinbase |
| Access + refresh token | OAuth2-style session |
| Đăng xuất / revoke refresh | Session invalidation |
| Bảo mật mật khẩu | bcrypt / argon2 hash |

**KingCoin không có (v1):** 2FA, OAuth Google/Apple, SMS OTP, passkey, KYC gate.

---

## 2. Mục đích

Xác thực người dùng, cấp JWT, tạo tài khoản kèm **ví KC ban đầu** để vào vòng lặp quest/trade ngay.

---

## 3. Phạm vi

| IN | OUT |
|----|-----|
| Register, login, refresh, logout | Social login |
| Hash password (bcrypt) | Forgot password email flow (chưa) |
| Migrate plaintext password cũ → bcrypt khi login | Web3 wallet sign-in làm auth chính |

---

## 4. API

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/auth/register` | Tạo user + `Balance` + seed KC |
| POST | `/auth/login` | Trả access + refresh token |
| POST | `/auth/token/refresh` | Đổi refresh → access mới |
| POST | `/auth/logout` | Xóa refresh trong whitelist |

**Guard:** `AuthGuard` global; route public dùng `@SkipAuth()`.

---

## 5. Luồng nghiệp vụ

### 5.1 Đăng ký

1. Kiểm tra email trùng → `409 USER_CONFLICT`.
2. `bcrypt.hash(password, 10)`.
3. Tạo `User` + `Balance` (`stableCoin: 0`).
4. `seedInitialQuoteTokenForUser(userId, INITIAL_KC_BALANCE)` — mặc định env `100000` KC.
5. Trả user (không tự login; FE redirect login).

### 5.2 Đăng nhập

1. Tìm user theo email.
2. So khớp mật khẩu: bcrypt **hoặc** plaintext legacy (migrate sang bcrypt nếu khớp plaintext).
3. `TokenService` phát JWT + lưu refresh `TokenWhiteList`.

### 5.3 Demo / dev

- User seed: `demo@kingcoin.local` / `demo12345` (script seed, không hardcode trong module).

---

## 6. Data & quyền

- **Roles:** `user` | `admin` | `agent` (enum Prisma).
- JWT payload gắn `sub`, `role` cho CASL / guard.

---

## 7. Trạng thái implement

| Hạng mục | Trạng thái |
|----------|------------|
| Register + initial KC | ✅ |
| Login bcrypt + legacy migrate | ✅ |
| Refresh / logout | ✅ |
| Rate limit (Throttler global) | ✅ |
| 2FA / email verify | ❌ Gap |

---

## 8. Frontend liên quan

- `pages/login`, `pages/register`
- Cookie `sessionToken` (middleware bảo vệ route private)
- `hooks/useAuth.ts` → `GET /users/me`
