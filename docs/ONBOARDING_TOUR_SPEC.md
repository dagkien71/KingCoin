# Hướng dẫn người dùng mới (Product Tour)

Tour spotlight giúp người mới biết nên bấm gì trên KingCoin.

## Tour hiện có

| ID | Mô tả |
|----|--------|
| `platform-main` | Luồng chính: tìm kiếm → Thị trường → Giao dịch Spot → Ví → Nhiệm vụ → Chuyển đổi |

## Frontend

- Module: [`frontend/src/modules/onboarding/`](../frontend/src/modules/onboarding/)
- Định nghĩa step: [`tours/platform-main.ts`](../frontend/src/modules/onboarding/tours/platform-main.ts)
- Thư viện: [driver.js](https://driverjs.com/) (spotlight + popover)
- Anchor UI: attribute `data-tour="..."` trên DOM (không dùng class Tailwind làm selector)

### Thêm step mới

1. Gắn `data-tour="my-feature"` lên component.
2. Thêm object vào mảng `platformMainSteps` (hoặc tour mới).
3. Nếu cần đổi trang: set `route: "/path"`.
4. Nếu mobile cần mở drawer menu: `beforeShow: ensureMobileNavVisible`.

### Trigger

- **Auto:** modal chào lần đầu (chưa complete, chưa skip session).
- **Manual:** nút **Hướng dẫn** trên header → `startTour("platform-main", { force: true })`.

### Lưu trạng thái

- Guest: `localStorage` key `kc-completed-tours`.
- User đăng nhập: `User.completedTours` trên Mongo + sync API.

## Backend API

```
POST /api/v1/users/me/tours/:tourId/complete
Authorization: Bearer <token>
```

Idempotent — gọi nhiều lần không trùng id.

Trường Prisma: `User.completedTours String[] @default([])`.

## Smoke checklist

- [ ] User mới thấy modal → Bắt đầu → duyệt hết step
- [ ] Bỏ qua giữa chừng → lần sau vẫn hỏi (trừ khi skip session)
- [ ] Hoàn tất → không auto hỏi lại; nút Hướng dẫn vẫn mở được
- [ ] Mobile: step menu mở drawer và highlight link
- [ ] Đăng nhập 2 thiết bị: complete sync qua API
