# МҮОНРТ OTT

Монголын Үндэсний Олон Нийтийн Радио Телевизийн OTT вэб платформ.

## Шаардлага

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** + Docker Compose (Postgres, Redis-д)

---

## Төслийн бүтэц (monorepo)

```
mnb-ott/
├── apps/
│   ├── server/  ← Express backend (port 3001)
│   ├── client/  ← Next.js хэрэглэгчийн вэб (port 3000)
│   └── admin/   ← Next.js удирдлагын самбар (port 3002)
├── docs/        ← Архитектур, API reference
├── images/      ← Сувгийн logo
└── rest/        ← .rest API тестүүд
```

---

## 1. Репо татах

```bash
git clone <repo-url>
cd mnb-ott
```

## 2. Dependency суулгах (нэг удаа)

`pnpm install`-ийг **репогийн үндэс**-эс ажиллуулна. Энэ нь гурван apps-ийн dependency-г бүгдийг нь суулгана.

```bash
pnpm install
```

## 3. Postgres + Redis ажиллуулах

```bash
docker-compose up -d
```

Шалгах:
```bash
docker ps
# mnb-pg, mnb-redis хоёул "Up" гэж харагдана
```

## 4. Backend (apps/server) тохируулах

```bash
cd apps/server
cp .env.example .env
```

`.env` дотор заавал бөглөх зүйлс:

| Key | Утга |
|-----|------|
| `DATABASE_URL` | `postgresql://mnb:mnb123@localhost:5432/mnb` |
| `REDIS_URL` | `redis://localhost:6379` |
| `JWT_SECRET` | `openssl rand -base64 32` командаар generate хий |
| `YOUTUBE_API_KEY` | Google Cloud Console-с авна |
| `GOOGLE_CLIENT_ID` | Google Cloud Console-с авна |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console-с авна |

> SMS, QPay, AWS, Firebase утгуудыг туршилтанд хоосон орхиж болно.
> `SMS_MOCK=true` байхад OTP код terminal-д харагдана.

```bash
# DB schema үүсгэх
pnpm db:migrate

# (заавал биш) seed
pnpm db:seed
```

## 5. Frontend (apps/client) тохируулах

```bash
cd ../client
cp .env.example .env.local
```

`.env.local` дотор заавал бөглөх зүйлс:

| Key | Утга |
|-----|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` командаар generate хий |
| `GOOGLE_CLIENT_ID` | Backend-тэй ижил утга |
| `GOOGLE_CLIENT_SECRET` | Backend-тэй ижил утга |

## 6. Admin (apps/admin) тохируулах

```bash
cd ../admin
cp .env.example .env.local
```

| Key | Утга |
|-----|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |

---

## Ажиллуулах

Репогийн үндэс-эс:

```bash
# Бүгдийг зэрэг ажиллуулах (server + client + admin parallel)
pnpm dev

# Эсвэл тус тусад нь
pnpm dev:server   # → http://localhost:3001
pnpm dev:client   # → http://localhost:3000
pnpm dev:admin    # → http://localhost:3002
```

## Бусад скрипт

```bash
pnpm build        # бүх apps build
pnpm type-check   # бүх apps TS шалгалт
pnpm lint         # бүх apps lint
pnpm clean        # build артифакт устгах
```

---

## Шалгах

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Admin | http://localhost:3002 |
| Backend API | http://localhost:3001/health |
| Postgres | `docker ps` → mnb-pg Up |
| Redis | `docker ps` → mnb-redis Up |

---

## Хурдан эхлэх (copy-paste)

```bash
# 1. Dependency
pnpm install

# 2. Postgres + Redis
docker-compose up -d

# 3. Env файлууд
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env.local
cp apps/admin/.env.example apps/admin/.env.local
# → файл бүрд secret-уудаа бөглөнө

# 4. DB schema
cd apps/server && pnpm db:migrate && cd ../..

# 5. Бүгдийг зэрэг ажиллуулах
pnpm dev
```

---

## Цаашид

- **Хөгжүүлэлтийн өдөр тутмын ажиллах гарын авлага:** [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- **Архитектур, API reference:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Claude-д өгөх төслийн заавар:** [`CLAUDE.md`](CLAUDE.md)

---

## Deployment

Дэлгэрэнгүй deployment гарын авлага: `docs/DEPLOYMENT.md` (хараахан бичигдээгүй).

Товчоор:
- App бүрд тус тусдаа `Dockerfile` үүсгэнэ (apps/server, apps/client, apps/admin).
- Production-д `docker-compose.prod.yml` дээр postgres + redis + 3 apps-ийг хамтад нь ажиллуулна.
- Front-д `nginx` буюу traefik-ийг TLS + routing-д ашиглана.
- Workspace symlink-ийг тооцох тул Next.js apps-д `output: "standalone"` + `outputFileTracingRoot: "../.."` тохиргоо хэрэгтэй.
