# Đặc tả bình luận token (UGC)

**MVP** — trang `/token/[id]`, module `comment` backend.

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/token-crypto/:tokenId/comments?limit=20&cursor=` | Public |
| POST | `/token-crypto/:tokenId/comments` | User |
| DELETE | `/comments/:id` | Owner hoặc admin |

## Quy tắc

- Body 1–500 ký tự, strip HTML.
- Không comment trên token **stablecoin / KC**.
- Tối thiểu **2 giây** giữa hai comment cùng user + token.
- Throttle POST: 10/phút.
- Soft-delete: `status=deleted`.

## Frontend

- `TokenCommentPanel` — poll 20s `silentOnPoll`.
- `canDelete`: chỉ khi `author.id === user.id` (đã đăng nhập) hoặc admin; API gửi `canDelete` khi GET có Bearer hợp lệ.
