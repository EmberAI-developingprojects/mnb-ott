# МҮОНРТ OTT — Architecture Reference

> Энэ файл нь reference. Шинэ контекст/AI session бүрд автоматаар ачаалагдахгүй.
> Кодын өөрчлөлттэй тэнцэхгүй болсон үед энэ файлыг шинэчлэх ёстой.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТЕХНОЛОГИЙН СТЕК (дэлгэрэнгүй)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Frontend**
- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Auth: NextAuth.js v5 · @auth/prisma-adapter
- State: Zustand
- HTTP: Axios (interceptor + token refresh)
- Player: HLS.js (LivePlayer, VodPlayer, DVR seekbar)
- Admin: Refine.dev (/admin route)
- I18n: next-intl (Монгол заавал, Англи сонголтоор)
- Realtime: Socket.io-client

**Backend**
- Express.js · Node.js · TypeScript
- ORM: Prisma (PostgreSQL 16)
- Validation: Zod (бүх input)
- Cache: ioredis (Redis)
- Storage: @aws-sdk/client-s3 (AWS S3)
- Stream: fluent-ffmpeg (HLS encode, DVR)
- Push: firebase-admin (FCM)
- Email: nodemailer
- Realtime: socket.io

**Infra**
- Docker + docker-compose
- GitHub Actions CI/CD
- Monitor: Grafana + Prometheus

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
mnb-ott/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (main)/page.tsx           # нүүр — зочин харна
│   │   ├── (main)/live/page.tsx      # EPG харна, үзэхэд нэвтрэх
│   │   ├── (main)/vod/page.tsx       # жагсаалт харна
│   │   ├── (main)/vod/[id]/page.tsx  # дэлгэрэнгүй, үзэхэд нэвтрэх
│   │   ├── (main)/profile/page.tsx
│   │   ├── (main)/subscription/page.tsx
│   │   └── admin/                    # Refine.dev admin
│   ├── components/
│   │   ├── player/LivePlayer.tsx     # HLS.js + DVR seekbar
│   │   ├── player/VodPlayer.tsx      # HLS.js + DRM
│   │   ├── channel/ChannelCard.tsx
│   │   ├── channel/EPGGrid.tsx
│   │   ├── vod/VodCard.tsx
│   │   ├── vod/VodGrid.tsx
│   │   ├── auth/LoginForm.tsx        # Google + Phone OTP
│   │   ├── auth/OtpInput.tsx
│   │   ├── payment/QPayModal.tsx     # QPay QR код
│   │   ├── payment/PlanCard.tsx
│   │   └── ui/                       # Button, Modal, Skeleton, Badge
│   ├── lib/api.ts                    # Axios instance + interceptor
│   ├── lib/auth.ts                   # NextAuth config
│   ├── store/authStore.ts            # Zustand
│   ├── store/playerStore.ts
│   └── types/index.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/auth.routes.ts
│   │   ├── routes/channel.routes.ts
│   │   ├── routes/vod.routes.ts
│   │   ├── routes/payment.routes.ts
│   │   ├── routes/subscription.routes.ts
│   │   ├── routes/search.routes.ts
│   │   ├── routes/cms.routes.ts
│   │   ├── controllers/             # business logic
│   │   ├── services/qpay.service.ts
│   │   ├── services/sms.service.ts
│   │   ├── services/youtube.service.ts
│   │   ├── services/dvr.service.ts
│   │   ├── services/notification.service.ts
│   │   ├── middleware/auth.middleware.ts
│   │   ├── middleware/rateLimit.middleware.ts
│   │   └── middleware/error.middleware.ts
│   ├── prisma/schema.prisma
│   └── tests/api/                   # .rest тест файлууд
│
└── docker-compose.yml
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRISMA DATABASE SCHEMA (10 хүснэгт)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Source of truth: `backend/prisma/schema.prisma`

| Хүснэгт | Талбарууд |
|---|---|
| **User** | id, phone, email, name, avatar, role, isVerified, createdAt |
| **UserSession** | id, userId, deviceId, deviceName, deviceType, lastActive, isActive |
| **Account** | NextAuth OAuth (Google) — @auth/prisma-adapter стандарт |
| **Subscription** | id, userId, planType(FREE\|STANDARD\|PREMIUM), startedAt, expiresAt, status |
| **Channel** | id, name, slug, streamUrl, epgUrl, thumbnailUrl, isActive, orderIndex |
| **VodContent** | id, title, description, thumbnailUrl, genre, type(FREE\|PREMIUM), price, duration |
| **VodSource** | id, vodId, sourceType(YOUTUBE\|S3), url, youtubeId, drmKeyId |
| **Purchase** | id, userId, vodId, amount, expiresAt, status(ACTIVE\|EXPIRED) |
| **Payment** | id, userId, invoiceId, qpayInvoiceId, amount, provider, status, paidAt |
| **WatchHistory** | id, userId, contentId, contentType(LIVE\|VOD), positionSec, updatedAt |

**User.role** enum: `USER | ADMIN | EDITOR | OPERATOR | SUPER_ADMIN`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Source of truth: `backend/src/routes/*.ts`
> .rest тест: `backend/tests/api/*.rest`

**Auth**
```
POST   /api/auth/send-otp          # утас → SMS OTP
POST   /api/auth/verify-otp        # OTP → JWT token
POST   /api/auth/refresh           # refresh token
GET    /api/auth/me                # өөрийн мэдээлэл
```

**Channels**
```
GET    /api/channels               # бүх суваг (public)
GET    /api/channels/:id           # суваг + stream URL (auth)
GET    /api/channels/:id/epg       # EPG хөтөлбөр (public)
GET    /api/channels/:id/dvr       # DVR playlist (auth)
```

**VOD**
```
GET    /api/vod                    # жагсаалт (public)
GET    /api/vod/:id                # дэлгэрэнгүй (public)
GET    /api/vod/:id/stream         # stream URL (auth + эрх шалгах)
GET    /api/vod/youtube            # YouTube архив (public)
POST   /api/vod/:id/progress       # progress хадгалах (auth)
```

**Search / Payment / Subscription**
```
GET    /api/search?q=              # хайлт (public)

POST   /api/payment/invoice        # QPay invoice үүсгэх (auth)
POST   /api/payment/check          # төлбөр шалгах (auth)
POST   /api/payment/callback       # QPay webhook (HMAC)
DELETE /api/payment/invoice/:id    # цуцлах (auth)

GET    /api/subscription/plans     # боломжит планууд (public)
GET    /api/subscription/me        # миний subscription (auth)
POST   /api/subscription/subscribe # захиалах (auth)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN ROLES (Refine.dev)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Role | Эрх |
|---|---|
| **SUPER_ADMIN** | бүгд + role удирдах + system config |
| **ADMIN** | контент + хэрэглэгч + төлбөр + analytics |
| **EDITOR** | VOD upload + metadata + YouTube sync |
| **OPERATOR** | Live суваг ON/OFF + DVR + EPG |

**Admin хуудсууд:** dashboard · channels · vod · users · payments · analytics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Бодит утга **HЭ** энэ файлд бичигдэх ёсгүй. Зөвхөн нэр, тайлбар.
>
> - Backend: `backend/.env.example` → `cp .env.example .env`
> - Frontend: `frontend/.env.example` → `cp .env.example .env.local`

**МНБ-с авах ёстой (гэрээний дараа):**
- `LIVE_CH1_URL` ... `LIVE_CH5_URL` — 5 сувгийн RTMP ingest
- `MNB_YOUTUBE_OAUTH_TOKEN` — private playlist хандах
- `WIDEVINE_LICENSE_URL`, `WIDEVINE_KEY_ID` — production DRM
- `BANK_GATEWAY_URL` — банкны API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ХӨГЖҮҮЛЭЛТИЙН ДАРААЛАЛ (Roadmap)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. docker-compose + Prisma schema + project init
2. Auth: Phone OTP + Google OAuth
3. Нүүр хуудас UI + Live TV хуудас + HLS player
4. DVR pipeline (FFmpeg + S3 + 2ц window)
5. YouTube VOD архив + Premium VOD
6. QPay SVOD + TVOD + Subscription логик
7. Admin panel (Refine.dev) + Search
8. Notification (FCM + Email) + Load test + Deploy
