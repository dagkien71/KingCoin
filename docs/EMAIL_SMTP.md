# Email SMTP — KingCoin

## Case gửi mail

| Sự kiện | Template | API / trigger |
|---------|----------|----------------|
| Đăng ký | `email_verify` | `POST /auth/register` → mã 6 số |
| Xác nhận email xong | `signup_welcome` | `POST /auth/verify-email` |
| Quên mật khẩu | `password_reset` | `POST /auth/forgot-password` |
| Đổi email (Hồ sơ) | `email_change_verify` | `POST /auth/email-change/request` → mã tới **email mới** |
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

# Chỉ khi true: bắt buộc xác minh email trước login (mặc định false)
# EMAIL_VERIFICATION_REQUIRED=true
```

**Dev không có SMTP:** mail in ra log Nest (`[mail:dev]`) — vẫn lấy mã từ console để test `/register/verify`.

## Production (Render) — không nhận email đăng ký

1. **Redeploy** sau khi thêm/sửa env SMTP (env không áp vào process cũ).
2. Log Render khi start: `[mail] SMTP OK` hoặc `SMTP verify thất bại` — đọc message (sai app password, Gmail chặn IP, v.v.).
3. `SMTP_USER` = `kienngu752@gmail.com`, `MAIL_FROM` = `KingCoin <kienngu752@gmail.com>` (cùng địa chỉ).
4. `SMTP_PASS` = **mật khẩu ứng dụng** 16 ký tự, không khoảng trắng, không MK đăng nhập Gmail.
5. Kiểm tra **Spam / Quảng cáo**; thử đăng ký email khác (Gmail → Gmail thường ổn hơn).
6. API trả `sent: false` (đổi email / resend / quên MK) → SMTP lỗi hoặc chưa cấu hình; sửa env, redeploy, thử lại.
7. Log khi gửi đổi email thất bại: `[auth] Không gửi được mail (email_change_verify)` — kèm mã trên log server (dev/Render).
8. Render free đôi khi bị Gmail từ chối IP datacenter — cân nhắc [Resend](https://resend.com), SendGrid, hoặc Mailtrap cho production.

**Tài khoản cũ:** đăng nhập lần đầu không có mã verify đang chờ → tự gán `emailVerifiedAt` (không khóa user cũ).

## API auth mới

| Method | Path |
|--------|------|
| POST | `/auth/verify-email` `{ email, code }` |
| POST | `/auth/resend-verification` `{ email }` |
| POST | `/auth/forgot-password` `{ email }` |
| POST | `/auth/reset-password` `{ email, code, password }` |

## Frontend

- Đăng ký → đăng nhập ngay (không bắt verify).
- **Tài khoản → Hồ sơ:** banner «Email chưa xác minh» + Gửi mã / Nhập mã → `/register/verify?email=…`
- `/forgot-password`
- `/reset-password?email=…`
