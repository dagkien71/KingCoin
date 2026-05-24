# Đặc tả Quest Marketing — Lan tỏa KingCoin (thưởng KC)

North star: **mỗi user là một kênh quảng bá** — mã giới thiệu, share link trade/token, tạo coin riêng.

Tham chiếu kỹ thuật: [`BACKEND-quest.md`](MODULES/BACKEND-quest.md), [`FRONTEND-account-wallet-quest.md`](MODULES/FRONTEND-account-wallet-quest.md).

---

## 1. KPI & funnel

| KPI | Quest / tính năng |
|-----|-------------------|
| Reach | Share trade/token + UTM `utm_source=quest` |
| Acquisition | `?ref=CODE` đăng ký → `ReferralAttribution` |
| Activation | Profile, first trade, watchlist |
| Retention | `daily-login`, `weekly-active-trader` |
| Advocacy | Referral milestones, share-my-token |

---

## 2. Kinh tế KC (khuyến nghị)

| Nguồn | KC | Ghi chú |
|-------|-----|---------|
| Đăng ký (`INITIAL_KC_BALANCE`) | 500–2.000 | Env; tránh 100k demo làm quest vô nghĩa |
| Onboarding quests (1 lần) | ~1.500 | Profile + trade + watchlist + convert |
| Growth (referral) | ~1.800 max | 400 + 1.200 milestone; referee 200 |
| Social (share) | ~400 | Mỗi quest 1 lần |
| Daily | 100 / 20h | Lặp |
| Creator | ~800 | Tạo + share token |

**Trần gợi ý:** ~5.000 KC/lifetime từ quest (ngoài daily), phí listing **1.000 KC**.

---

## 3. Xác minh (3 bước — social)

1. **Engage:** `POST /quests/:id/engage` — mở `externalUrl` (track `QuestEngagement.startedAt`).
2. **Chờ:** `QUEST_DELAYED_CLAIM_SECONDS` (mặc định 45s) trước khi claim.
3. **Claim:** `POST /quests/:id/claim` — backend kiểm tra thời gian + điều kiện slug.

Quest giá trị cao (≥500 KC) có thể bổ sung admin proof (phase sau).

**Verify modes:** `auto` | `delayed_honor` | `external_then_claim` | `admin`

---

## 4. Catalog quest

### Onboarding

| slug | KC | verify | Điều kiện |
|------|-----|--------|-----------|
| `onboarding-profile` | 500 | auto | username hoặc avatar |
| `first-trade` | 300 | auto | ≥1 order |
| `add-watchlist-3` | 200 | auto | watchList ≥ 3 |
| `convert-first` | 250 | auto | ledger refType convert |

### Daily

| slug | KC | verify | Điều kiện |
|------|-----|--------|-----------|
| `daily-login` | 100 | auto | cooldown 20h |
| `weekly-active-trader` | 350 | auto | ≥3 order / 7 ngày, cooldown 7d |

### Growth (viral)

| slug | KC | verify | Điều kiện |
|------|-----|--------|-----------|
| `referral-first-friend` | 400 | auto | 1 referee có ≥1 order |
| `referral-3-friends` | 1200 | auto | 3 referee qualified |
| `referee-welcome` | 200 | auto | User được giới thiệu, claim 1 lần |
| `share-referral-card` | 100 | auto | Đã có mã giới thiệu |

### Social

| slug | KC | verify | Điều kiện |
|------|-----|--------|-----------|
| `share-trade-link` | 150 | delayed_honor | engage + delay |
| `share-token-page` | 150 | delayed_honor | engage + delay |
| `social-follow-facebook` | 100 | external_then_claim | URL env |
| `social-follow-zalo` | 100 | external_then_claim | URL env |

### Creator

| slug | KC | verify | Điều kiện |
|------|-----|--------|-----------|
| `create-token` | 500 | auto | ownerId token |
| `share-my-token` | 300 | delayed_honor | đã tạo token + engage |

---

## 5. API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/quests` | List + progress, eligible, cooldown |
| POST | `/quests/:id/engage` | Bắt đầu quest delayed/external |
| POST | `/quests/:id/claim` | Nhận KC |
| GET | `/users/me/referral` | Mã, link, stats referee |

Đăng ký: `POST /auth/register` body `{ ..., referralCode?: string }`.

---

## 6. Anti-abuse

- Throttle claim: 10/phút.
- Không self-referral.
- `REFERRAL_MAX_PER_MONTH` (mặc định 20).
- Social quest: `maxClaimsPerUser: 1`.

---

## 7. Env

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `INITIAL_KC_BALANCE` | 2000 | KC khi đăng ký |
| `QUEST_DELAYED_CLAIM_SECONDS` | 45 | Chờ sau engage |
| `REFERRAL_MAX_PER_MONTH` | 20 | Cap attribution/tháng |
| `APP_PUBLIC_URL` | http://localhost:3000 | Link share |
| `QUEST_SOCIAL_FACEBOOK_URL` | — | Fanpage/post |
| `QUEST_SOCIAL_ZALO_URL` | — | Zalo OA |

---

## 8. UI `/quest`

- Hero + ReferralBanner (mã, copy, link)
- Tab: Tất cả | Bắt đầu | Hàng ngày | Lan tỏa | Sáng tạo
- QuestCard: CTA «Làm ngay» / «Nhận KC», countdown, progress milestone

---

## 9. Kiểm thử

1. User A lấy mã → User B đăng ký `?ref=` → B đặt lệnh → A claim `referral-first-friend`.
2. Share quest: engage → đợi 45s → claim.
3. Referee claim `referee-welcome` một lần.
4. Ledger `refType=quest` khớp thưởng.
