# Đặc tả — Tài khoản: Thông tin (Profile) & Tổng quát (Dashboard)

Tài liệu mô tả đầy đủ hai màn trong khu `/account`, đối chiếu sàn mô phỏng KingCoin (KC quote, không nạp/rút fiat thật).

**Route**

| Route | Tab nav | Mục đích |
|-------|---------|----------|
| `/account` | Thông tin | Hồ sơ, bảo mật cơ bản, liên kết nhanh |
| `/account/dashboard` | Tổng quát | NAV ước tính, tài sản, PnL, hoạt động gần đây |

**API lõi**

| Endpoint | Dùng cho |
|----------|----------|
| `GET /users/me` | Profile, PnL demo (`dailyPnL`, `dailyPnLPercent`, …) |
| `PATCH /users/me` | Avatar, username, introduction, … |
| `GET /users/me/balances` | KC + token holdings |
| `GET /users/me/ledger` | Lịch sử biến động ví (paginate) |
| `GET /token-crypto/all` | Giá spot mọi mã niêm yết (kết hợp live WS) — **không** dùng `GET /token-crypto` (chỉ token user tạo) |
| `GET /quests` | Thẻ nhắc nhiệm vụ (dashboard) |

---

## 1. Nguyên tắc UX

1. **Tổng quát ≠ Thị trường** — Dashboard chỉ liệt kê tài sản user **đang nắm** (+ dòng KC), không liệt kê toàn bộ token niêm yết.
2. **NAV ước tính (đơn vị KC)** — KC đóng vai **USDT**: `NAV = quoteKc + Σ (amount × giá TOKEN/KC hiện tại)`. Ví dụ: mua **SLR** bằng KC → phần SLR trong NAV = `số SLR × giá SLR→KC` **tại thời điểm xem**, không cố định theo giá lúc mua. Chi tiết: [STABLECOIN_KC_SPEC.md](./STABLECOIN_KC_SPEC.md#quy-đổi-vốn-nav--kc-như-usdt).
3. **PnL hôm nay / tuần** = Δ NAV (KC) so với mốc đầu ngày/tuần (`PortfolioPnlService` trên `GET /users/me`) — **không** phải tổng KC đã trả khi mua alt.
4. **Nạp / Rút / Chuyển tiền** — hiển thị nhưng **disabled** + tooltip «Mô phỏng — không hỗ trợ fiat/on-chain».
5. **Ẩn số dư** — toggle cục bộ (session), không đổi API.
6. Ngôn ngữ UI: **tiếng Việt**, số dùng class `num`, đơn vị quote: `KC` (`QUOTE_SYMBOL`).
7. **Data freshness** — xem [UI_DATA_FRESHNESS_SPEC.md](./UI_DATA_FRESHNESS_SPEC.md): giá alt qua WS ticker; **số dư / ledger** refetch silent khi stream `trades` (không chỉ load một lần).

---

## 2. Trang Tổng quát (`/account/dashboard`)

### 2.1 Layout (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ [Banner] Xin chào {username} · Thành viên từ {ngày}        │
├──────────────────────────────┬──────────────────────────────┤
│ Tổng giá trị ước tính (NAV)  │ Phân bổ tài sản (donut)      │
│ PnL hôm nay / tuần           │ KC vs Altcoin                │
│ [Nạp*] [Chuyển đổi] [Giao dịch] [Nhiệm vụ]                  │
├──────────────────────────────┤ Giao dịch gần đây (ledger)   │
│ Bảng tài sản đang nắm        │ Liên kết: Ví · Lịch sử lệnh │
│ Tìm · Ẩn nhỏ · Sắp xếp       │                              │
└──────────────────────────────┴──────────────────────────────┘
* disabled
```

### 2.2 Khối NAV & PnL

| Thành phần | Nguồn | Ghi chú |
|------------|-------|---------|
| NAV tổng | `computePortfolio()` | KC + token |
| PnL ngày | `user.dailyPnL`, `dailyPnLPercent` | Màu up/down |
| PnL tuần | `user.weeklyPnL`, `weeklyPnLPercent` | Tuỳ chọn hiển thị |
| Ẩn số dư | `useState` + mask `******` | Icon eye |

### 2.3 Hành động nhanh

| Nút | Hành vi |
|-----|---------|
| Nạp tiền | Disabled + tooltip |
| Rút tiền | Disabled + tooltip |
| Chuyển đổi | `router.push('/convert')` |
| Giao dịch | `router.push('/trade')` |
| Nhiệm vụ | `router.push('/quest')` |
| Ví chi tiết | `router.push('/wallet')` |

### 2.4 Bảng tài sản

Cột: Logo + Tên (symbol) · Số lượng · Giá KC · Giá trị KC · % danh mục (tuỳ chọn).

- Chỉ rows từ `balances.tokens` + hàng **KingCoin (KC)** đầu bảng.
- **Ẩn tài sản nhỏ**: lọc giá trị KC &lt; `0.01`.
- Click row → `/trade/{symbol}` nếu có symbol.
- Giá: `LiveAssetQuotePrice` / `useLiveToken`.

### 2.5 Phân bổ (sidebar)

Donut hoặc thanh: % KC vs % altcoin (theo NAV). Không dùng placeholder «Funding / Earn» trừ khi có module tương ứng.

### 2.6 Giao dịch gần đây

- 8 dòng đầu `ledger`, label qua `ledgerEntryLabel`.
- Thời gian `toLocaleString('vi-VN')`.
- Link «Xem tất cả» → `/wallet`.

### 2.7 Biểu đồ NAV (phase 2)

- **v1**: placeholder hoặc thay bằng donut phân bổ.
- **v2**: series NAV từ snapshot ledger / cron — ngoài scope v1 code hiện tại.

### 2.8 Thẻ nhắc (optional v1)

- Quest chưa claim: link `/quest`.
- Admin: link `/admin/market-control`.

---

## 3. Trang Thông tin (`/account`)

### 3.1 Sections

| Section | Trường | Chỉnh sửa |
|---------|--------|-----------|
| Ảnh đại diện | `avatar` | Upload → PATCH |
| Thông tin cá nhân | `username`, `id` | Username: modal PATCH; ID: copy |
| Giới thiệu | `introduction` | Textarea + Lưu |
| Xác minh | `isVerified` | Chỉ đọc; badge Đã xác minh / Chưa |
| Tài khoản | `email`, `phone`, `createdAt` | Email/phone: phase sau (disabled + «Sắp có») |
| Bậc phí | placeholder | «Cấp 1 — mô phỏng» |
| Liên kết nhanh | — | Dashboard, Ví, Quest, Lịch sử GD |
| Admin | `role === admin` | Link admin + market control |
| Đăng xuất | — | POST logout + clear session |

### 3.2 Không làm trong v1

- Đổi email/phone qua UI (cần OTP).
- KYC flow thật.
- `/account/security` (2FA) — phase sau (`GAP_ANALYSIS.md`).

---

## 4. Điều hướng & shell

`AccountHeader` tabs:

1. Thông tin — `/account`
2. Tổng quát — `/account/dashboard`
3. (tuỳ chọn) Ví — `/wallet` — liên kết ngoài tab nhưng cùng nhóm tài khoản

`AppShell`: `pt-28` khi có account sub-nav.

---

## 5. Trạng thái triển khai

| Hạng mục | Trạng thái |
|----------|------------|
| NAV + holdings đúng user | ✅ v1 |
| PnL từ API (không fake %) | ✅ v1 |
| Ẩn số dư | ✅ v1 |
| Phân bổ thật | ✅ v1 donut |
| Ledger gần đây + label | ✅ v1 |
| Profile sửa username/intro | ✅ v1 |
| Biểu đồ NAV theo thời gian | ⏸ phase 2 |
| Nạp/rút thật | ❌ ngoài scope |
| Security / referral | ⏸ phase sau |

---

## 6. Kiểm thử nhanh

1. Đăng nhập user có KC + vài alt từ quest/trade.
2. `/account/dashboard`: NAV ≈ tổng tay tính; chỉ thấy token đang giữ.
3. Toggle ẩn số dư → mask.
4. PnL hiển thị đúng dấu sau vài lệnh khớp.
5. `/account`: đổi username + introduction → PATCH thành công.
6. Ledger «Xem tất cả» mở `/wallet`.

---

## 7. Tham chiếu code

| File | Vai trò |
|------|---------|
| `frontend/src/pages/account/dashboard.tsx` | Tổng quát |
| `frontend/src/pages/account/index.tsx` | Profile |
| `frontend/src/modules/account/portfolio.ts` | Tính NAV |
| `frontend/src/modules/account/components/*` | Donut, quick links |
| `frontend/src/components/layout/protectedLayout/account-header.tsx` | Sub-nav |
| `docs/MODULES/FRONTEND-account-wallet-quest.md` | Module tổng quan |
