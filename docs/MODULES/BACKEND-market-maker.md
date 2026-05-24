# Module: `market-maker` + `bot-inventory` (Backend)

**Path:** `backend/src/modules/market-maker/`  
**Scripts:** `backend/scripts/ensure-market-maker-user.js`, `lib/credit-bot-inventory.js`

---

## 1. Chuẩn tham chiếu (ngoài)

| Khái niệm | Thực tế |
|-----------|---------|
| Designated Market Maker (DMM) | MM treo hai phía book |
| Seed liquidity token mới | Launch liquidity |
| Không self-trade | Reg / engine skip same account |

KingCoin **mô phỏng** thanh khoản — không phải MM đăng ký với cơ quan quản lý.

---

## 2. Mục đích

- Giữ **sổ lệnh có chiều sâu** khi user ít.
- **Dao động giá** (random walk mid) giống thị trường sống.
- Bot có **KC + toàn bộ base token** để sell được.

---

## 3. Thành phần

| File / service | Vai trò |
|----------------|---------|
| `MarketMakerService` | Refresh interval, đặt lệnh 2 phía |
| `MarketFlowService` | Flow trader phụ (nếu bật) |
| `BotInventoryService` | Credit KC + base cho bot users |
| `credit-bot-inventory.js` | Script dev-up |

---

## 4. Cấu hình env

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `MARKET_MAKER_ENABLED` | `true` dev, prod cần `true` | Bật MM |
| `MARKET_MAKER_INTERVAL_MS` | 1000 | Chu kỳ refresh |
| `MARKET_MAKER_TOKEN_NAMES` | KingCoin, Demo… | Token target |
| `MARKET_MAKER_LEVELS` | số bậc giá | Ladder depth |
| `MARKET_MAKER_LEVEL_JITTER_PCT` | jitter từng mức | |
| `MARKET_MAKER_WANDER_PCT` | mid random walk | |
| `QUOTE_DISPLAY_SYMBOL` | KC | Hiển thị pair |

**User MM:** tạo bởi script — **khác** user thường để engine khớp.

---

## 5. Luồng `refreshLiquidity` (mỗi tick)

1. Hủy pending orders cũ của MM user trên token (theo implement).
2. Tính `mid` = DB price + drift (`midByToken` map).
3. Với mỗi level: tạo buy dưới mid, sell trên mid (jitter qty/price).
4. `broadcastOrderbook` + `broadcastTicker` (price, volumes).

**Cron dự phòng:** mỗi 45s nếu interval fail.

---

## 6. Bot inventory

Sau **tạo token mới**: `creditNewTokenToBots(tokenId)` — **mọi** email trong `MARKET_MAKER_BOT_EMAILS` (hoặc MM + flow mặc định) nhận `MARKET_MAKER_BASE_BALANCE` token base đó để lưu hành / treo bán.

`ensure-bot-inventory.js` đồng bộ KC + toàn bộ token base. `dev-up.sh` chạy sau seed.

---

## 7. Trạng thái & gap

| Hạng mục | Trạng thái |
|----------|------------|
| MM 2-sided ladder | ✅ |
| Variable price | ✅ |
| Bot balance seed | ✅ |
| MM profit / inventory risk model | ❌ |
| User-facing “liquidity provider” | ❌ |

---

## 8. Liên kết

- Phụ thuộc `OrderService.create` (không import vòng `TokenCryptoModule` — dùng `BotInventoryModule` tách).
- WS: `realtime` module.
