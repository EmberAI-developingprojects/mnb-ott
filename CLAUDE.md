Та МҮОНРТ (Монголын Үндэсний Олон Нийтийн Радио Телевиз)-ийн OTT
платформын ахлах хөгжүүлэгч. Даалгавар бүрийг production-ready,
TypeScript strict mode-д бичнэ. Route бүрд `.rest` тест хамт гарга.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТӨСЛИЙН ТОВЧ ТАЙЛБАР
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Монголын улсын телевизийн OTT (Netflix маягийн) вэб платформ.
- 5 сувгийн Live TV + 2 цагийн DVR catch-up
- 5 сувгийн EPG (3 хойш / 5 урагш өдөр) — гадны эх сурвалжаас орж ирнэ
- YouTube архив (үнэгүй VOD) + Premium VOD (DRM хамгаалалттай)
- SMS OTP + Google OAuth нэвтрэлт
- QPay: SVOD (сарын subscription) + TVOD (нэгж контент)
- Нэвтрээгүй хэрэглэгч browse хийнэ, "Үзэх" дармагц login руу redirect
- Wavve (Солонгос) загвар, dark theme

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТЕХНОЛОГИЙН СТЕК (товч)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend : Next.js 14 (App Router) · TS · Tailwind · NextAuth v5 · Zustand · HLS.js · Refine.dev
Backend  : Express · Node · TS · Prisma (Postgres 16) · Zod · ioredis · S3 · ffmpeg · socket.io
Infra    : Docker · GitHub Actions · Grafana + Prometheus

→ Дэлгэрэнгүй: `docs/ARCHITECTURE.md`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ӨНГӨНИЙ СИСТЕМ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary   : #0046A5  (цэнхэр — товч, header, accent)
Red       : #CF1E28  (улаан — LIVE badge, error)
Dark BG   : #08080F  (player арын өнгө)
Surface   : #111118  (карт, sidebar)
Card      : #1A1A24  (контентын карт)
Text      : #F0F0F8  (үндсэн текст)
Muted     : rgba(240,240,248,0.45)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH ЛОГИК — ЧУХАЛ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 арга: Phone OTP · Google OAuth · Gmail (= Google)

Зочин хэрэглэгч:
- Нүүр, browse, VOD дэлгэрэнгүй, EPG → ХАРАХ БОЛОМЖТОЙ
- "Үзэх" товч, Live stream → НЭВТРЭХ ШААРДДАГ (redirect + callbackUrl)
- Header-т "Нэвтрэх" товч байна, "Үзэх" биш

NextAuth session strategy: JWT
Device limit (planType-аас): FREE=1, STANDARD=999, PREMIUM=999
  (одоохондоо, МНБ шийдсэний дараа тохируулна)

User.role: USER | ADMIN | EDITOR | OPERATOR | SUPER_ADMIN
  → Role-уудын эрх: `docs/ARCHITECTURE.md` дотор

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
КОДЫН СТАНДАРТ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- TypeScript strict: true
- async/await (Promise.then биш)
- try/catch бүх async функцэд
- Prisma ORM (raw SQL биш)
- Zod validation бүх input-д
- Success response: `{ success: true, data: T }`
- Error   response: `{ success: false, message: string, code: string }`
- HTTP status code зөв ашиглах
- Route бүрд `.rest` тест файл хамт гарга

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENV / SECRETS — АНХААРАЛТАЙ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Бодит secret-ийг `CLAUDE.md`, `README.md`, бусад committed файлд бичихгүй
- Backend env: `apps/api/.env.example` → `cp .env.example .env`
- Frontend env: `apps/web/.env.example` → `cp .env.example .env.local`
- Admin env:    `apps/admin/.env.example` → `cp .env.example .env.local`
- `.env` файлууд `.gitignore`-д орсон
- МНБ-с авах ёстой env-үүдийн жагсаалт: `docs/ARCHITECTURE.md`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ДОПОЛНИТЕЛЬНЫЕ REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Folder structure, API endpoints, schema, admin roles, roadmap → `docs/ARCHITECTURE.md`
- Prisma schema source of truth → `apps/api/prisma/schema.prisma`
- Route source of truth → `apps/api/src/routes/*.ts`
- Frontend pages → `apps/web/app/(main|auth)/**/page.tsx`
- Admin pages → `apps/admin/app/**/page.tsx`
- Хөгжүүлэгчийн өдөр тутмын ажиллах гарын авлага → `docs/DEVELOPMENT.md`

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
  "auth.routes.ts + auth.controller.ts + auth.service.ts
   + auth.middleware.ts + auth.rest хамт бич.
   Phone OTP (SMS) + Google OAuth хоёуланг дэмжинэ.
   Нэвтрэх шаардах middleware тусдаа файлд."

  "LivePlayer.tsx — HLS.js, DVR seekbar, ABR switcher,
   #0046A5 өнгө, Tailwind, Wavve загвар."
