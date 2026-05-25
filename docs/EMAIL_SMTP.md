# Email SMTP — KingCoin

## Case gửi mail

| Sự kiện | Template | API / trigger |
|---------|----------|----------------|
| Đăng ký | `email_verify` | `POST /auth/register` → mã 6 số |
| Xác nhận email xong | `signup_welcome` | `POST /auth/verify-email` |
| Quên mật khẩu | `password_reset` | `POST /auth/forgot-password` |
| Rủi ro thanh lý | `futures_margin_warning` | Cron liquidation scan |
| Thanh lý lệnh | `futures_liquidated` | `liquidatePosition` |

Song song vẫn có thông báo in-app (`NOTIFICATION_SPEC.md`).

## Cấu hình `backend/.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=app-password-here
MAIL_FROM=KingCoin <your@gmail.com>
APP_PUBLIC_URL=http://localhost:3000

# Bắt buộc xác minh email trước khi login (mặc định true)
EMAIL_VERIFICATION_REQUIRED=true
```

**Dev không có SMTP:** mail in ra log Nest (`[mail:dev]`) — vẫn lấy mã từ console để test `/register/verify`.

**Tài khoản cũ:** đăng nhập lần đầu không có mã verify đang chờ → tự gán `emailVerifiedAt` (không khóa user cũ).

## API auth mới

| Method | Path |
|--------|------|
| POST | `/auth/verify-email` `{ email, code }` |
| POST | `/auth/resend-verification` `{ email }` |
| POST | `/auth/forgot-password` `{ email }` |
| POST | `/auth/reset-password` `{ email, code, password }` |

## Frontend

- `/register/verify?email=…`
- `/forgot-password`
- `/reset-password?email=…`
