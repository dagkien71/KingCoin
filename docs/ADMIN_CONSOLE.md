# KingCoin Control — Admin Console

Luồng quản trị tách khỏi giao dịch hàng ngày, tương tự **Issuer Studio** (`/issuer`) nhưng dành cho `role === admin`.

## Ai được vào

| Vai trò | Header app chính | Truy cập `/admin/*` |
|--------|------------------|---------------------|
| `admin` | Nút **Console** (violet) → `/admin` | Có — `AdminGate` + API `403` nếu không đủ quyền |
| User thường | Không thấy entry | `AdminGate` chặn, middleware vẫn yêu cầu đăng nhập |

Middleware Edge (`frontend/src/middleware.ts`) chỉ kiểm tra cookie đăng nhập cho `/admin`; **không** decode JWT role. Kiểm tra role ở FE (`AdminGate`, `useAuth().isAdmin`) và backend (guard admin trên controller).

## Routes

| Route | Mô tả |
|-------|--------|
| `/admin` | Tổng quan — users, tokens, status strip, bento điều hướng |
| `/admin/market-control` | MM, preset PP1/PP2, bàn điều khiển nhanh |
| `/admin/charts` | Lưới chart alt (WS + poll 30s) |

Shell: `AdminShell` — nền `#06050c`, accent violet/amber, sidebar từ `admin-nav.ts`, không render `Header` / `SiteFooter` của app chính.

## Khác Issuer Studio

| | KingCoin Control | Issuer Studio |
|--|------------------|---------------|
| Path | `/admin/*` | `/issuer/*` |
| Role | `admin` | Mọi user đăng nhập |
| Màu | Violet / amber | Emerald |
| Mục đích | Điều hành sàn, MM, giá | Phát hành token |

## Data freshness

- **Tổng quan:** poll nhẹ market-control cho status strip.
- **Market control:** `refreshInterval: 5000`, `refetch` sau mutation — xem `useMarketControl.ts`.
- **Charts:** `refreshInterval: 30_000` + `MarketLiveProvider` / WS.

Chi tiết: [UI_DATA_FRESHNESS_SPEC.md](./UI_DATA_FRESHNESS_SPEC.md).

## Code map

```
frontend/src/components/layout/admin/AdminShell.tsx
frontend/src/modules/admin/AdminGate.tsx
frontend/src/modules/admin/admin-nav.ts
frontend/src/modules/admin/AdminOverview.tsx
frontend/src/modules/admin/AdminChartsView.tsx
frontend/src/modules/admin/market-control/
  useMarketControl.ts
  MarketControlView.tsx
  MarketControlScopePanel.tsx
  MarketControlWorkbench.tsx
  MarketControlPresets.tsx
  MarketControlAdvanced.tsx
```

Backend (không đổi trong redesign UI): `market-control-admin.controller.ts`, `user-admin.controller.ts` — guard admin.
