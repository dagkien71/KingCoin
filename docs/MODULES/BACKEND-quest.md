# Module: `quest` (Backend)

**Path:** `backend/src/modules/quest/`

Đặc tả marketing: [QUEST_MARKETING_SPEC.md](../QUEST_MARKETING_SPEC.md).

---

## 1. Catalog

Seed từ [`quest-catalog.ts`](../../backend/src/modules/quest/quest-catalog.ts) — 16 quest (onboarding, daily, growth, social, creator).

Referral: module [`referral`](../referral/) — `GET /users/me/referral`, đăng ký `referralCode`.

---

## 2. API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/quests` | List + eligible, progress, cooldown, engage |
| POST | `/quests/:id/engage` | Bắt đầu quest delayed/external |
| POST | `/quests/:id/claim` | Nhận KC (throttle 10/phút) |

---

## 3. Verify modes

| Mode | Ví dụ |
|------|--------|
| `auto` | profile, first-trade, referral milestones |
| `delayed_honor` | share-trade, share-token |
| `external_then_claim` | follow Facebook/Zalo |

---

## 4. Frontend

- `/quest` — Quest hub + ReferralBanner
- `/register?ref=CODE`
