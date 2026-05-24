# KingCoin — Gap analysis (spec vs code)

Rút gọn từ [PRODUCT_SPEC_KINGCOIN.md](./PRODUCT_SPEC_KINGCOIN.md).

| Hạng mục | Spec | Trạng thái |
|----------|------|------------|
| KC quote duy nhất | Có | ✅ UI + settlement |
| Khớp lệnh spot | Có | ✅ `matchOrders` + `TradeFill` |
| Pre-check số dư | Có | ✅ POST `/orders` |
| Quest → KC | Có | ✅ Module quest + `/quest` |
| Ledger / ví | Có | ✅ `LedgerEntry` + `/wallet` |
| Phí listing token | Có | ✅ `TOKEN_LISTING_FEE_KC` |
| Convert KC ↔ token | Có | ✅ `POST /convert/swap` |
| Admin vận hành | Có | ✅ API + `/admin` (cơ bản) |
| WebSocket realtime | Phase 4 | ✅ Gateway `/realtime` |
| Comment UGC | Tùy chọn v1 | ✅ MVP — token detail, poll 20s |
| On-chain / fiat | Không v1 | ❌ Ngoài scope |
| Futures / margin | Phase 2+ | ⏸ Thiết kế: [FUTURES_SPEC.md](./FUTURES_SPEC.md) — UI placeholder Vị thế |
| Escrow + hủy hoàn | Có | ✅ |
| Market price từ sổ lệnh | Có | ✅ |

## Frontend pages

| Route | Status |
|-------|--------|
| `/quest`, `/wallet` | ✅ |
| `/convert`, `/trade/history`, `/markets` | ✅ |
| `/terms`, `/privacy`, `/risk`, `/faq` | ✅ |
| `/admin` | ✅ cơ bản |
| Quest marketing hub `/quest` + `?ref=` register | ✅ |
| `/account/security` | Chưa (phase sau) |

## Backend modules

| Module | Status |
|--------|--------|
| order + settlement | ✅ |
| ledger, quest, convert | ✅ |
| realtime (WS) | ✅ |
| agent controller | ✅ wired trong token module |
