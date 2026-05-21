# МҮОНРТ OTT

Монголын Үндэсний Олон Нийтийн Радио Телевизийн OTT вэб платформ.

## Шаардлага

- **Node.js** 18+
- **PostgreSQL** 16
- **Redis** 7
- **Docker** (Redis-д)

---

## 1. Репо татах

```bash
git clone <repo-url>
cd mnb-ott
```

---

## 2. PostgreSQL тохируулах

Docker ашиглах (хамгийн хялбар):

```bash
docker run -d --name mnb-pg \
  -e POSTGRES_USER=mnb \
  -e POSTGRES_PASSWORD=mnb123 \
  -e POSTGRES_DB=mnb \
  -p 5432:5432 \
  postgres:16
```

---

## 3. Redis ажиллуулах

```bash
docker-compose up -d
```

---

## 4. Backend тохируулах

```bash
cd backend

# Packages суулгах
npm install

# .env файл үүсгэх
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
npx prisma migrate deploy

# Backend ажиллуулах
npm run dev
# → http://localhost:3001
```

---

## 5. Frontend тохируулах

```bash
cd ../frontend

# Packages суулгах
npm install

# .env файл үүсгэх
cp .env.example .env
```

`.env` дотор заавал бөглөх зүйлс:

| Key | Утга |
|-----|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` командаар generate хий |
| `GOOGLE_CLIENT_ID` | Backend-тэй ижил утга |
| `GOOGLE_CLIENT_SECRET` | Backend-тэй ижил утга |

```bash
# Frontend ажиллуулах
npm run dev
# → http://localhost:3000
```

---

## Бүх зүйл ажиллаж байгаа эсэх шалгах

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/health |
| Redis | `docker ps` → mnb-redis Running |
| PostgreSQL | `docker ps` → mnb-pg Running |

---

## Хурдан эхлэх (copy-paste)

```bash
# 1. DB + Redis
docker run -d --name mnb-pg \
  -e POSTGRES_USER=mnb -e POSTGRES_PASSWORD=mnb123 -e POSTGRES_DB=mnb \
  -p 5432:5432 postgres:16

docker-compose up -d

# 2. Backend
cd backend && npm install && cp .env.example .env
# .env дотор JWT_SECRET, YOUTUBE_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET бөглөнө
npx prisma migrate deploy && npm run dev &

# 3. Frontend
cd ../frontend && npm install && cp .env.example .env
# .env дотор NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET бөглөнө
npm run dev
```
