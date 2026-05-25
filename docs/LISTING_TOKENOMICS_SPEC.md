# Niêm yết token — tokenomics & thanh khoản

## Nguyên tắc

- **KC** = quote (~1 USD danh nghĩa).
- **Giá mở cửa** không nhập tay: `initialPrice = liquidityKcAmount / liquidityTokenAmount`.
- **Vốn hoá lưu hành** = `initialPrice × liquidityTokenAmount` (phần trong pool).
- **FDV** (hiển thị) = `initialPrice × totalSupply`.

## Phân bổ khi gửi yêu cầu

| Thành phần | Trường | Mô tả |
|------------|--------|--------|
| Tổng cung | `totalSupply` | Phát hành tối đa |
| Team | `teamTokenAmount` | Mint vào ví creator lúc go-live |
| Thanh khoản | `liquidityTokenAmount` + `liquidityKcAmount` | Mint token + KC cho MM chính |
| Kho bạc | `total - team - liquidity` | Không lưu hành, không mint |

Ràng buộc: `team + liquidity ≤ totalSupply`, `liquidity > 0`, `liquidityKc > 0`.

## KC trừ lúc submit

- Phí listing (`TOKEN_LISTING_FEE_KC`, mặc định 1000).
- Toàn bộ `liquidityKcAmount` (ký quỹ pool).

Từ chối: hoàn **phí + KC thanh khoản**.

## Go-live

1. Tạo `TokenCrypto` với `price`, `category`, `circulatingSupply = liquidityTokenAmount`.
2. MM nhận đúng `liquidityTokenAmount` + `liquidityKcAmount` (không dùng 5M mặc định).
3. Creator nhận `teamTokenAmount` token base.

## Category

Enum: `defi`, `gamefi`, `meme`, `infra`, `ai`, `rwa`, `social`, `utility`, `creator`, `other`.

Luồng: `ListingRequest.category` → `UpcomingListing.category` (label) → `TokenCrypto.category`.

## API

`POST /listing-requests` body: xem `SubmitListingRequestDto`.
