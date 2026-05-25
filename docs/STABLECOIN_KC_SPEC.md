# Đặc tả Stablecoin — KingCoin (KC)

KingCoin (**KC**) là **stablecoin nội bộ** của sàn: đơn vị quote, thanh toán phí listing, ký quỹ lệnh mua, và số dư ví hiển thị. Không thay thế USDT/USDC on-chain; trong demo **1 KC ≈ 1 USD** (danh nghĩa).

> **Ghi nhớ (bắt buộc):** KC tương đương vai trò **USDT** trên sàn ngoài. Mọi tài sản alt (SLR, APX, …) được **định giá và quy vốn bằng KC** theo **giá thị trường hiện tại** `TOKEN/KC`, không tách một “đồng USD ẩn” song song.

## Vai trò trên sàn

| Vai trò | Mô tả |
|---------|--------|
| **Quote** | Cặp giao dịch `BASE/KC` (vd `APX/KC`) |
| **Thanh toán** | Phí phát hành token, escrow lệnh mua |
| **Số dư ví** | `BalanceToken` KC + fallback `Balance.stableCoin` |
| **MM / Flow** | Bot giữ KC + base để khớp lệnh |

## Đặc tính stablecoin (bắt buộc)

1. **Neo giá (peg)** — Mục tiêu `pegTarget = 1.0`, đơn vị `pegCurrency = USD`.
2. **Biến động thấp** — `maxDeviation24hPct` ≤ 0,3% trong vận hành chuẩn; ATH/ATL sát 1.0.
3. **Cung cố định** — 1.000.000 KC phát hành lúc khởi tạo; không pump/dump như alt.
4. **Dự trữ (demo)** — Mô hình `full_reserve`, `collateralRatioMin ≥ 1` (mô phỏng).
5. **Không điều khiển path** — Admin **không** chạy lịch giá / mô hình PP2 trên KC (API từ chối).
6. **Volume % thấp** — `volumes` nhỏ so với alt (chart & markets phản ánh ổn định).

## Trường dữ liệu (Prisma)

| Trường | Giá trị KC |
|--------|------------|
| `tokenKind` | `stablecoin` |
| `stablecoinSpec` | JSON — xem `backend/scripts/data-kingcoin-native.js` → `KC_STABLECOIN_SPEC` |
| `price` | `1.0` (cập nhật nhẹ quanh peg nếu cần) |

## `stablecoinSpec` (schema logic)

```json
{
  "assetClass": "stablecoin",
  "pegType": "fiat_replica",
  "pegCurrency": "USD",
  "pegTarget": 1,
  "pegTolerancePct": 0.5,
  "maxDeviation24hPct": 0.3,
  "collateralModel": "full_reserve",
  "collateralRatioMin": 1,
  "redemptionPolicy": "...",
  "rebalancePolicy": "admin_peg_and_mm_band",
  "useCases": ["quote_pair", "listing_fee", "..."],
  "risks": ["..."]
}
```

## Ba ví KC (Spot / Futures / Funding)

| Ví | Dùng khi | Số dư API |
|----|----------|-----------|
| **Spot** | Khớp lệnh spot, swap, phí spot, listing | `quoteKc` (= `spotKc`) + alt trong `tokens[]` |
| **Futures** | Mở/đóng hợp đồng, margin, phí mở/đóng futures | `futuresKc` (+ ký quỹ & uPnL trong vị thế mở) |
| **Funding** | Phí funding định kỳ futures | `fundingKc` |

- Giao dịch **spot** chỉ kiểm tra và trừ **ví Spot** (`getQuoteBalance` / `WalletPool.spot`).
- Giao dịch **futures** chỉ kiểm tra và trừ **ví Futures** (`WalletPool.futures`).
- User chuyển KC giữa các ví qua `POST /wallets/transfer-internal`.

## Quy đổi vốn (NAV) — KC như USDT

### Nguyên tắc

| Khái niệm | Trên sàn ngoài (tương tự) | Trên KingCoin |
|-----------|---------------------------|---------------|
| Tiền quote | USDT | **KC** |
| Cặp giao dịch | `BTC/USDT` | `SLR/KC`, `APX/KC` |
| Giá token | USDT cho 1 BTC | **KC cho 1 token** (`TokenCrypto.price`) |
| Số dư quote spot | USDT trong ví spot | `balances.quoteKc` |
| Định giá alt | `số BTC × giá BTC/USDT` | `số token × giá token/KC` (thuộc ví Spot) |

**NAV (tổng tài sản ước tính)** = cộng **cả ba ví** (một đơn vị KC):

```
NAV_KC = spot_nav + funding_kc + futures_equity

spot_nav     = quote_kc + Σ (amount_token × giá_TOKEN/KC)
funding_kc   = số KC rảnh ví Funding
futures_equity = futures_kc_rảnh + Σ (margin_kc + uPnL_mở) từng vị thế
```

- `giá_spot_i_tính_bằng_KC` = giá hiện tại của cặp `TOKEN_i/KC` (ưu tiên ticker live WS, fallback `TokenCrypto.price`).
- **KC quote spot** không nhân thêm giá (1 KC ≈ 1 đơn vị kế toán; peg ~1 USD danh nghĩa).
- **Không** quy đổi alt → USD riêng rồi cộng; **không** dùng giá khớp lệnh cũ làm NAV nếu đã có giá thị trường mới.

### Ví dụ: mua SLR bằng KC

1. Trước giao dịch: `1000 KC`, `0 SLR` → **NAV = 1000 KC**.
2. Mua `100 SLR` @ `0,50 KC/SLR`, trả `50 KC` → sau khớp: `950 KC`, `100 SLR`.
3. Giá SLR **hiện tại** lên `0,60 KC/SLR` (thị trường / chart):
   - Giá trị phần SLR = `100 × 0,60 = 60 KC`
   - **NAV = 950 + 60 = 1010 KC** (lãi chưa chốt +10 KC so với cost 50 KC).

Đây là hành vi chuẩn giống ví Binance: USDT giảm khi mua, alt được đánh giá lại theo **giá USDT hiện tại** của alt.

### Nơi áp dụng trong code

| Khu vực | File / API |
|---------|------------|
| NAV dashboard | `frontend/src/modules/account/portfolio.ts` → `buildPortfolio()` |
| Đặc tả dashboard | `docs/ACCOUNT_PROFILE_DASHBOARD_SPEC.md` |
| Khớp lệnh | Buyer −KC, +base; Seller +KC, −base — `docs/TECH_SPEC.md` |
| Swap nhanh | `POST /convert/swap` — đổi hai token bất kỳ; giá quy qua KC tại thời điểm swap |
| Hiển thị giá | `QUOTE_SYMBOL`, `quotePairLabel()` — `frontend/src/constants/quote.ts` |

### Không được (anti-patterns)

- Tính NAV alt bằng **giá vốn bình quân** thay vì giá thị trường KC (trừ màn PnL cost-basis riêng, nếu có sau này).
- Hiển thị “tổng tài sản” bằng USD song song khi user chưa chọn quy đổi ngoài KC.
- Coi KC như alt có pump/dump trong NAV (KC là quote, không nằm trong Σ alt).

## Khác với altcoin (APX, NOVA, …)

| | KC (stablecoin) | Altcoin |
|---|-----------------|---------|
| `tokenKind` | `stablecoin` | `volatile` (mặc định) |
| Giá mục tiêu | ~1 USD | Thị trường / admin path |
| Điều khiển PP2 | ❌ | ✅ |
| ATH/ATL | ±0,5% quanh peg | Rộng |
| Listing fee | Thu bằng KC | — |

## Đồng bộ DB

```bash
cd backend
npx prisma db push
node scripts/ensure-kingcoin-token.js
```

Hoặc reset cả 10 token (KC đã gắn spec): `node scripts/reset-seed-10-tokens.js`

## Hiển thị UI

- Danh sách token: badge **Stablecoin** cạnh KingCoin.
- Trang `/token/[id]`: khối **Đặc tả stablecoin** (peg, dự trữ, cảnh báo rủi ro).
- Hằng số frontend: `frontend/src/constants/quote.ts` + `frontend/src/types/stablecoin.type.ts`.

## Vận hành & rủi ro

- KC trong repo là **mô phỏng giáo dục / demo**, không phải stablecoin được cấp phép.
- Nếu admin **đặt giá** hoặc **nudge** KC trên dashboard, peg có thể lệch tạm thời — nên dùng **mean reversion** nhẹ hoặc set lại `1.0` sau sự kiện.
- Restart API không đổi spec trong DB; chỉ mất override MM trong RAM.
