# KingCoin — Sitemap

## Công khai

| Route | Mô tả |
|-------|--------|
| `/home` | Landing |
| `/login`, `/register` | Auth |
| `/token/list`, `/markets` | Thị trường |
| `/token/[id]` | Chi tiết token |
| `/trade`, `/trade/[name]` | Terminal spot |
| `/futures`, `/futures/[name]` | Terminal hợp đồng (planned) — [FUTURES_SPEC.md](./FUTURES_SPEC.md) |
| `/terms`, `/privacy`, `/risk`, `/faq` | Pháp lý / FAQ |

## Đăng nhập

| Route | Mô tả |
|-------|--------|
| `/account` | Thông tin / hồ sơ (PATCH `/users/me`) |
| `/account/dashboard` | Tổng quát NAV, tài sản, PnL, ledger — xem `ACCOUNT_PROFILE_DASHBOARD_SPEC.md` |
| `/wallet` | KC + token + ledger |
| `/quest` | Nhiệm vụ |
| `/convert` | Swap KC ↔ token |
| `/trade/history` | Lệnh & khớp |
| `/token/create` | Phát hành token (phí KC) |
| `/admin` | Quản trị (admin) |
| `/admin/charts` | Lưới nến OHLC mọi token (admin) |
| `/admin/market-control` | Điều khiển MM / giá |

## Luồng chính

1. Đăng ký → quest claim KC → `/wallet`
2. `/trade/[symbol]` → đặt lệnh limit/market → sổ lệnh + chart
3. Tạo token → trừ KC listing → MM seed thanh khoản

Footer: disclaimer mô phỏng (không có giá trị tiền tệ thật).

## Tài liệu UI

| Doc | Nội dung |
|-----|----------|
| [UI_DATA_FRESHNESS_SPEC.md](./UI_DATA_FRESHNESS_SPEC.md) | Checklist: vùng UI có cần cập nhật khi API/WS đổi |
| [MODULES/FRONTEND-realtime.md](./MODULES/FRONTEND-realtime.md) | WS streams, hooks live |
| [FUTURES_SPEC.md](./FUTURES_SPEC.md) | Perpetual long/short, margin KC, liquidation |
