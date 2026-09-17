# Deploy FA Apparels on Render.com

Repo: https://github.com/farooqpatel259-ctrl/faApparels

## Pre-flight (already done in this repo)

- [x] Prisma uses **PostgreSQL** (`apps/api/prisma/schema.prisma`)
- [x] Next.js static export enabled (`output: "export"` → `apps/web/out`)
- [x] Production scripts: `build:api`, `build:web`, `start:api:prod`
- [x] API binds `0.0.0.0` and reads `PORT`
- [x] Health check: `/api/v1/health`
- [x] Blueprint file: `render.yaml`
- [x] Env examples: `apps/api/.env.example`, `apps/web/.env.example`
- [x] Changes pushed to GitHub `main`

You can go to Render now.

---

## Deploy (Blueprint)

1. Open https://dashboard.render.com → sign in with GitHub.
2. **New → Blueprint**.
3. Select **`farooqpatel259-ctrl/faApparels`**, branch **`main`**.
4. Confirm services from `render.yaml`:
   - Postgres `faapparels-db`
   - Web Service `faapparels-api`
   - Static Site `faapparels-web`
5. Confirm `NEXT_PUBLIC_API_URL` is:
   `https://faapparels-api.onrender.com/api/v1`
   (change if Render assigns a different API name/URL).
6. Click **Apply** and wait for all green.

### After API is live

1. Open `https://faapparels-api.onrender.com/api/v1/health`
2. Render → `faapparels-api` → **Shell**, run once:
   ```bash
   npm run prisma:seed -w @inventory-ops/api
   ```
3. Open the **web** service URL.
4. Login: `farooqpatel259` / `farooqpatel2006`

If the web app cannot reach the API, set `NEXT_PUBLIC_API_URL` correctly on `faapparels-web` and **Manual Deploy** the static site again.

---

## Manual deploy (backup)

### 1) PostgreSQL
- New → PostgreSQL → `faapparels-db`
- If Free is unavailable, use the cheapest paid Postgres plan
- Copy the connection string

### 2) API (Web Service)
- New → Web Service → this repo, branch `main`
- Build: `npm install && npm run build:api`
- Start: `npm run start:api:prod`
- Health path: `/api/v1/health`
- Env:
  - `DATABASE_URL` = Postgres URL
  - `JWT_SECRET` = long random string
  - `JWT_EXPIRES_IN` = `7d`
  - `NODE_VERSION` = `20`
  - `NODE_ENV` = `production`

### 3) Web (Static Site)
- New → Static Site → this repo, branch `main`
- Build: `npm install && npm run build:web`
- Publish directory: `apps/web/out`
- Env (build-time):
  - `NEXT_PUBLIC_API_URL` = `https://YOUR-API.onrender.com/api/v1`
  - `NODE_VERSION` = `20`

---

## Notes

- Free web services sleep when idle (slow first request).
- Do not use SQLite on Render.
- Android APK: Settings → API server → your Render API URL ending in `/api/v1`.
