# Đặc tả UI — Cập nhật dữ liệu (data freshness)

Khi làm hoặc sửa UI, **bắt buộc** xác định: vùng đó có cần **đồng bộ lại** khi dữ liệu backend / thị trường thay đổi không?  
«Cần reload» ở đây = **state hiển thị phải phản ánh API mới** (không nhất thiết `window.location.reload()`).

Tham chiếu kỹ thuật: [MODULES/FRONTEND-realtime.md](./MODULES/FRONTEND-realtime.md).

---

## 1. Checklist trước khi merge UI

Với **mỗi khối** (bảng, NAV, chart, form read-only, badge số dư, …) trả lời:

| # | Câu hỏi | Nếu **Có** → phải làm |
|---|---------|----------------------|
| 1 | Số liệu có **đổi khi user khác / MM / admin** thao tác không? | WS hoặc poll hoặc refetch theo stream |
| 2 | Số liệu có **đổi sau mutation** của chính user (đặt lệnh, swap, claim quest)? | `refetch()` / `updateUserInfo()` / invalidate sau `mutate` thành công |
| 3 | Chỉ **giá / % / volume** đổi, cấu trúc JSON giữ nguyên? | `useLiveTicker` / `useLiveTokenDisplay` + `applyTickerPatch` — **không** refetch cả object; UI throttle ~300ms + flash |
| 4 | **Sổ lệnh, lịch sử khớp, log chart, ví** đổi khi có trade? | `useLiveFetch` + stream `orderbook` / `trades` / `logs` |
| 5 | Dữ liệu **tĩnh** (FAQ, label, preset admin một lần)? | Chỉ fetch mount; không poll |
| 6 | Refetch định kỳ có làm **nháy loading / remount** component nặng (chart)? | `silentOnPoll` / `silentOnLive`; không gắn `loading` vào lifecycle chart |

**Không được:** bỏ qua bước này rồi hard-code giá hoặc giả định «user F5 trang».

---

## 2. Ma trận loại dữ liệu → cách làm

| Loại dữ liệu | Ví dụ UI | Cách cập nhật | Hook / API |
|--------------|----------|---------------|------------|
| Giá spot, %24h, volume | Markets, trade toolbar, NAV **giá trị quy KC** | Patch WS | `useLiveTicker`, `LiveTokenPrice`, `tickers` trong `MarketLiveProvider` |
| Số dư KC / token | Dashboard, ví, form đặt lệnh | Refetch sau trade + có thể silent live | `useLiveFetch(..., { stream: 'trades' })` hoặc `refetch` sau `mutate` |
| NAV (số lượng × giá) | `/account/dashboard` | **Giá**: ticker · **Số lượng**: balances refetch · **Bảng giá**: `GET /token-crypto/all` | `buildPortfolio()` |
| Order book | Trade cột sổ | Silent refetch | `useLiveFetch` + `orderbook` |
| Lịch sử khớp / ledger | Trade, dashboard gần đây | Silent refetch | `useLiveFetch` + `trades` |
| Chart OHLC | Trade, admin charts | Silent refetch log; chart **không** unmount khi poll | `useLiveFetch` + `logs`; `silentOnPoll` |
| Trạng thái admin MM | Market control | Poll ngắn | `refreshInterval` (vd 5s) |
| Hồ sơ user, PnL ngày | Dashboard header | Sau khớp lệnh | `updateUserInfo()` từ `useAuth` |
| Danh sách token niêm yết | Search, convert, dashboard | Fetch mount; giá live qua ticker | `/token-crypto/all` + ticker map |

---

## 3. Công cụ trong repo

### 3.1 `useFetchApi`

```ts
useFetchApi<T>(url, {
  refreshInterval: 5000,  // poll — admin dashboard
  silentOnPoll: true,     // poll không bật loading (chart, admin grid)
  liveRevision,            // thường qua useLiveFetch
  silentOnLive: true,     // refetch WS không nháy loading
});
```

- Sau **POST/PATCH/DELETE** thành công: gọi `refetch()` của hook liên quan hoặc `updateUserInfo()`.

### 3.2 `useLiveFetch`

Chỉ cho REST **phụ thuộc** sự kiện thị trường (không dùng cho ticker thuần):

```ts
useLiveFetch<IBalanceSnapshot>("/users/me/balances", { stream: "trades" });
useLiveFetch<ITokenCryptoLog[]>(logPath, { stream: ["logs", "trades"] });
```

### 3.3 `useLiveTicker` + `applyTickerPatch`

```ts
const patch = useLiveTicker(token.id);
const live = applyTickerPatch(token, patch) ?? token;
```

### 3.4 Mutation → làm mới UI

```ts
await mutate(body);
await refetchBalances();
void updateUserInfo();
```

---

## 4. Ví dụ theo trang

| Trang | Cần cập nhật khi | Đã / nên |
|-------|------------------|----------|
| `/trade/[name]` | Ticker, book, chart, số dư user | Ticker + `useLiveFetch` logs; `updateUserInfo` khi khớp |
| `/account/dashboard` | Giá alt, **số dư**, ledger | Ticker + `useLiveFetch` balances/ledger (`trades`) |
| `/wallet` | Sau swap / trade | Refetch balances sau mutation; nên thêm live `trades` |
| `/markets` | Giá, % | `useLiveTicker` trên từng dòng |
| `/admin/market-control` | Trạng thái MM, schedule | `refreshInterval: 5000` |
| `/admin/charts` | Log giá | `silentOnPoll` — chỉ cập nhật series, không remount chart |
| `/quest` | Sau claim | `refetch()` quests + `updateUserInfo()` |

---

## 5. Anti-patterns

| Sai | Đúng |
|-----|------|
| `GET /token-crypto` để định giá alt user **đã mua** | `GET /token-crypto/all` + ticker |
| Refetch chart mỗi 12s + `loading` → destroy Lightweight Charts | `silentOnPoll` + `plotReady` không phụ thuộc `loading` sau lần đầu |
| Chỉ hiển thị giá lúc mount | `useLiveTicker` hoặc poll |
| `key={refreshKey}` trên chart khi chỉ cần cập nhật nến | `refetch` data + `series.update()` |
| Bump stream `logs` khi chỉ đổi ticker | Chỉ patch ticker (xem FRONTEND-realtime §3) |

---

## 6. QA nhanh (thủ công)

1. Mở trang → ghi nhận số (NAV, số dư SLR, giá).
2. Tab khác: đặt lệnh / admin đổi giá / đợi WS.
3. Quay lại trang **không F5** → số phải khớp API (`GET` tương ứng).
4. Chart/order book: không nháy trắng «Đang tải…» liên tục.

---

## 7. Liên kết đặc tả khác

- [STABLECOIN_KC_SPEC.md](./STABLECOIN_KC_SPEC.md) — NAV quy KC
- [ACCOUNT_PROFILE_DASHBOARD_SPEC.md](./ACCOUNT_PROFILE_DASHBOARD_SPEC.md) — dashboard
- [CHART_CANDLESTICK_SPEC.md](./CHART_CANDLESTICK_SPEC.md) — chart không remount
- [MODULES/FRONTEND-realtime.md](./MODULES/FRONTEND-realtime.md) — WS streams
