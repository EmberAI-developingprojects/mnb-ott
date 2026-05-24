# MNB OTT — Deployment Guide

Энэ файл нь production-руу шилжүүлэх алхамуудыг тайлбарлана.

## Архитектур

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  Client (web)   │    │  Admin panel    │    │  Mobile (Flutter)│
│  Next.js :3000  │    │  Next.js :3002  │    │  Future          │
│  play.mnb.mn    │    │  admin.mnb.mn   │    │                  │
└────────┬────────┘    └────────┬────────┘    └─────────┬────────┘
         │                      │                       │
         └──────────────┬───────┴───────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Express API    │
              │  Node :3001     │
              │  api.mnb.mn     │
              └────────┬────────┘
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
  ┌──────────┐  ┌──────────┐    ┌─────────────┐
  │ Postgres │  │  Redis   │    │  S3 + CDN   │
  │ Supabase │  │ Upstash  │    │  AWS        │
  └──────────┘  └──────────┘    └─────────────┘
```

## Production checklist

### Шаардлагатай secret-уудыг бэлдэх

| Env | Тайлбар |
|---|---|
| `DATABASE_URL`            | Supabase transaction-mode pooler (port 6543) `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL`              | Supabase session-mode (port 5432) — Prisma migration-д |
| `REDIS_URL`               | Upstash эсвэл self-hosted Redis |
| `JWT_SECRET`              | `openssl rand -base64 64` — 64+ тэмдэгт |
| `GOOGLE_CLIENT_ID`        | Google Cloud Console OAuth credential |
| `GOOGLE_CLIENT_SECRET`    | дээрхтэй ижил |
| `SMTP_HOST`               | smtp.gmail.com эсвэл МНБ SMTP |
| `SMTP_USER`               | noreply@mnb.mn |
| `SMTP_PASS`               | Gmail App Password (16 тэмдэгт) |
| `SMS_GATEWAY_URL`         | https://api.sms.mn/v1/send |
| `SMS_API_KEY`             | sms.mn-аас авна |
| `SMS_SENDER_ID`           | "MNB" |
| `SMS_MOCK`                | `false` (production-д) |
| `QPAY_USERNAME/PASSWORD`  | QPay merchant credential |
| `PAYMENT_MODE`            | `live` (production-д) |
| `AWS_ACCESS_KEY_ID`       | IAM S3 user |
| `AWS_SECRET_ACCESS_KEY`   | IAM secret |
| `S3_BUCKET_NAME`          | mnb-media эсвэл custom |
| `CDN_BASE_URL`            | https://cdn.mnb.mn (CloudFront distribution) |
| `YOUTUBE_API_KEY`         | Google Cloud Console |
| `YOUTUBE_CHANNEL_IDS`     | `UCxxx,UCyyy` (МНБ + Bluesky Radio) |
| `SENTRY_DSN`              | Sentry project DSN |
| `NODE_ENV`                | `production` |
| `LOG_LEVEL`               | `info` |
| `FRONTEND_URL`            | https://play.mnb.mn |
| `ADMIN_URL`               | https://admin.mnb.mn |

### Database migrate
```bash
cd apps/server
DATABASE_URL=$PROD_DIRECT_URL pnpm exec prisma migrate deploy
```

### Анхны SUPER_ADMIN үүсгэх
```sql
-- Prisma Studio эсвэл Supabase SQL editor:
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'founder@mnb.mn';
```

### System config seed-ийг шалгах
Server-ийг эхлүүлэхэд console-д `✓ SystemConfig: 17 default key seeded` гарвал OK.

## Deploy хувилбарууд

### Хувилбар 1 — Vercel + Render (Recommended)

**Frontend (apps/client, apps/admin):**
1. Vercel-руу repo connect
2. Project бүрд root directory: `apps/client` (эсвэл `apps/admin`)
3. Build command: `pnpm build`
4. Output directory: `.next`
5. Env vars: `NEXT_PUBLIC_API_URL=https://api.mnb.mn`

**Backend (apps/server):**
1. Render-руу repo connect → New Web Service
2. Root directory: `apps/server`
3. Build command: `pnpm install && pnpm exec prisma generate && pnpm build`
4. Start command: `pnpm start`
5. Env vars: дээрх бүхнийг оруулна
6. Health check path: `/health`

**Зардал:** ~$45-80/сар (Vercel free + Render $7-25 + Supabase Pro $25 + Upstash $0-10).

### Хувилбар 2 — Self-host (МНБ-ийн өөрийн сервер)

Сервер дээр Node 20 + Postgres + Redis + nginx гараар суулгана:

```bash
# Сервер дээр:
git clone <repo> mnb-ott
cd mnb-ott
pnpm install
cp apps/server/.env.example apps/server/.env  # production secret оруулна

# Database migrate
cd apps/server
pnpm exec prisma migrate deploy

# Build бүгдийг
cd ../.. && pnpm -r build

# PM2 эсвэл systemd-ээр ажиллуулах
pm2 start apps/server/dist/index.js --name mnb-server
pm2 start "pnpm --filter=@mnb-ott/client start" --name mnb-client
pm2 start "pnpm --filter=@mnb-ott/admin start"  --name mnb-admin
```

Nginx-аар reverse proxy:
- `play.mnb.mn`  → :3000
- `admin.mnb.mn` → :3002
- `api.mnb.mn`   → :3001

### Local development (postgres + redis-ийг Docker-аар)

App-ыг гараар, DB/Redis-ийг local-руу хийхэд:

```bash
# DB + Redis эхлүүлэх
docker compose up -d postgres redis

# 3 terminal — app тус бүрд
pnpm --filter=@mnb-ott/server dev
pnpm --filter=@mnb-ott/client dev
pnpm --filter=@mnb-ott/admin  dev
```

## DNS configuration

| Subdomain | Record type | Зорилго |
|---|---|---|
| `play.mnb.mn`   | CNAME | client frontend (Vercel-руу) |
| `admin.mnb.mn`  | CNAME | admin panel (Vercel-руу) |
| `api.mnb.mn`    | CNAME / A | backend server (Render-руу) |
| `cdn.mnb.mn`    | CNAME | CloudFront distribution |
| `stream.mnb.mn` | CNAME | HLS streaming origin |

## Monitoring

### Sentry (errors)
- DSN: `SENTRY_DSN` env-д тогтоосны дараа автомат активдана
- Production-д 10% trace sample (cost reduction)
- Алдааны хэлбэрээр `AppError` known business error-уудыг ignore хийсэн

### Health endpoints
- `GET /health` — liveness (бөмбөгрөх → 200)
- `GET /ready`  — readiness (Prisma + Redis ping) — load balancer-д ашигла

### Logs
- Structured JSON (pino)
- Request бүрт `x-request-id` header — trace хийхэд
- Sensitive field (password, token) автомат redact

## Backup strategy

Supabase Pro нь автомат backup (7 хоног) хийдэг. Нэмж AWS S3-руу cron:

```bash
0 3 * * * pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://mnb-backups/db/$(date +\%Y-\%m-\%d).sql.gz
```

Restore:
```bash
aws s3 cp s3://mnb-backups/db/2026-05-20.sql.gz - | gunzip | psql $DATABASE_URL
```

## Rollback procedure

1. **Vercel (Frontend)** — Previous deployment-руу "Promote" товч дарна
2. **Render (Backend)** — Dashboard → Deploy history → "Rollback"
3. **Database migration** — Forward-only стратеги. Schema breaking change урьдчилан review хийх.

## Performance tuning

### Database
- `connection_limit=1` (Prisma per-instance) — transaction pooler-тэй уятай
- Slow query log: development-д Prisma `log: ["query"]`
- Read replica: 50k+ DAU-д Supabase Pro Add-on

### Rate limiting
- Auth endpoints: 5-10 req/15min/IP
- Admin endpoints: 60 req/min/IP
- Public VOD endpoints: rate-limit хараахан байхгүй (post-launch нэмэх)

## Security

### Secret rotation
**3 сар тутамд** дараах key-уудыг rotate:
- `JWT_SECRET` (deploy-д бүх session unverified болно)
- `SMTP_PASS` (Gmail App Password)
- `SMS_API_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `QPAY_PASSWORD`

### Production launch checklist
- [ ] `NODE_ENV=production` тогтоосон уу
- [ ] `PAYMENT_MODE=live` (не mock)
- [ ] `SMS_MOCK=false`
- [ ] `JWT_SECRET` 64+ тэмдэгт
- [ ] `SMTP_HOST` real provider
- [ ] `SENTRY_DSN` тогтоосон
- [ ] Бүх secret git history-аас арилгасан
- [ ] HTTPS заавал (Vercel/Render автомат)
- [ ] CSP header production-д ажиллаж байгаа эсэх

## Troubleshooting

| Алдаа | Шалтгаан | Шийдэл |
|---|---|---|
| `Шаардлагатай env utga дутуу` | Env validation startup-д унтарсан | `.env`-ийг шалгах |
| `EMAXCONNSESSION` | Supabase pool дүүрсэн | `connection_limit=1` set + restart |
| 401 бүх request-д | JWT_SECRET алдаатай | env шалгах, browser localStorage арилгах |
| CORS error | FRONTEND_URL / ADMIN_URL буруу | env шинэчлэх, server restart |
| Helmet CSP block | Шинэ third-party domain | `index.ts` дотор CSP-д нэмэх |
