# MNB OTT

Монголын Үндэсний Олон Нийтийн Радио Телевиз (МҮОНРТ)-ийн OTT платформ.

7 сувгийн шууд дамжуулалт + DVR catch-up + YouTube архив + премиум VOD сан + видео багц.

## Stack

- **Backend**: Express 4 + Prisma 5 + Postgres 16 + Redis + Node 20
- **Frontend (Client)**: Next.js 14 App Router + TS + Tailwind + Zustand + HLS.js
- **Admin Panel**: Next.js 14 + TS + Tailwind + Zustand
- **Auth**: JWT (access + refresh) · Phone OTP · Google OAuth · Email/password
- **Payment**: QPay (sandbox + production) · Card payment (planned)
- **Storage**: AWS S3 + CloudFront CDN
- **Streaming**: HLS · DRM (Widevine + FairPlay planned)
- **Email**: Nodemailer + Gmail SMTP (configurable)
- **SMS**: sms.mn integration
- **Monitoring**: Sentry + Pino structured logs

## Project structure

```
mnb-ott/
├── apps/
│   ├── server/    # Express API (:3001)
│   ├── client/    # Хэрэглэгчийн web (:3000)
│   └── admin/     # Админ панель (:3002)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
└── docker-compose.prod.yml
```

## Quick start (development)

```bash
# 1. Dependencies суулгах
pnpm install

# 2. Env файл бэлдэх (3 app тус бүрт)
cp apps/server/.env.example  apps/server/.env
cp apps/client/.env.example  apps/client/.env
cp apps/admin/.env.example   apps/admin/.env.local

# 3. Database migrate
cd apps/server
pnpm exec prisma migrate dev
cd ../..

# 4. 3 terminal — параллел эхлүүлэх
pnpm --filter=@mnb-ott/server dev   # :3001
pnpm --filter=@mnb-ott/client dev   # :3000
pnpm --filter=@mnb-ott/admin  dev   # :3002
```

Browser-аар нээх:
- Client: http://localhost:3000
- Admin:  http://localhost:3002
- API:    http://localhost:3001

## Тест

```bash
# Server (Vitest)
pnpm --filter=@mnb-ott/server test

# Admin (Vitest)
pnpm --filter=@mnb-ott/admin test
```

Одоогийн coverage: **38 тест** (auth, subscription access matrix, admin role rules, refund, channels, env, slugify).

## Production deploy

[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — бүрэн заавар.

**Богино хувилбар** — Vercel + Render:
- Frontend (client, admin) → Vercel (`vercel deploy --prod`)
- Backend (server) → Render (`git push` автомат deploy)
- DB → Supabase Pro
- Redis → Upstash

## 4 plan систем

| Plan  | Үнэ/сар  | YouTube архив | Live TV + DVR | Премиум VOD сан |
|-------|----------|---------------|---------------|------------------|
| BASIC | Үнэгүй   | ✓             | ✗             | ✗                |
| TV    | 9,900₮   | ✓             | ✓             | ✗                |
| VOD   | 12,900₮  | ✓             | ✗             | ✓                |
| COMBO | 19,900₮  | ✓             | ✓             | ✓                |

Видео багц (Bundle) нь plan-аас гадуур — **тус бүрчлэн TVOD** хэлбэрээр 72 цагаар түрээслэнэ.

## Health & monitoring

- `GET /health` — liveness
- `GET /ready`  — readiness (Prisma + Redis ping)
- Sentry — error tracking (DSN env-д тохируулсны дараа)
- Pino structured JSON log (production)

## Roles

| Role         | Юу хийж чадах вэ |
|--------------|--------------------|
| `USER`       | Контент үзэх, plan худалдан авах |
| `EDITOR`     | VOD/Bundle/Channel CRUD |
| `OPERATOR`   | Channel stream URL засах (live stream restart) |
| `ADMIN`      | Бүх контент + хэрэглэгч + төлбөр + audit |
| `SUPER_ADMIN`| Бүгд + role + SystemConfig + бусад SUPER_ADMIN-уудыг demote |

## License

Хувийн төсөл — МҮОНРТ-ийн өмч.
