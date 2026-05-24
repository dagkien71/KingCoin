# Đặc tả sản phẩm — KingCoin (sàn mô phỏng + phát hành token)

**Phiên bản tài liệu:** 1.0  
**Trạng thái:** nháp — bám theo mô tả chủ sở hữu sản phẩm  
**Ngôn ngữ:** tiếng Việt

---

## 1. Tầm nhìn & định vị

### 1.1 Tầm nhìn

Xây dựng **trải nghiệm sàn giao dịch tiền mã hóa** (UX/UI và luồng giao dịch) **tương đương các sàn lớn** (ví dụ Binance, OKX) nhưng **hoàn toàn trong môi trường mô phỏng / miễn phí**: người dùng có thể **tự tạo token**, **niêm yết / giao dịch** như coin thật, **không dùng tiền pháp định** làm đơn vị chính.

### 1.2 Định vị một câu

> “Sàn KingCoin — nơi bạn tạo coin, trade như thật, trải nghiệm free; mọi thứ quy đổi qua đồng nền tảng **KingCoin (KC)** kiếm được từ nhiệm vụ.”

### 1.3 Nguyên tắc sản phẩm

| Nguyên tắc                   | Ý nghĩa                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| **Miễn phí trải nghiệm**     | Không nạp tiền thật để chơi core loop; KC là đơn vị nội bộ.      |
| **Quen thuộc**               | Biểu đồ, order book, lệnh mua/bán, ví token — gần với sàn thật.  |
| **KingCoin là trục kinh tế** | Thay USDT/stablecoin thật bằng KC cho hầu hết hành vi trong app. |
| **Minh bạch nguồn KC**       | User biết KC đến từ quest, từ trade, hay từ phí dịch vụ.         |

---

## 2. Mục tiêu & chỉ số thành công (gợi ý)

### 2.1 Mục tiêu kinh doanh / sản phẩm

- Tăng **DAU** và **thời gian phiên** nhờ vòng lặp: quest → KC → trade / tạo token.
- Tăng **viral** qua quest mời bạn, share.
- Giảm rào cản: **không cần ví Web3** (tuỳ chọn phải làm rõ ở mục 10).

### 2.2 KPI gợi ý (đo sau khi có MVP)

- % user hoàn thành ít nhất 1 quest trong 7 ngày đầu.
- % user đặt ít nhất 1 lệnh (mô phỏng) sau khi có KC.
- % user tạo hoặc đăng ký phát hành token ít nhất 1 lần.

_(Có thể bổ sung sau: retention D7/D30, funnel quest → KC balance → trade.)_

---

## 3. Đối tượng người dùng

| Persona                 | Nhu cầu                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| **Người mới crypto**    | Học cách đọc chart, đặt lệnh, hiểu order book mà không mất tiền. |
| **Creator / meme coin** | Tạo token mang thương hiệu cá nhân, “niêm yết” trên sàn nội bộ.  |
| **Trader giải trí**     | Trade nhanh, cạnh tranh xếp hạng (nếu có sau).                   |
| **Người kiếm KC**       | Làm quest social (like, share, mời bạn) để mở khóa tính năng.    |

---

## 4. Phạm vi cốt lõi (Core features)

### 4.1 Đồng nền tảng — **KingCoin (KC)**

**Định nghĩa:** đơn vị tiền tệ **ảo / nội bộ** của nền tảng; trong repo được triển khai như **stablecoin quote** (vai trò **≈ USDT**). Mọi vốn alt quy đổi theo giá `TOKEN/KC` hiện tại — xem [STABLECOIN_KC_SPEC.md](./STABLECOIN_KC_SPEC.md).

**Vai trò KC:**

| Hành vi                                                                  | Dùng KC         |
| ------------------------------------------------------------------------ | --------------- |
| Mua token do user khác phát hành (cặp giao dịch nội bộ)                  | Có              |
| Phí / stake để **đăng ký phát hành** token (listing / mint logic nội bộ) | Có (theo mô tả) |
| Phí giao dịch mô phỏng (maker/taker) — _tuỳ chọn_                        | Có thể          |
| Phần thưởng quest                                                        | Nhận KC         |

**Quy tắc cần làm rõ trong phiên bản sau của đặc tả:**

- KC có **số thập phân** bao nhiêu; có **trần ví** không.
- KC có **hết hạn** không (thường không, trừ khi có chiến dịch).
- **Chống gian lận** quest (1 device, 1 tài khoản, rate limit, xác minh share).

### 4.2 **Quest** — kiếm KC

**Mục tiêu:** phân phối KC có kiểm soát, kích thích growth.

**Loại quest (theo mô tả + mở rộng hợp lý):**

| Loại       | Ví dụ                                         | Phần thưởng KC                             |
| ---------- | --------------------------------------------- | ------------------------------------------ |
| Social     | Like fanpage / post, share bài                | Theo bảng cố định                          |
| Growth     | Mời bạn (invite code / link)                  | KC cho referrer + referee (tuỳ chính sách) |
| Onboarding | Hoàn thành KYC nhẹ / xác minh email / bật 2FA | KC một lần                                 |

**Luồng tối thiểu:**

1. User mở tab Quest.
2. Chọn nhiệm vụ → thực hiện hành động bên ngoài hoặc trong app.
3. Hệ thống **xác minh** (manual, webhook, hoặc deep link — cần chọn kỹ thuật).
4. Cộng KC vào ví KC, ghi **ledger** (sổ cái).

### 4.3 **Tạo & phát hành token** (user-generated)

**Mục tiêu:** user tạo “coin” của riêng mình và đưa lên hệ sinh thái sàn mô phỏng.

**Dữ liệu token tối thiểu (gợi ý):**

- Tên hiển thị, ký hiệu (ticker), mô tả ngắn, logo.
- Tổng cung (cố định hoặc có cơ chế mint nội bộ — cần quyết định).
- **Chủ sở hữu** / issuer (user id).

**Hành vi:**

- **Đăng ký phát hành:** trừ KC (theo mô tả) + có thể duyệt tự động hoặc queue admin.
- **Niêm yết / cặp giao dịch:** ví dụ `TOKEN/KC` — bắt buộc để “mua bán như thật” trong app.

### 4.4 **Sàn giao dịch mô phỏng** (giống Binance/OKX ở mức trải nghiệm)

**Mục tiêu:** order, khớp lệnh (hoặc AMM đơn giản), chart, lịch sử — **trải nghiệm** giống sàn thật, **tài sản là dữ liệu nền tảng**.

**Thành phần UX gợi ý:**

- Danh sách cặp / token hot.
- Trang trade: chart (candle), order form (limit/market nếu có), sổ lệnh, khối lượng.
- Ví: số dư KC + danh sách token user đang nắm.

**Mô hình khớp lệnh (cần chọn một trong đặc tả kỹ thuật chi tiết):**

- **A. Order book + matching engine đơn giản** (ưu tiên “cảm giác sàn”).
- **B. AMM kiểu pool KC–TOKEN** (đơn giản hoá thanh khoản).
- **C. Giá seed + khớp nội bộ theo queue** (MVP nhanh, ít thực tế hơn).

_(Ghi chú: mô tả “như coin thật” là về UX; backend có thể toàn bộ off-chain.)_

### 4.5 **Ví nội bộ & sổ cái KC / token**

- Mỗi user có **số dư KC** và **số dư từng token** nội bộ.
- Mọi biến động (quest, trade, phí phát hành) ghi **transaction log** để audit và hiển thị “lịch sử”.

---

## 5. Luồng người dùng chính (user journeys)

### 5.1 Người mới

Đăng ký → nhận KC onboarding (nếu có) → làm 1 quest → có KC → mở trang trade → mua token có sẵn hoặc token user khác.

### 5.2 Creator

Tích KC (quest/trade) → trả KC phí phát hành → tạo token → niêm yết cặp `TOKEN/KC` → chia sẻ link token.

### 5.3 Trader

Nạp KC bằng quest → đặt lệnh → theo dõi PnL mô phỏng (tuỳ scope).

---

## 6. Phạm vi ngoài MVP (để tránh scope creep)

Có thể ghi rõ **không làm ở v1** trừ khi bạn chủ động kéo vào:

- Nạp/rút tiền pháp định, bank card.
- Token on-chain thật (ERC-20/BEP-20) — có thể là phase 2.
- Copy trading.
- KYC nặng (trừ khi compliance yêu cầu).
- Futures đã có **thiết kế** riêng (implement sau spot ổn) — [FUTURES_SPEC.md](./FUTURES_SPEC.md).

---

## 7. Yêu cầu phi chức năng (NFR) — tóm tắt

- **Bảo mật tài khoản:** mật khẩu, session, chống abuse quest.
- **Hiệu năng:** trang trade không block UI; dữ liệu giá/lệnh cập nhật mượt.
- **Rõ ràng pháp lý / UX:** nhãn “**mô phỏng / không có giá trị tiền tệ thật**” (tuỳ jurisdiction — cần legal review).

---

## 8. Rủi ro & điểm cần quyết định sớm

| Chủ đề      | Câu hỏi                                                               |
| ----------- | --------------------------------------------------------------------- |
| Giá token   | Giá khởi điểm do admin, issuer đặt, hay theo cung–cầu thuần matching? |
| Thanh khoản | Ai là maker đầu tiên cho token mới?                                   |
| Anti-abuse  | Chống farm quest, multi-account như thế nào?                          |
| Blockchain  | V1 **off-chain hoàn toàn** hay đã cần mint on-chain?                  |

---

## 9. Lộ trình gợi ý (roadmap logic)

1. **MVP:** đăng ký, ví KC, quest cơ bản, 1–2 cặp trade mô phỏng, lịch sử lệnh.
2. **V1.1:** user tạo token + phí KC + niêm yết cặp `TOKEN/KC`.
3. **V1.5 — Futures:** perpetual long/short, margin KC, liquidation — [FUTURES_SPEC.md](./FUTURES_SPEC.md).
4. **V2:** xếp hạng, quest futures, API công khai (nếu cần).

---

## 10. Ghi chú tích hợp với codebase hiện tại (KingCoin repo)

Dự án đã có **frontend Next.js** và **backend NestJS + Prisma + MongoDB**. Đặc tả **theo từng module** (logic thực tế + chuẩn sàn ngoài):

→ **[docs/MODULES/README.md](./MODULES/README.md)**

Tài liệu kỹ thuật ngắn: [TECH_SPEC.md](./TECH_SPEC.md) · Gap: [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) · Futures: [FUTURES_SPEC.md](./FUTURES_SPEC.md)

---

_Tài liệu này là đặc tả sản phẩm cấp cao; chi tiết module xem thư mục `docs/MODULES/`._
