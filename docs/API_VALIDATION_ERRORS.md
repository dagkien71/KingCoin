# API — Validation & lỗi chuẩn

## Envelope lỗi

```json
{
  "success": false,
  "error": {
    "code": 422000,
    "message": "Validation error",
    "details": [{ "marginKc": ["marginKc phải lớn hơn 0."] }]
  }
}
```

- **422** — `class-validator` trên DTO (`ValidationPipe` global).
- **400** — `BadRequestException` (nghiệp vụ, message tiếng Việt).
- **404** — `NotFoundException` (message cụ thể trong `error.message`, không còn luôn "Not found").
- **409** — Prisma/trùng lặp hoặc `ConflictException`.
- **500** — lỗi không xử lý; message chung, chi tiết chỉ trong log server.

## Prisma

Mọi `PrismaClientKnownRequestError` map sang tiếng Việt (P2002 trùng khóa, P2025 không tìm thấy, …). Không fallthrough message engine raw.

## DTO bắt buộc (POST/PATCH body)

| Module | DTO |
|--------|-----|
| Futures mở/đóng/TP-SL | `OpenFuturesDto`, `CloseFuturesDto`, `UpdateFuturesTpSlDto` |
| Convert | `ConvertSwapDto` |
| Order tạo | `CreateOrderDto` (controller dùng DTO, không còn `Prisma.OrderCreateInput`) |
| Auth đăng ký / đăng nhập | `SignUpDto`, `SignInDto` — message tiếng Việt |
| Niêm yết token (issuer) | `SubmitListingRequestDto` (không bắt `circulatingSupply`) |

Message validator: tiếng Việt theo từng field (`{ message: '...' }`).

## Frontend

- `getApiErrorMessage(err)` — message chính.
- `getApiFieldErrors(err)` — map field → `string[]` (422).
- `useFetchApi` gán `error` từ API (không còn chỉ `console.log`).

## Cấu hình app

`backend/src/common/configure-app.ts` — dùng chung `main.ts` và e2e `base-context.ts`.
