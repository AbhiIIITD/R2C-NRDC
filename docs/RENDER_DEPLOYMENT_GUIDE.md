# R2C.AI — Render Deployment Guide

Deploy the full R2C.AI stack on [Render](https://render.com). This guide takes the
6-service Docker Compose stack and maps each piece to a Render resource.

> **Read this first — the architecture differs from local.** Locally everything runs
> on one machine behind one set of `localhost` ports. On Render each service gets its
> **own HTTPS domain**, so two things that "just work" locally need explicit config:
> cross-origin **CORS + cookies**, and the **frontend's API URL baked at build time**.
> Both are covered below. A code change required for cross-domain login is already
> applied (see [§9](#9-the-cross-domain-login-fix-already-applied)).

---

## 1. What gets deployed

| # | Local service | Render resource | Plan (minimum) | Public? |
|---|---|---|---|---|
| 1 | `postgres` (`nrdc_r2c`) | **PostgreSQL** instance `r2c-db-main` | Starter ($) | internal |
| 2 | `postgres` (`sutra`) | **PostgreSQL** instance `r2c-db-sutra` (pgvector) | Starter ($) | internal |
| 3 | `redis` | **Key Value** (Redis) `r2c-redis` | Starter / Free | internal |
| 4 | `backend` | **Web Service** (Docker) `r2c-backend` | Starter | ✅ public |
| 5 | `matchmaking` | **Web Service** (Docker) `r2c-matchmaking` | **Standard** (≥2 GB RAM) | ✅ public¹ |
| 6 | `ai-agents` (SUTRA) | **Web Service** (Docker) `r2c-ai-agents` | Standard | ✅ public¹ |
| 7 | `frontend` | **Static Site** `r2c-frontend` | Free | ✅ public |

¹ Only the backend calls matchmaking and ai-agents. You can deploy them as **Private
Services** instead of Web Services to keep them off the public internet — see
[§10](#10-optional-make-the-ai-services-private). Deploying them public first is
simpler to debug; lock them down once it works.

**Why matchmaking needs Standard:** its image bakes in **torch + the `bge` embedding
model** (~440 MB) and loads it into RAM. The 512 MB free/Starter tier will OOM. Give
it ≥2 GB.

---

## 2. Prerequisites

- A **Render account** (a paid workspace — the matchmaking service needs a Standard
  instance, and free Postgres/Redis expire after 30 days).
- Your code in a **Git repo** (GitHub/GitLab/Bitbucket) that Render can access. Render
  builds from a connected repo, not from your laptop.
- The same secrets you use locally: **`OPENAI_API_KEY`**, **`SUPABASE_URL`**,
  **`SUPABASE_KEY`**.

> **⚠️ Folder names contain spaces** (`AI 2/...`, `AI r2c/...`). Render's dashboard
> handles these fine in the *Root Directory* field, but the optional `render.yaml`
> Blueprint ([Appendix B](#appendix-b-renderyaml-blueprint-optional)) is more reliable
> if you first rename them to `AI2/` and `AIr2c/`. The dashboard steps below do **not**
> require renaming.

---

## 3. Deployment order

Create resources in this order so each one's connection details exist when the next
needs them:

1. The two **PostgreSQL** instances + **Redis** (§4)
2. **Backend** web service (§5)
3. **Matchmaking** + **AI-agents** web services (§6)
4. Wire the backend's AI URLs back in (§6.3)
5. **Frontend** static site (§7)
6. Final CORS wire-up (§7.2)

---

## 4. Datastores

### 4.1 Postgres — main app DB (`nrdc_r2c`)

1. **New ➜ PostgreSQL.**
2. Name `r2c-db-main`, Database **`nrdc_r2c`**, User `postgres` (or leave default).
3. Region: **pick one region and use it for every service** (internal networking and
   low latency require same region).
4. Plan: Starter or higher. Create.
5. When it's live, open the instance and copy the **Internal Database URL** — you'll
   give it to the backend as `DATABASE_URL`.

### 4.2 Postgres — SUTRA DB (`sutra`, needs pgvector)

1. **New ➜ PostgreSQL.** Name `r2c-db-sutra`, Database **`sutra`**. Same region.
2. After it's live, enable the vector extension. Open the **PSQL** shell (or use the
   external URL with `psql`) and run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

   SUTRA auto-creates its 6 tables on boot but **does not create this extension** — do
   it now or the ai-agents service will fail to start.
3. Copy this instance's **Internal Database URL** for the ai-agents service.

> Could you use one Postgres instance for both? Render gives one database per instance
> and the default role can't reliably `CREATE DATABASE`, so **two instances is the
> clean path.** Keep them separate.

### 4.3 Redis (Key Value)

1. **New ➜ Key Value** (Render's managed Redis). Name `r2c-redis`. Same region.
2. **Maxmemory policy:** `noeviction` is fine (SUTRA uses it as a cache).
3. Copy the **Internal Redis URL** (`redis://...`) for the ai-agents service.

---

## 5. Backend (Express + Prisma) — `r2c-backend`

### 5.1 Create the service

1. **New ➜ Web Service** ➜ connect your repo.
2. **Root Directory:** `Comprehensiveproductwireframesystem/backend`
3. **Runtime / Language:** **Docker** (it auto-detects `Dockerfile.backend`; if the
   field asks, set **Dockerfile Path** to `Dockerfile.backend`).
4. **Region:** same as the databases. **Plan:** Starter or higher.
5. **Health Check Path:** `/api/v1/health`

The image's startup command already runs, in order: `prisma migrate deploy` → seed →
`import:papers` → `node dist-server/index.js`. No start-command override needed. It
binds `process.env.PORT`, which Render injects automatically.

### 5.2 Environment variables

Add these under **Environment** (leave `PORT` unset — Render provides it):

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | **Required** — enables Secure/SameSite=None cookies ([§9](#9-the-cross-domain-login-fix-already-applied)) |
| `DATABASE_URL` | *Internal URL of `r2c-db-main`* | Use **From Database ➜ r2c-db-main ➜ Internal Connection String** |
| `JWT_ACCESS_SECRET` | *a long random string* | Generate one; never reuse the dev default |
| `ACCESS_TOKEN_TTL` | `15m` | |
| `REFRESH_TOKEN_DAYS` | `30` | |
| `STORAGE_ROOT` | `/app/storage` | See disk note below |
| `OPENAI_API_KEY` | *your key* | |
| `COPILOT_PROVIDER` | `openai` | |
| `COPILOT_MODEL` | `gpt-5.4` | Newest model that streams via `chat/completions` |
| `COPILOT_TEMPERATURE` | `0.4` | |
| `SUPABASE_URL` | *your Supabase URL* | |
| `SUPABASE_KEY` | *your Supabase publishable key* | |
| `AI_HTTP_TIMEOUT_MS` | `120000` | SUTRA calls are slow |
| `AI_HTTP_RETRIES` | `1` | |
| `MATCHMAKING_API_URL` | *placeholder for now* | Fill in §6.3 |
| `SUTRA_AI_API_URL` | *placeholder for now* | Fill in §6.3 |
| `CLIENT_ORIGIN` | *placeholder for now* | Fill in §7.2 (frontend URL) |

> Set `MATCHMAKING_API_URL`, `SUTRA_AI_API_URL`, and `CLIENT_ORIGIN` to any temporary
> value now (e.g. `https://example.com`); you'll correct them once those services
> exist. The backend boots fine without them — AI features just won't work yet.

### 5.3 Persistent storage (uploads)

Render's container filesystem is **ephemeral** — uploaded files under `STORAGE_ROOT`
are wiped on every deploy/restart. Attach a disk:

- **Disk ➜ Add Disk:** Name `storage`, **Mount Path `/app/storage`**, size e.g. 5 GB.

(Skip only if you don't care about losing uploaded research files between deploys.)

### 5.4 Deploy

Create the service. First build is slow (npm ci + tsc + Prisma generate). When it's
live, note its URL: `https://r2c-backend.onrender.com`. Verify:

```
https://r2c-backend.onrender.com/api/v1/health   →   {"status":"ok",...}
```

---

## 6. AI services

### 6.1 Matchmaking — `r2c-matchmaking`

1. **New ➜ Web Service** ➜ same repo.
2. **Root Directory:** `AI 2/Matchmaking_problem_to_papers`
3. **Runtime:** Docker (Dockerfile Path `Dockerfile.matchmaking`).
4. **Plan: Standard or higher** (torch + bge needs RAM). Same region.
5. **Docker Command** (override — the Dockerfile hardcodes port 8004, but Render needs
   `$PORT`):

   ```
   uvicorn service.main:app --host 0.0.0.0 --port $PORT
   ```
6. **Health Check Path:** `/health`
7. **Environment:**

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | *your Supabase URL* |
   | `SUPABASE_KEY` | *your Supabase publishable key* |

8. Deploy. First build is **slow** (installs CPU torch, downloads the bge model). When
   live: `https://r2c-matchmaking.onrender.com/health` → `{"status":"ok",...}`.

### 6.2 AI-agents (SUTRA) — `r2c-ai-agents`

1. **New ➜ Web Service** ➜ same repo.
2. **Root Directory:** `AI r2c/AI-team`
3. **Runtime:** Docker (Dockerfile Path `Dockerfile.ai-agents`).
4. **Plan:** Standard. Same region.
5. **Docker Command** (override hardcoded 8000):

   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
6. **Health Check Path:** `/health/`  *(note the trailing slash)*
7. **Environment:**

   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | *Internal URL of `r2c-db-sutra`* | The pgvector DB from §4.2 |
   | `REDIS_URL` | *Internal URL of `r2c-redis`* | |
   | `LLM_PROVIDER` | `openai` | |
   | `OPENAI_API_KEY` | *your key* | |
   | `OPENAI_MODEL` | `gpt-5-mini` | Faster; the 6 agents make many calls |
   | `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | |
   | `ENVIRONMENT` | `production` | |

8. Deploy. When live: `https://r2c-ai-agents.onrender.com/health/` →
   `{"status":"healthy","database":"connected","cache":"connected"}`.

### 6.3 Point the backend at the AI services

Go back to **`r2c-backend` ➜ Environment** and set the real URLs:

| Key | Value |
|---|---|
| `MATCHMAKING_API_URL` | `https://r2c-matchmaking.onrender.com` |
| `SUTRA_AI_API_URL` | `https://r2c-ai-agents.onrender.com` |

Save — Render redeploys the backend.

---

## 7. Frontend (React + Vite) — `r2c-frontend`

The frontend is a **Static Site** (not Docker — Render builds the Vite output and
serves it from its CDN). The browser must know the backend URL **at build time**:
`VITE_API_URL` is baked into the bundle ([api.ts:5-7](../Comprehensiveproductwireframesystem/frontend/src/services/api.ts#L5-L7)).

### 7.1 Create the static site

1. **New ➜ Static Site** ➜ same repo.
2. **Root Directory:** `Comprehensiveproductwireframesystem/frontend`
3. **Build Command:** `npm ci && npm run build`
4. **Publish Directory:** `dist`
5. **Environment variable:**

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://r2c-backend.onrender.com/api/v1` |

   ⚠️ Include the **`/api/v1`** suffix and **no trailing slash**. This is read at build
   time only — if you change it later you must trigger a **redeploy** to rebuild.
6. **Rewrite rule (required for the SPA router).** Add a redirect/rewrite:
   - **Source** `/*` → **Destination** `/index.html` → **Action: Rewrite**

   Without this, deep links / refresh on any route (e.g. `/login`) return 404.
7. Deploy. Note the URL: `https://r2c-frontend.onrender.com`.

### 7.2 Final CORS wire-up

Go to **`r2c-backend` ➜ Environment** and set:

| Key | Value |
|---|---|
| `CLIENT_ORIGIN` | `https://r2c-frontend.onrender.com` |

No trailing slash, exact origin. Comma-separate if you add a custom domain later
(`https://r2c-frontend.onrender.com,https://app.r2c.ai`). Save → backend redeploys.

The backend's CORS allow-list reads `CLIENT_ORIGIN`
([config.ts:3](../Comprehensiveproductwireframesystem/backend/server/config.ts#L3)) and
already sends `Access-Control-Allow-Credentials: true`
([index.ts:43](../Comprehensiveproductwireframesystem/backend/server/index.ts#L43)).

---

## 8. Verify the deployment

1. Open `https://r2c-frontend.onrender.com`. The landing page shows **R2C.AI** branding.
2. **Log in** with a seeded account:

   | Role | Email | Password |
   |---|---|---|
   | Researcher | `dr.smith@university.edu` | `password` |
   | Admin | `admin@nrdc.org` | `password` |
   | Industry | `mark.wilson@pharmatech.com` | `password` |

3. Open browser **DevTools ➜ Network** during login:
   - The `POST /auth/login` response sets a `refreshToken` cookie with
     **`SameSite=None; Secure`**. If it's missing, `NODE_ENV` isn't `production` on the
     backend (see §9).
   - No CORS errors in the console → `CLIENT_ORIGIN` is correct.
4. **Smart Match** (industry user) returns Supabase papers → matchmaking + Supabase OK.
5. **Problem Statements ➜ Run AI Analysis** runs the 6-agent SUTRA pipeline (~2 min) →
   ai-agents + its DB OK. Works out-of-the-box for **Renewable Energy / Green
   Hydrogen** problems (the seeded domain).

---

## 9. The cross-domain login fix (already applied)

Locally the cookie was `SameSite=Lax`, which is fine when frontend and backend share an
origin. On Render they're **different domains**, so the browser would refuse to send the
refresh cookie on the cross-site `/auth/refresh` fetch — users would get logged out
~15 minutes after login (when the access token expires).

This is fixed in
[server/index.ts](../Comprehensiveproductwireframesystem/backend/server/index.ts#L129-L139):
when `NODE_ENV=production`, the refresh cookie is set (and cleared) with
**`SameSite=None; Secure`**. This requires HTTPS — which Render provides on every
service automatically.

**Action required:** set `NODE_ENV=production` on the backend (§5.2). That's the switch
that activates the fix.

---

## 10. Optional: make the AI services private

Only the backend talks to matchmaking and ai-agents — the browser never does. To keep
them off the public internet:

1. When creating `r2c-matchmaking` / `r2c-ai-agents`, choose **Private Service**
   instead of Web Service (everything else identical, including the `$PORT` Docker
   Command override).
2. Private services get an **internal address** shown in the dashboard, of the form
   `http://r2c-matchmaking:10000` (Render sets `PORT=10000` by default).
3. Set the backend's `MATCHMAKING_API_URL` / `SUTRA_AI_API_URL` to those **internal**
   URLs (`http://`, not `https://`) instead of the public `.onrender.com` ones.

This also avoids public egress and is slightly faster. Do it after the public version
works, so you're only changing one variable at a time.

---

## 11. Costs & operational notes

- **Free instances spin down** after ~15 min idle and cold-start on the next request
  (the backend cold start includes running migrations; the matchmaking cold start loads
  torch — both slow). For anything user-facing, use paid instances so they stay warm.
- **Free Postgres/Redis expire after 30 days.** Use paid tiers for persistence.
- **Seed runs on every backend deploy.** It's idempotent (upserts), so existing data is
  preserved; it won't duplicate the seeded users.
- **Migrations run on every backend deploy** via `prisma migrate deploy` (forward-only,
  safe). A failing migration fails the deploy — check logs.
- **Auto-deploy:** by default Render redeploys on every push to the connected branch.
  Disable per-service if you want manual control.
- **Logs:** each service ➜ **Logs** tab. Health-check failures and OOMs show here.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login works, then logged out after ~15 min | Refresh cookie not cross-site | `NODE_ENV=production` on backend (§9) |
| CORS error in console on login | `CLIENT_ORIGIN` wrong/missing | Set it to the exact frontend origin, no trailing slash (§7.2) |
| Frontend calls `localhost:4001` | `VITE_API_URL` not set at build | Set it and **redeploy** the static site (§7.1) |
| 404 on page refresh / deep link | Missing SPA rewrite | Add `/*` → `/index.html` Rewrite (§7.1 step 6) |
| matchmaking deploy OOMs / restarts | Free/Starter RAM too small for torch | Upgrade to Standard (≥2 GB) |
| ai-agents fails on boot, DB error | `vector` extension missing | `CREATE EXTENSION vector;` on `r2c-db-sutra` (§4.2) |
| Service "deploy live" but unreachable | App not bound to `$PORT` | Python services need the `$PORT` Docker Command (§6) |
| Uploaded files vanish after deploy | Ephemeral filesystem | Attach a Disk at `/app/storage` (§5.3) |
| Smart Match returns empty | Supabase env not set | Check `SUPABASE_URL`/`SUPABASE_KEY` on backend **and** matchmaking |
| AI Analysis empty for a domain | No seeded technologies for it | Register techs via `POST {SUTRA_AI_API_URL}/technology/register` (Renewable Energy / Green Hydrogen is seeded) |
| OpenAI errors | Bad model id | There is **no gpt-5.5**; Copilot=`gpt-5.4`, agents=`gpt-5-mini` |

---

## Appendix A — Environment variable summary

**Backend (`r2c-backend`)**
```
NODE_ENV=production
DATABASE_URL=<internal url of r2c-db-main>
JWT_ACCESS_SECRET=<random secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=30
STORAGE_ROOT=/app/storage
OPENAI_API_KEY=<key>
COPILOT_PROVIDER=openai
COPILOT_MODEL=gpt-5.4
COPILOT_TEMPERATURE=0.4
SUPABASE_URL=<url>
SUPABASE_KEY=<publishable key>
AI_HTTP_TIMEOUT_MS=120000
AI_HTTP_RETRIES=1
MATCHMAKING_API_URL=https://r2c-matchmaking.onrender.com
SUTRA_AI_API_URL=https://r2c-ai-agents.onrender.com
CLIENT_ORIGIN=https://r2c-frontend.onrender.com
```

**Matchmaking (`r2c-matchmaking`)**
```
SUPABASE_URL=<url>
SUPABASE_KEY=<publishable key>
# Docker Command: uvicorn service.main:app --host 0.0.0.0 --port $PORT
```

**AI-agents (`r2c-ai-agents`)**
```
DATABASE_URL=<internal url of r2c-db-sutra>
REDIS_URL=<internal url of r2c-redis>
LLM_PROVIDER=openai
OPENAI_API_KEY=<key>
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
ENVIRONMENT=production
# Docker Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend (`r2c-frontend`, static site)**
```
VITE_API_URL=https://r2c-backend.onrender.com/api/v1
# Build: npm ci && npm run build   Publish: dist   Rewrite: /* -> /index.html
```

---

## Appendix B — `render.yaml` Blueprint (optional)

Render can provision everything from a single `render.yaml` at the repo root
(**New ➜ Blueprint**). The version below is a starting point — **review before use**:

- **Rename the spaced folders first** (`AI 2` → `AI2`, `AI r2c` → `AIr2c`) and update
  the `rootDir` values; Blueprints are finicky with spaces in paths.
- You still must run `CREATE EXTENSION vector;` on the sutra DB manually (§4.2).
- `VITE_API_URL` / `CLIENT_ORIGIN` use `fromService` so URLs wire automatically.

```yaml
databases:
  - name: r2c-db-main
    databaseName: nrdc_r2c
    plan: starter
  - name: r2c-db-sutra
    databaseName: sutra
    plan: starter

services:
  - type: redis
    name: r2c-redis
    plan: starter
    maxmemoryPolicy: noeviction

  - type: web
    name: r2c-backend
    runtime: docker
    rootDir: Comprehensiveproductwireframesystem/backend
    dockerfilePath: Dockerfile.backend
    healthCheckPath: /api/v1/health
    plan: starter
    disk:
      name: storage
      mountPath: /app/storage
      sizeGB: 5
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase: { name: r2c-db-main, property: connectionString }
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: ACCESS_TOKEN_TTL
        value: 15m
      - key: REFRESH_TOKEN_DAYS
        value: "30"
      - key: STORAGE_ROOT
        value: /app/storage
      - key: OPENAI_API_KEY
        sync: false
      - key: COPILOT_PROVIDER
        value: openai
      - key: COPILOT_MODEL
        value: gpt-5.4
      - key: COPILOT_TEMPERATURE
        value: "0.4"
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: AI_HTTP_TIMEOUT_MS
        value: "120000"
      - key: AI_HTTP_RETRIES
        value: "1"
      - key: MATCHMAKING_API_URL
        fromService: { name: r2c-matchmaking, type: web, property: host }
      - key: SUTRA_AI_API_URL
        fromService: { name: r2c-ai-agents, type: web, property: host }
      - key: CLIENT_ORIGIN
        fromService: { name: r2c-frontend, type: web, property: host }

  - type: web
    name: r2c-matchmaking
    runtime: docker
    rootDir: AI2/Matchmaking_problem_to_papers   # renamed (was "AI 2/...")
    dockerfilePath: Dockerfile.matchmaking
    dockerCommand: uvicorn service.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    plan: standard
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false

  - type: web
    name: r2c-ai-agents
    runtime: docker
    rootDir: AIr2c/AI-team                        # renamed (was "AI r2c/...")
    dockerfilePath: Dockerfile.ai-agents
    dockerCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health/
    plan: standard
    envVars:
      - key: DATABASE_URL
        fromDatabase: { name: r2c-db-sutra, property: connectionString }
      - key: REDIS_URL
        fromService: { name: r2c-redis, type: redis, property: connectionString }
      - key: LLM_PROVIDER
        value: openai
      - key: OPENAI_API_KEY
        sync: false
      - key: OPENAI_MODEL
        value: gpt-5-mini
      - key: OPENAI_EMBEDDING_MODEL
        value: text-embedding-3-small
      - key: ENVIRONMENT
        value: production

  - type: web
    name: r2c-frontend
    runtime: static
    rootDir: Comprehensiveproductwireframesystem/frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_URL
        # property: host gives the bare hostname; append the API path.
        fromService: { name: r2c-backend, type: web, property: host }
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

> **Caveat on the Blueprint URLs:** `fromService … property: host` yields the bare
> hostname (e.g. `r2c-backend.onrender.com`) without scheme or path. The frontend needs
> `https://…/api/v1` and the backend's `CLIENT_ORIGIN` needs `https://…`. After the
> first Blueprint deploy, set the final `VITE_API_URL`, `CLIENT_ORIGIN`,
> `MATCHMAKING_API_URL`, and `SUTRA_AI_API_URL` values explicitly in the dashboard
> (with scheme + path) and redeploy. The dashboard flow in §5–§7 avoids this entirely —
> use the Blueprint to provision, then finalize URLs by hand.
