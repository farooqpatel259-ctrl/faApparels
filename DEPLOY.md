# Deploy FA Apparels on Render.com

**Repo:** https://github.com/farooqpatel259-ctrl/faApparels  
**Branch:** `main`

Pre-flight in this repo is already done (Postgres Prisma, static Next export, `render.yaml`, prod scripts).

You have two options below. Use **either** Blueprint **or** Web Services (manual). Do not create both for the same app unless you delete one set.

---

## Option A — Blueprint steps (uses `render.yaml`)

Creates automatically:
- Postgres: `faapparels-db`
- API Web Service: `faapparels-api`
- Static Web: `faapparels-web`

### A1. Open Blueprint

1. Go to https://dashboard.render.com
2. Sign in with the GitHub account that owns `farooqpatel259-ctrl/faApparels`
3. Click **New +** → **Blueprint**

### A2. Connect repo

1. Choose **`farooqpatel259-ctrl/faApparels`**
2. Branch: **`main`**
3. Render should detect `render.yaml` at the repo root

### A3. Review services

Confirm these will be created:

| Resource | Name | Type |
|---|---|---|
| Database | `faapparels-db` | PostgreSQL |
| Backend | `faapparels-api` | Web Service (Node) |
| Frontend | `faapparels-web` | Static Site |

### A4. Confirm env

- `DATABASE_URL` is linked from `faapparels-db` (automatic)
- `JWT_SECRET` is auto-generated
- `NEXT_PUBLIC_API_URL` should be:
  ```text
  https://faapparels-api.onrender.com/api/v1
  ```
  If your API service name/URL differs, update this before/after apply.

### A5. Apply

1. Click **Apply**
2. Wait until Postgres, API, and Web all show **Live** / green
3. First API deploy can take several minutes

### A6. Verify API

Open:

```text
https://faapparels-api.onrender.com/api/v1/health
```

Expected: JSON with `"status":"ok"` (may be wrapped in `{ "data": ... }`).

### A7. Seed database (once)

1. Dashboard → **faapparels-api** → **Shell**
2. Run:
   ```bash
   npm run prisma:seed -w @inventory-ops/api
   ```

### A8. Open web app

1. Dashboard → **faapparels-web** → open the `.onrender.com` URL
2. Login:
   - User: `farooqpatel259`
   - Password: `farooqpatel2006`

### A9. If web cannot call API

1. **faapparels-web** → **Environment**
2. Set `NEXT_PUBLIC_API_URL` to your real API URL + `/api/v1`
3. **Manual Deploy** → clear build cache / redeploy static site

---

## Option B — Web Services steps (manual, no Blueprint)

Use this if you prefer creating each service yourself.

### B1. Create PostgreSQL

1. **New +** → **PostgreSQL**
2. Name: `faapparels-db`
3. Plan: Free (or Starter if Free is unavailable)
4. Region: pick one and stick to it for API too
5. Create
6. Open DB → copy **Internal Database URL**

### B2. Create API Web Service

1. **New +** → **Web Service**
2. Connect repo **`farooqpatel259-ctrl/faApparels`**
3. Configure:

| Field | Value |
|---|---|
| Name | `faapparels-api` |
| Branch | `main` |
| Language / Runtime | **Node** |
| Root Directory | *(leave blank)* |
| Build Command | `npm install && npm run build:api` |
| Start Command | `npm run start:api:prod` |
| Instance | Free / Starter |

4. **Environment** tab → add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Internal Database URL from B1 |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_VERSION` | `20` |
| `NODE_ENV` | `production` |

5. Optional: Health Check Path = `/api/v1/health`
6. Click **Create Web Service**
7. Wait for deploy success
8. Copy the service URL, e.g. `https://faapparels-api.onrender.com`
9. Test: `https://YOUR-API.onrender.com/api/v1/health`

### B3. Seed API (once)

1. Open **faapparels-api** → **Shell**
2. Run:
   ```bash
   npm run prisma:seed -w @inventory-ops/api
   ```

### B4. Create frontend Static Site

> Your Next app uses `output: "export"`, so frontend must be a **Static Site**, not a Node Web Service.

1. **New +** → **Static Site**
2. Same repo **`farooqpatel259-ctrl/faApparels`**, branch **`main`**
3. Configure:

| Field | Value |
|---|---|
| Name | `faapparels-web` |
| Build Command | `npm install && npm run build:web` |
| Publish Directory | `apps/web/out` |

4. **Environment** (build-time):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com/api/v1` |
| `NODE_VERSION` | `20` |

Use the exact API hostname from B2.

5. Create Static Site and wait for build
6. Open the site URL and login with `farooqpatel259` / `farooqpatel2006`

### B5. Fix API URL if needed

If the UI loads but login/data fails:

1. Confirm API health URL works
2. Update `NEXT_PUBLIC_API_URL` on the static site
3. **Manual Deploy** the static site again (required, because Next bakes this in at build time)

---

## After deploy (both options)

| Check | URL / action |
|---|---|
| API health | `https://YOUR-API.onrender.com/api/v1/health` |
| Web app | Static site URL from dashboard |
| Login | `farooqpatel259` / `farooqpatel2006` |
| Mobile APK | Settings → API server → `https://YOUR-API.onrender.com/api/v1` |

---

## Common issues

| Problem | Fix |
|---|---|
| API build fails on Prisma | Ensure `DATABASE_URL` is set and is Postgres (`postgresql://...`) |
| Web login fails / network error | Wrong `NEXT_PUBLIC_API_URL` → fix + redeploy static site |
| Free Postgres missing | Use Starter Postgres plan |
| Slow first request | Free tier sleeps; wait 30–60s and retry |
| 404 on refresh of a page | Use trailing slash routes (`/inventory/`) or redeploy with current `render.yaml` |

---

## Commands used by Render

Already defined in root `package.json`:

- API build: `npm run build:api`
- API start: `npm run start:api:prod` (runs `prisma db push` then Nest)
- Web build: `npm run build:web` → publishes `apps/web/out`
