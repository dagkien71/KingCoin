# Module: `futures` (Backend)

**Path (planned):** `backend/src/modules/futures/`  
**Đặc tả đầy đủ:** [FUTURES_SPEC.md](../FUTURES_SPEC.md)

---

## 1. Trách nhiệm

| Service | Việc làm |
|---------|----------|
| `MarkPriceService` | `mark` từ spot mid / `token.price` |
| `FuturesEngineService` | Mở/đóng vị thế, khóa/trả KC |
| `LiquidationService` | Quét `open` positions, force close |
| `FuturesConfigService` | Leverage cap, min size per token |

**Không** gọi `OrderService.matchOrders`.

---

## 2. Phụ thuộc

- `UserRepository` — KC balance, `adjustBalanceTokenByUserId` (quote)
- `TokenCryptoService` — giá, metadata
- `LedgerService` — `append` refType futures_*
- `PortfolioPnlService` — sync NAV sau realized PnL (optional)
- `RealtimeGateway` — emit `futures:*`

---

## 3. API (Pha 1)

Xem bảng [FUTURES_SPEC §11](../FUTURES_SPEC.md#11-api-rest).

---

## 4. IN / OUT

| IN | OUT |
|----|-----|
| Perp isolated market | Cross margin |
| KC margin | Coin-margined |
| Liquidation nội bộ | ADL |

---

## 5. Trạng thái

**Planned** — chưa có code trong repo (2026-05).
