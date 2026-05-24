# URL token — một cấu trúc duy nhất

Mọi redirect/link tới token **phải** dùng helper chuẩn, không tự ghép chuỗi.

## Frontend

**File:** [`frontend/src/lib/token-routes.ts`](../frontend/src/lib/token-routes.ts)

| Hàm | Dùng cho |
|-----|----------|
| `tokenPairSlug(token)` | Slug thô (name → symbol → id) |
| `tradeHref(token)` | `/trade/:slug` |
| `futuresHref(token)` | `/futures/:slug` |
| `defaultTradeHref()` | Mặc định KingCoin |
| `defaultFuturesHref()` | Mặc định SLR |
| `tokenCryptoApiPath(slug)` | `GET /token-crypto/:key` |
| `tokenDetailPath(id)` | `/token/:uuid` (chỉ id) |

`/trade` không slug → [`pages/trade/index.tsx`](../frontend/src/pages/trade/index.tsx) gọi `defaultTradeHref()`.

## Backend

**File:** [`backend/src/common/token-route.util.ts`](../backend/src/common/token-route.util.ts)

| Hàm | Dùng cho |
|-----|----------|
| `tokenPairSlugFromParts` | Cùng quy tắc slug |
| `tradeDeeplink(symbol, name, id)` | payload `deeplink` |
| `futuresDeeplink(symbol, name, id)` | payload `deeplink` |

## Lookup API

`TokenCryptoService.findOne` khớp **id**, **name** hoặc **symbol** (chính xác, phân biệt hoa thường).

## Cấm

- Kebab-case từ `name` (`solar-grid`)
- `symbol.toLowerCase()` làm slug
- `/futures/${tokenId}` khi các màn khác dùng name/symbol
- Ghép `` `/trade/${encodeURIComponent(...)}` `` ngoài `token-routes.ts`
