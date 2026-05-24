# Đặc tả — % thay đổi giá (1h / 24h / 7d)

Tham chiếu thông lệ sàn & dữ liệu (CoinGecko, CoinMarketCap, Binance ticker, [Investopedia — Percentage Change](https://www.investopedia.com/terms/p/percentage-change.asp)):

## Công thức chuẩn

**Mẫu số là giá quá khứ** (giá tại mốc thời gian), không phải giá hiện tại:

```
changePct = ((P_now − P_past) / P_past) × 100
```

| Kết quả | Ý nghĩa |
|---------|---------|
| `> 0` | Tăng so với mốc |
| `< 0` | Giảm so với mốc |
| `0` | Không đổi |

**Không** dùng `volumes.volume1h` / `volume24h` làm % — đó là **khối lượng khớp** (KC hoặc token), không phải % giá.

## Cửa sổ thời gian (rolling)

| Trường API | Nhãn UI | Mốc `P_past` |
|------------|---------|----------------|
| `priceChange1h` | 1h % | Giá tại (now − 1 giờ), lấy từ `TokenCryptoLog` gần nhất **≤** mốc đó |
| `priceChange24h` | 24h % | Giá tại (now − 24 giờ) |
| `priceChange7d` | 7d % | Giá tại (now − 7 ngày) |

Luôn **rolling**: mỗi lần tính lại dùng `P_now = TokenCrypto.price` hiện tại.

## Nguồn giá quá khứ

1. `TokenCryptoLog` — log sau mỗi lần cập nhật giá / khớp lệnh (ưu tiên).
2. Nếu chưa có log trước mốc: log **cũ nhất** của token.
3. Nếu **chưa đủ lịch sử** (log cũ nhất mới hơn mốc, vd 7d mà mới có 24h log): trường % = `null` → UI hiển thị «—».
4. Nếu có log nhưng không có điểm ≤ mốc: dùng log cũ nhất (sau khi đã kiểm tra mốc 3).

## Cập nhật trong hệ thống

- `TokenCryptoService.updatePrice` → ghi log (volume nhỏ) + `syncPriceChangePercents`.
- Cron ~1 phút: đồng bộ lại % cho mọi token (`TokenPriceCronJobService`).
- WS `ticker` có thể kèm `priceChange1h/24h/7d` sau khi sync.

## Stablecoin (KC)

Cùng công thức; quanh peg 1.0 % thường rất nhỏ (±0.1%).

## Hiển thị frontend

- Bảng markets: cột **1h % / 24h % / 7d %** đọc `priceChange*`, màu xanh/đỏ.
- **KL (24h)** = `volumes.volume24h` (tổng volume khớp 24h), đơn vị KC — tách riêng.

## Unit test

```bash
cd backend && npm test -- --testPathPattern=price-change
```
