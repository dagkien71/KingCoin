# Square — feed xã hội & chia sẻ lệnh

## Tổng quan

Square (Cộng đồng) là feed toàn sàn (chronological, cursor pagination) cho phép:

- Đính kèm tối đa **4 ảnh** mỗi bài (`POST /api/v1/upload` rồi gửi `imageUrls` trong `POST /square/posts`)

Square cho phép:

- Đăng bài text, poll, chia sẻ lệnh spot pending hoặc vị thế futures đang mở
- Reaction (một reaction/user/bài, đổi emoji = upsert)
- **Bình luận** dưới mỗi bài (cursor pagination, soft-delete)
- Profile công khai (`username` hoặc `userId`)
- Nhắn tin 1-1

## API (`/api/v1/square`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/square/feed` | Optional |
| GET | `/square/posts/:id` | Optional |
| POST | `/square/posts` | JWT |
| DELETE | `/square/posts/:id` | JWT (author/admin) |
| PATCH | `/square/posts/:id/reactions` | JWT |
| POST | `/square/posts/:id/poll/vote` | JWT |
| GET | `/square/posts/:id/comments` | Optional |
| POST | `/square/posts/:id/comments` | JWT |
| DELETE | `/square/comments/:id` | JWT (author/admin) |
| GET | `/square/users/:handle` | Public |
| GET | `/square/users/:handle/posts` | Public |
| GET | `/square/conversations` | JWT |
| POST | `/square/conversations` | JWT |
| GET | `/square/conversations/:id/messages` | JWT (member) |
| POST | `/square/conversations/:id/messages` | JWT (member) |

### Share lệnh

- **Spot:** `kind=order_spot`, `orderId` — chỉ `pending`, owner, không KC.
- **Futures:** `kind=order_futures`, `positionId` — chỉ `open`, owner.
- `embed` JSON là snapshot tại thời điểm đăng (không cập nhật retroactive).

### Reactions

`PATCH .../reactions` body `{ "emoji": "like" }` hoặc `{ "emoji": "" }` để bỏ.

Allowed: `like`, `fire`, `bull`, `bear`, `rocket`, `eyes`.

## WebSocket (`/realtime`)

Subscribe (market socket, không bắt buộc JWT):

- `square:feed` — events: `square:post_created`, `square:post_deleted`, `square:reaction_updated`, `square:poll_updated`, `square:comment_created`, `square:comment_deleted`

Subscribe (user socket + JWT):

- `square:conv:{conversationId}` — event: `square:message`
- `user:{userId}` — cũng nhận `square:message` khi có DM mới

## Frontend routes

- `/square` — feed + composer
- `/square/posts/[id]` — trang bài (SSR + **Open Graph** cho chia sẻ MXH)
- `/square/u/[handle]` — profile (`?post=` highlight bài trên hồ sơ)
- `/square/messages` — inbox
- `/square/messages/[id]` — thread

## Chia sẻ & OGP

- **Link canonical (OGP):** `https://{APP}/square/posts/{postId}` — crawler đọc `og:title`, `og:description`, `og:image` (ảnh bài hoặc `/og-default.svg`).
- **Link hồ sơ:** `/square/u/{handle}?post={postId}` — scroll tới bài trên feed profile.
- **UI:** nút「Chia sẻ」→ copy link, Facebook, X, LinkedIn, Zalo, Web Share API.
- Env: `NEXT_PUBLIC_APP_URL` (production, vd `https://king-coin-crypto-cex.vercel.app`).

## Kiểm thử thủ công

1. Đăng text → hiện feed; tab khác refetch/WS thấy bài mới.
2. Share lệnh pending → card đúng; sau khớp embed không đổi.
3. Poll vote một lần/user.
4. Reaction đổi/bỏ.
5. Profile không lộ email/balance.
6. DM: A→B realtime + notification; C không đọc conv A-B.

## Phase 2 (ngoài v1)

Follow feed, reply thread (nested comments), repost, group chat.
