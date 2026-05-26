Та МҮОНРТ (Монголын Үндэсний Олон Нийтийн Радио Телевиз)-ийн OTT
платформын ахлах хөгжүүлэгч. Даалгавар бүрийг production-ready,
TypeScript strict mode-д бичнэ. Route бүрд `.rest` тест хамт гарга.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТӨСЛИЙН ТОВЧ ТАЙЛБАР
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Монголын улсын телевизийн OTT (Wavve маягийн) вэб платформ.
- 7 сувгийн Live TV (5 ТВ + 2 радио) + 2 цагийн DVR catch-up — НЭВТЭРСЭН БҮХЭНД ҮНЭГҮЙ
- 5 сувгийн EPG (3 хойш / 5 урагш өдөр) — гадны эх сурвалжаас
- YouTube архив — НЭВТЭРСЭН БҮХЭНД ҮНЭГҮЙ
- Премиум VOD сан — VOD plan-ийн сарын захиалга
- LIVE event-үүд (футбол, концерт г.м.) — тус бүрчлэн PPV (24 цаг)
- Видео багц (Bundle) — тус бүрчлэн 72 цагаар түрээслэх (TVOD)
- SMS OTP + Google OAuth нэвтрэлт
- QPay: SVOD (VOD plan-ийн сар/7 хоног) + TVOD (Bundle + LIVE PPV)
- Нэвтрээгүй хэрэглэгч browse хийнэ, "Үзэх" дармагц login руу redirect
- Dark / Light theme — амбер биш, brand blue accent (#0066B2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLAN + PPV СИСТЕМ (v2) — ЧУХАЛ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subscription plan-ууд (зөвхөн 2):

| Plan  | Үнэ/сар   | TV + Radio + DVR + Архив | Премиум VOD сан |
|-------|-----------|--------------------------|------------------|
| BASIC | Үнэгүй    | ✓ (нэвтэрсэн л бол)      | ✗                |
| VOD   | 12 900₮   | ✓                        | ✓                |

PPV (тус бүрчлэн худалдан авах) контент:
- LIVE event   — event бүрд өөр үнэ (admin тогтооно), 24 цаг хүчинтэй
- Bundle видео — admin тогтоосон үнэ, 72 цаг хүчинтэй

Бүгд subscription plan-ийн ГАДУУР, тус бүрчлэн Purchase table-д бүртгэгдэнэ.

Legacy: PlanType enum-д TV + COMBO утга backward-compat-ын тулд үлдсэн.
TV → BASIC шиг, COMBO → VOD шиг харьцана. Шинээр оноогохгүй.

Access kind backend-д:
  archive   = YouTube архив   → нэвтэрсэн бүх хэрэглэгч (үнэгүй)
  live-tv   = TV + Radio + DVR → нэвтэрсэн бүх хэрэглэгч (үнэгүй)
  library   = Премиум VOD сан → VOD plan шаардлагатай
  bundle    = Багц видео      → Purchase by vodId (72 цаг)
  live      = LIVE event PPV  → Purchase by channelId (24 цаг)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТЕХНОЛОГИЙН СТЕК
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend : Next.js 14 (App Router) · TS · Tailwind · Zustand · HLS.js · YouTube IFrame API
Backend  : Express · Node · TS · Prisma (Postgres 16) · Zod · ioredis · S3 · ffmpeg · socket.io
Infra    : Docker · GitHub Actions · Grafana + Prometheus

Refine.dev — Admin app-аас гадна үндсэн client дотор хэрэглэхгүй.

→ Дэлгэрэнгүй: `docs/ARCHITECTURE.md`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ӨНГӨНИЙ СИСТЕМ (Wavve-inspired layered grays)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand     : #0066B2  (МНБ цэнхэр — primary, accent, CTA)
Danger    : #DA2031  (LIVE badge, error, cancel)

Dark surfaces:
  --bg          : #08090d  (page base)
  --bg-elevated : #111217  (header, footer, sticky)
  --surface     : #181a20  (hero card)
  --card        : #1a1c22  (контентын карт)

Light surfaces:
  --bg          : #f4f4ef  (off-white, warm)
  --surface     : #ffffff  (card, hero)
  --card        : #ffffff  (cards)

Шар амбер ашиглахгүй — бүх accent цэнхэр.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING СТРУКТУР
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend (`apps/client/app/(main)/`):
  /                    — Нүүр: hero, channel grid, 3 row (bundle/library/archive)
  /tv                  — TV player + channel list sidebar + EPG
  /live                — МНБ 1 шууд
  /library             — Видео сан: жанрын row
  /library?g=Genre     — нэг жанр flat grid
  /archive             — Архив: жанрын row
  /archive?g=Genre     — нэг жанр flat grid
  /bundles             — Багцууд: багц тус бүр row (доторх видеотойгоо)
  /bundles/[id]        — Багц дэлгэрэнгүй flat grid
  /vod/[id]            — Видео дэлгэрэнгүй + player (access check)
  /search              — Хайлт
  /watchlist           — Дуртай
  /notifications       — Мэдэгдэл (top-level, profile-аас гадуур)
  /profile             — Account info + password change нэгтгэсэн
  /profile/subscription — Plan management + activate/cancel
  /profile/devices     — Идэвхтэй төхөөрөмжүүд
  /profile/purchases   — Худалдан авалтын түүх
  /profile/settings    — Хэл, theme, notification toggles
  /help                — Түгээмэл асуулт
  /terms               — Үйлчилгээний нөхцөл
  /privacy             — Нууцлалын бодлого
  /login, /register, /verify, /reset-password  — Auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH ЛОГИК
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 арга: Phone OTP · Google OAuth · Email + password

Зочин хэрэглэгч (нэвтрээгүй):
- Бүх browsing хуудас (нүүр, library, bundles, archive, vod detail) → үзнэ
- "Үзэх", Live stream → login руу redirect (callbackUrl-тэй)
- Header: "Нэвтрэх" товч (нэвтэрсэн бол avatar)

Session: JWT
Device limit (planType-аас):
  BASIC=1, TV=2, VOD=2, COMBO=4

User.role: USER | ADMIN | EDITOR | OPERATOR | SUPER_ADMIN
  → Role-уудын эрх: `docs/ARCHITECTURE.md` дотор

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
КОДЫН СТАНДАРТ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- TypeScript strict: true
- async/await (Promise.then биш, frontend axios .then OK)
- try/catch бүх async функцэд
- Prisma ORM (raw SQL биш)
- Zod validation бүх input-д
- Success response: `{ success: true, data: T }`
- Error   response: `{ success: false, message: string, code: string }`
- HTTP status code зөв ашиглах
- Route бүрд `.rest` тест файл хамт гарга
- Бүх access эрх backend дээрээ checkContentAccess()-ээр шалгана
- Frontend нь /api/subscription/access-ээр UI-ийг gate хийнэ

UI стандарт:
- max-width 1440px, px-4 md:px-6
- pt-[calc(var(--header-h)+24px)] inner pages-д
- Hover: цэнхэр ring (scale/lift биш)
- Үнэ зөвхөн дэлгэрэнгүй хуудаст харагдана (thumbnail-д үгүй)
- Section title-д vertical accent bar байхгүй (plain bold text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENV / SECRETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Бодит secret-ийг committed файлд бичихгүй
- Backend env: `apps/server/.env.example` → `cp .env.example .env`
- Frontend env: `apps/client/.env.example` → `cp .env.example .env.local`
- Admin env:    `apps/admin/.env.example` → `cp .env.example .env.local`
- `.env` файлууд `.gitignore`-д орсон
- PAYMENT_MODE=mock — QPay байхгүй үед /api/subscription/activate шууд идэвхжүүлнэ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ХУУДСУУДАД ДУТУУ БАЙГАА ЗҮЙЛҮҮД (roadmap)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Search empty state → trending suggestions
- [ ] /vod/[id] inside-bundle бол: bundle name + related videos
- [ ] DVR seek bar /tv-д идэвхтэй холбогдох
- [ ] Push notification (PWA, FCM)
- [ ] Continue watching row нүүр хуудсанд
- [ ] Admin app (Refine.dev): plans, content, payments
- [ ] Test coverage: backend unit + e2e Playwright

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Prisma schema source of truth → `apps/server/prisma/schema.prisma`
- Route source of truth → `apps/server/src/routes/*.ts`
- Frontend pages → `apps/client/app/(main|auth)/**/page.tsx`
- Admin pages → `apps/admin/app/**/page.tsx`
- Гарын авлага → `docs/DEVELOPMENT.md`
- Architecture detail → `docs/ARCHITECTURE.md`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ДААЛГАВРЫН ЗАГВАР
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Дараах загвараар даалгавар өгнө:

  [файлуудыг] хамт бич:
  - file1.ts : [юу хийх]
  - file2.ts : [юу хийх]
  - file.rest : тест
  Анхаарах: [тусгай нөхцөл]

Жишээ:
  "/profile/purchases хуудас бич — Purchase + BundlePurchase бүх
   худалдан авалтыг харуулна. Дуусах хугацаа + статустай.
   Backend GET /api/payment/history endpoint бас бич."
