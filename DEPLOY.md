# Deploy on Render.com

Repo: https://github.com/farooqpatel259-ctrl/faApparels

This project is prepared for Render with:
- PostgreSQL Prisma schema
- `render.yaml` Blueprint (API + static web + Postgres)
- Production npm scripts: `build:api`, `build:web`, `start:api:prod`
- Next.js static export (`apps/web/out`)

## Option A — Blueprint (fastest)

1. Open https://dashboard.render.com → **New** → **Blueprint**
2. Connect `farooqpatel259-ctrl/faApparels`
3. Apply `render.yaml`
4. When prompted for `NEXT_PUBLIC_API_URL`, enter:
   `https://faapparels-api.onrender.com/api/v1`
   (use your real API hostname if different)
5. Wait for Postgres + API + Web to finish
6. Open the web URL and log in

### Seed demo data (once)

In Render → `faapparels-api` → **Shell**:

```bash
npm run prisma:seed -w @inventory-ops/api
```

Login: `farooqpatel259` / `farooqpatel2006`

## Option B — Manual services

### 1) PostgreSQL
- **New → PostgreSQL** → name `faapparels-db`
- Copy the connection string

### 2) API Web Service
- **New → Web Service** → this repo
- Build: `npm run build:api`
- Start: `npm run start:api:prod`
- Env:
  - `DATABASE_URL` = Postgres URL
  - `JWT_SECRET` = long random string
  - `JWT_EXPIRES_IN` = `7d`
  - `NODE_VERSION` = `20`
- Health: `/api/v1/health`

### 3) Static Site (web)
- **New → Static Site** → this repo
- Build: `npm run build:web`
- Publish directory: `apps/web/out`
- Env (build-time):
  - `NEXT_PUBLIC_API_URL` = `https://YOUR-API.onrender.com/api/v1`
  - `NODE_VERSION` = `20`

Redeploy the static site whenever you change `NEXT_PUBLIC_API_URL`.

## Free plan notes

- Services sleep when idle; first request can be slow
- Do not use SQLite on Render
- For the Android APK, set Settings → API server to your Render API URL
