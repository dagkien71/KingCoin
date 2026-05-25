# Module: `token-crypto` + `token-log` (Backend)

**Path:** `backend/src/modules/token-crypto/`  
**Cron:** `token-price-cronjob.service.ts`  
**Controllers:** `token.controller`, `token-log.controller`, `token-admin.controller`, `token-agent.controller`

---

## 1. Chuẩn tham chiếu (ngoài)

| Tính năng | Sàn / CoinGecko |
|-----------|-----------------|
| Danh sách coin + giá + % + volume | Markets page |
| Chi tiết token (logo, supply, ATH/ATL) | Coin info |
| Biểu đồ giá lịch sử | Kline / trades → chart |
| User launchpad / meme listing | Pump.fun / Binance Launchpad (đơn giản hóa) |
| Phí niêm yết | Listing fee |

---

## 2. Mục đích

**Niêm yết token mô phỏng** do user tạo, duy trì **giá thị trường**, **market cap**, **rank**, **volume JSON**, và **nhật ký giá** (`TokenCryptoLog`) phục vụ chart.

---

## 3. Phạm vi

| IN | OUT |
|----|-----|
| CRUD token (public list, detail by id/name) | ERC-20 deploy |
| Phí listing KC (`TOKEN_LISTING_FEE_KC`) | Order book cho token chưa có MM |
| `updatePrice` sau khớp lệnh | Oracle chainlink |
| ATH/ATL intraday + all-time | Fully diluted vesting schedule |
| Agent/admin CRUD (CASL) | Comment UGC (FE tắt) |

---

## 4. API public

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/token-crypto/all` | Paginate + sort + search `name` |
| GET | `/token-crypto` | List (variant) |
| GET | `/token-crypto/:id` | Chi tiết; `:id` = uuid **hoặc** `name` slug |
| POST | `/token-crypto` | Tạo token (auth, trừ phí KC) |
| GET | `/crypto-logs/:tokenId` | Lịch sử giá cho chart |
| GET | `/crypto-logs/:tokenId/volumes` | Volume aggregates |
| POST | `/crypto-logs/create-log` | Tạo log (internal/admin) |

---

## 5. Luồng tạo token (listing)

Xem [LISTING_TOKENOMICS_SPEC.md](../LISTING_TOKENOMICS_SPEC.md).

1. User gửi `POST /listing-requests`: `category`, `teamTokenAmount`, `liquidityTokenAmount`, `liquidityKcAmount`.
2. `initialPrice = liquidityKc / liquidityToken`; trừ phí listing + KC pool.
3. Admin duyệt → `UpcomingListing` → cron go-live.
4. Tạo `TokenCrypto`: `circulatingSupply = liquidityToken`, `category`; MM nhận đúng pool KC/token; creator nhận `teamTokenAmount`.
5. Không cấp 5M token MM mặc định khi list qua luồng này (`skipDefaultBotInventory`).

---

## 6. Cập nhật giá (`updatePrice`)

Kích hoạt khi:

- Khớp lệnh (`OrderService` → `updatePrice(tokenId, matchPrice)`)
- MM refresh mid (gián tiếp qua khớp / ticker)

Cập nhật:

- `price`, `athPrice`, `atlPrice`, `athPriceDay`, `atlPriceDay`, các field `%`
- `realtimeService.broadcastTicker` → WS clients

**Cron** `token-price-cronjob`: volume 24h từ log thật (không random).

---

## 7. Data model (`TokenCrypto`)

| Field | Ý nghĩa |
|-------|---------|
| `symbol`, `name`, `logo`, `decimals` | Metadata |
| `price`, `marketCap`, `totalSupply`, `circulatingSupply` | Thị trường |
| `rank` | Thứ hạng bảng markets |
| `volumes` (JSON) | `volume1h`, `volume24h`, `volume1w`, … |
| `ownerId` | Issuer |
| `initialPrice` | Giá niêm yết ban đầu |

`TokenCryptoLog`: `price`, `volume`, `timestamp`, `hash` (demo chain id).

---

## 8. Phân quyền

- **User:** tạo token của mình, xem public.
- **Agent / Admin:** controllers riêng + CASL `UseAbility`.

---

## 9. Trạng thái implement

| Hạng mục | Trạng thái |
|----------|------------|
| List / detail / create + listing fee | ✅ |
| Price log + chart API | ✅ |
| Rank auto | ✅ |
| WS ticker broadcast | ✅ |
| Comments | ⏸ FE placeholder |
| Verified badge workflow | ⚠️ field có, flow admin mỏng |

---

## 10. Frontend liên quan

- `pages/token/list`, `pages/token/[id]`, `pages/token/create`
- `components/charts/DbTokenPriceChart.tsx`
- `modules/trade/components/main/summary`
