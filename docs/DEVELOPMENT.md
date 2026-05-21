# Development Guide

МҮОНРТ OTT monorepo-ийн өдөр тутмын ажиллах гарын авлага.

---

## Daily workflow

```bash
# 1. Pull latest
git pull

# 2. Install if package.json changed (otherwise skip)
pnpm install

# 3. Start infra (Postgres + Redis)
docker-compose up -d

# 4. Start the apps you're working on
pnpm dev:server           # http://localhost:3001 (Express)
pnpm dev:client           # http://localhost:3000 (Next.js)
pnpm dev:admin         # http://localhost:3002 (Next.js)

# Or all three in parallel
pnpm dev
```

All `pnpm` commands run **from the repo root**. You almost never need to `cd apps/...`.

---

## Where to put code

| What | Where |
|---|---|
| New API route | `apps/server/src/routes/<feature>.routes.ts` |
| Route handlers | `apps/server/src/controllers/<feature>.controller.ts` |
| Business logic | `apps/server/src/services/<feature>.service.ts` |
| DB schema | `apps/server/prisma/schema.prisma` |
| Express middleware | `apps/server/src/middleware/` |
| Frontend page | `apps/client/app/(main)/<route>/page.tsx` |
| Frontend auth-gated page | `apps/client/app/(auth)/<route>/page.tsx` |
| Reusable UI | `apps/client/components/<area>/<Component>.tsx` |
| Frontend state | `apps/client/store/<feature>.store.ts` (Zustand) |
| API client | `apps/client/lib/api.ts` (axios instance) |
| `.rest` test files | `rest/<feature>.rest` (repo root) |
| Admin pages | `apps/admin/app/<route>/page.tsx` |

---

## Adding a backend feature

For a new feature `epg`:

```
apps/server/src/routes/epg.routes.ts         ← Express router
apps/server/src/controllers/epg.controller.ts ← req/res handlers, Zod parsing
apps/server/src/services/epg.service.ts      ← business logic, Prisma calls
rest/epg.rest                             ← test cases
```

Mount the router in `apps/server/src/index.ts`:

```ts
import { epgRouter } from "./routes/epg.routes";
app.use("/api/epg", epgRouter);
```

Response convention (CLAUDE.md):

```ts
// Success
return res.json({ success: true, data: { ... } });

// Error
return res.status(404).json({
  success: false,
  message: "Channel not found",
  code: "CHANNEL_NOT_FOUND",
});
```

All inputs go through Zod. All async handlers wrapped in try/catch.

---

## Adding a frontend page

App Router conventions:

- `apps/client/app/(main)/tv/page.tsx` → `/tv` (public, browse OK)
- `apps/client/app/(auth)/login/page.tsx` → `/login` (guest-only auth flow)
- Server Component by default; add `"use client"` at the top only if you need hooks/events
- Fetch API via `import { api } from "@/lib/api"` (axios)

Auth gate: guests can browse, but "Үзэх" (Watch) button must redirect to `/login?callbackUrl=...`. Implement this in the player component, not the route.

---

## Database changes

```bash
cd apps/server

# 1. Edit prisma/schema.prisma

# 2. Create + apply migration
pnpm db:migrate
# → prompts for migration name

# 3. Regenerate client (auto on migrate, but if you only changed generator config)
pnpm db:generate

# 4. (optional) reseed
pnpm db:seed

# 5. Browse data
pnpm db:studio   # opens http://localhost:5555
```

For production: never `db:migrate` (interactive); use `prisma migrate deploy`.

---

## Testing the API

Use the `.rest` files at `rest/*.rest` with the VS Code **REST Client** extension. Each route gets its own file. Example:

```http
### Login with OTP
POST http://localhost:3001/api/auth/login-otp
Content-Type: application/json

{
  "phone": "99112233",
  "code": "1234"
}

### Use the access token from above
@token = paste-token-here

### Get profile
GET http://localhost:3001/api/profile
Authorization: Bearer {{token}}
```

**CLAUDE.md rule:** every new route must ship with a `.rest` case in the same task.

---

## Running checks before pushing

```bash
pnpm type-check    # all 3 apps via turbo (cached, fast)
pnpm lint          # next lint on web/admin
pnpm build         # full prod build of all 3
```

Turbo caches results — second run is `>>> FULL TURBO` (28ms). CI will use the same commands.

---

## Filtering turbo to one app

```bash
pnpm turbo run build --filter=@mnb-ott/client
pnpm turbo run type-check --filter=@mnb-ott/server
```

Equivalent shortcuts:

```bash
pnpm --filter @mnb-ott/server run dev
pnpm --filter @mnb-ott/client run lint
```

---

## Adding a dependency

```bash
# To one app
pnpm --filter @mnb-ott/client add lodash
pnpm --filter @mnb-ott/server add -D @types/lodash

# To the workspace root (rare — only for dev tooling like turbo)
pnpm add -Dw eslint
```

**Never `cd apps/client && pnpm add ...`** — always use `--filter` from root so the workspace lockfile updates correctly.

---

## Environment variables

| File | Purpose | Committed? |
|---|---|---|
| `apps/server/.env` | Backend secrets (DB URL, JWT, OAuth) | ❌ no |
| `apps/server/.env.example` | Template, all keys with empty values | ✅ yes |
| `apps/client/.env.local` | Frontend secrets (NEXTAUTH_SECRET, etc.) | ❌ no |
| `apps/client/.env.example` | Template | ✅ yes |
| `apps/admin/.env.local` | Admin frontend secrets | ❌ no |

`NEXT_PUBLIC_*` vars are **baked into the JS bundle at build time** — changing them requires a rebuild, not a restart.

---

## Common pitfalls

1. **Running scripts from inside `apps/server/`** — works, but skips turbo cache. Always prefer `pnpm dev:server` from root.
2. **Forgetting `db:generate` after schema edit** — TS will yell with "property does not exist on PrismaClient". Run `cd apps/server && pnpm db:generate`.
3. **CORS errors in browser** — backend needs `cors({ origin: "http://localhost:3000", credentials: true })`. Check `apps/server/src/index.ts`.
4. **NextAuth session not persisting** — `NEXTAUTH_URL` mismatch with actual URL, or `NEXTAUTH_SECRET` missing.
5. **Prisma client out of date in dev** — `pnpm install` doesn't regenerate it. After pulling schema changes from git, run `cd apps/server && pnpm db:generate`.
6. **`pnpm dev` for all three at once** — output is interleaved, hard to read. Prefer one terminal per app for active dev.

---

## Command cheatsheet

```bash
# Dev
pnpm dev                           # all 3 apps
pnpm dev:server / dev:client / dev:admin # one app
docker-compose up -d               # pg + redis
docker-compose down                # stop infra

# Build / verify
pnpm build                         # all
pnpm type-check                    # all
pnpm lint                          # all
pnpm clean                         # wipe dist + .next + .turbo

# Filter to one app
pnpm --filter @mnb-ott/client run <script>

# DB
cd apps/server && pnpm db:migrate     # create + apply migration
cd apps/server && pnpm db:studio      # GUI
cd apps/server && pnpm db:seed        # run seed

# Deps
pnpm --filter @mnb-ott/server add <pkg>
pnpm --filter @mnb-ott/server add -D <pkg>
pnpm add -Dw <pkg>                 # workspace root devDep

# Workspace info
pnpm list --depth=0                # root deps
pnpm -r list --depth=0             # all packages, all deps
pnpm why <pkg>                     # who depends on it
```

---

## CLAUDE.md task pattern

When asking Claude to do work, use this format (from `CLAUDE.md`):

```
[файлуудыг] хамт бич:
- file1.ts : [юу хийх]
- file2.ts : [юу хийх]
- file.rest : тест
Анхаарах: [тусгай нөхцөл]
```

Example:

```
apps/server/src/routes/epg.routes.ts + epg.controller.ts + epg.service.ts
+ rest/epg.rest хамт бич.
GET /api/epg/:channelId — 3 хойш / 5 урагш өдрийн program-уудыг буцаана.
Кэш: Redis-д 15 минут.
```

Claude will write all four files together, including the `.rest` test cases.

---

## Related docs

- **`README.md`** — initial setup (clone → install → run)
- **`docs/ARCHITECTURE.md`** — folder structure, API endpoints, schema, roles, roadmap
- **`CLAUDE.md`** — project instructions, tech stack, color system, auth rules, coding standards
