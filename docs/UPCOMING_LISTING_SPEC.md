# Token sắp lên sàn (Upcoming Listing)

## Mục tiêu

Hiển thị token **chưa mở giao dịch Spot** với countdown niêm yết, đặc tả (specs), mô tả và UI khác biệt so với bảng token đã list trên **Markets Hub** (`/token/list`).

## Backend

### Model `UpcomingListing` (Prisma)

| Field | Mô tả |
|-------|--------|
| `name`, `symbol`, `logo` | Nhận diện token |
| `tagline`, `description` | Copy marketing / mô tả ngắn |
| `status` | `review` \| `scheduled` \| `announced` |
| `listingAt` | Thời điểm niêm yết dự kiến (UTC lưu DB, ISO trả API) |
| `initialPrice` | Giá mở cửa (KC) |
| `totalSupply` | Tổng cung (tham chiếu) |
| `category` | Nhóm (DeFi, GameFi, …) |
| `features` | Badge tính năng (`Spot`, `Futures`, …) |
| `specs` | JSON `[{ label, value }]` — bảng đặc tả UI |
| `sortOrder`, `isFeatured` | Sắp xếp & token nổi bật |

### API

```
GET /api/v1/token-crypto/upcoming/listings
```

- Public (`@SkipAuth`)
- Chỉ trả bản ghi `listingAt > now`, sắp xếp: `isFeatured desc`, `sortOrder asc`, `listingAt asc`
- Response: mảng `UpcomingListingEntity` (Swagger tag `TokenCrypto`)

### Seed dev

```bash
cd backend && node scripts/seed-upcoming-listings.js
```

Tự động chạy trong `./scripts/dev-up.sh`.

## Frontend

### Types

`frontend/src/types/upcoming-listing.type.ts` — `IUpcomingListing`, `parseCountdown`, `formatListingDate`.

### Components

| File | Vai trò |
|------|---------|
| `ListingCountdown.tsx` | Countdown live D/H/M/S; trạng thái “Sắp mở cửa” khi hết giờ |
| `UpcomingListingsSection.tsx` | Section “Sắp lên sàn”: 1 card featured + grid các token còn lại |

### UI khác biệt (so với token đã list)

- Gradient + ring theo `status` (scheduled / review / announced)
- Card featured full-width 2 cột (info + countdown)
- Bảng **đặc tả** (`specs`), badge **features**, giá mở cửa KC
- Nút **Nhắc khi list** (demo toast — chưa persist)
- Không link `/trade/[symbol]` — copy “Chưa thể giao dịch”

### Data freshness

- Danh sách upcoming: fetch một lần khi vào Markets Hub (`useFetchApi`)
- Countdown: tick client mỗi 1s (`useCountdown`) — không cần WS
- Sau khi `listingAt` qua, API loại token khỏi list; user refetch Markets hoặc F5

### Vị trí

`MarketsHub` — section đầu khối highlights (tab “Tất cả”), trước Hot & Movers.

## Luồng niêm yết (đã triển khai)

1. User gửi yêu cầu qua Issuer Studio → `POST /listing-requests` (trừ phí KC, trạng thái `pending`)
2. **Admin nhận thông báo** (`LISTING_REQUEST_SUBMITTED`) — duyệt tại `/admin/listing-requests`
3. Admin **duyệt + chọn `listingAt`** → tạo `UpcomingListing` → user nhận `LISTING_REQUEST_APPROVED`
4. Countdown hiện trên Markets (`GET /token-crypto/upcoming/listings`)
5. Cron mỗi phút: đến `listingAt` → mint `TokenCrypto` (không trừ phí lần 2) → xóa upcoming

Từ chối: hoàn phí KC + `LISTING_REQUEST_REJECTED`.

## API

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/listing-requests` | User gửi yêu cầu |
| GET | `/listing-requests/mine` | Yêu cầu của user |
| GET | `/admin/listing-requests` | Admin — danh sách pending |
| PATCH | `/admin/listing-requests/:id/approve` | Body: `{ listingAt, isFeatured? }` |
| GET | `/token-crypto/upcoming/listings/:key` | Chi tiết (id hoặc symbol) + stats đặt trước |
| POST | `/token-crypto/upcoming/listings/:key/preorder` | Đặt trước (auth, body `{ amountKc }`) |
| DELETE | `/token-crypto/upcoming/listings/:key/preorder` | Huỷ đặt trước |

**Frontend:** `/token/upcoming/[symbol]` — countdown, specs, form đặt trước.

## Luồng niêm yết thật (cron)

1. Admin/Studio tạo `UpcomingListing` → hiển thị countdown
2. Cron hoặc job tại `listingAt`: tạo `TokenCrypto`, xóa/ẩn upcoming
3. Persist “notify me” qua `User` preference hoặc collection riêng

## Kiểm tra nhanh

1. `./scripts/dev-up.sh` (hoặc seed script)
2. `GET http://localhost:3001/api/v1/token-crypto/upcoming/listings`
3. Mở `http://localhost:3000/token/list` — section **Sắp lên sàn**, countdown chạy
