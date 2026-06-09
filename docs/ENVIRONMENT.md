# R2C.AI — Environment Variables Reference

Every environment variable across the four services, with its **local** value and its
**Render hosting** value. Secrets live only in `.env` files (gitignored) or the Render
dashboard — **never commit real keys**. Each service ships a committed `.env.example`
with placeholders.

- **Local / single host:** `docker compose up` reads the **root `.env`** (copy from
  [`.env.example`](../.env.example)). It injects the right values into each container.
- **Render:** there is no `.env`. Set variables **per service** in the dashboard. Full
  walkthrough in [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md).

> **Model note (applies everywhere):** this OpenAI account has **no `gpt-5.5`**.
> Copilot uses **`gpt-5.4`**; the SUTRA agents use **`gpt-5-mini`** (faster across many
> calls). Setting `gpt-5.5` will fail at runtime.

---

## Quick start (local)

```bash
cp .env.example .env          # then fill OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY
docker compose up --build
```

The root `.env` is the only file you need for the Docker Compose path — it feeds all
services. The per-service `.env` files matter only when you run a service **outside**
Compose (e.g. `npm run dev:api` or `uvicorn` directly).

---

## 1. Root `.env` (docker-compose) — file: [`.env.example`](../.env.example)

| Variable | Required | Local default | Purpose |
|---|---|---|---|
| `FRONTEND_PORT` | no | `5174` | Host port → frontend nginx (container 80) |
| `BACKEND_PORT` | no | `4001` | Host port → backend (container 4000) |
| `MATCHMAKING_PORT` | no | `8004` | Host port → matchmaking |
| `AI_AGENTS_PORT` | no | `8000` | Host port → SUTRA agents |
| `POSTGRES_PORT` | no | `55433` | Host port → Postgres (container 5432) |
| `REDIS_PORT` | no | `6380` | Host port → Redis (container 6379) |
| `POSTGRES_PASSWORD` | yes | `postgres` | Postgres superuser password; used in both `DATABASE_URL`s |
| `JWT_ACCESS_SECRET` | yes | `change-me…` | Backend access-token signing secret — **change for any real deploy** |
| `OPENAI_API_KEY` | yes | — | Used by Copilot (backend) and SUTRA agents |
| `COPILOT_MODEL` | no | `gpt-5.4` | Copilot chat model |
| `SUTRA_OPENAI_MODEL` | no | `gpt-5-mini` | Model the 6 SUTRA agents use |
| `SUPABASE_URL` | yes | — | Supabase project URL (matchmaking corpus) |
| `SUPABASE_KEY` | yes | — | Supabase **publishable** key (enough for matching) |

> Not used on Render — the dashboard sets each service's vars directly.

---

## 2. Backend — Express + Prisma — file: [`Comprehensiveproductwireframesystem/backend/.env.example`](../Comprehensiveproductwireframesystem/backend/.env.example)

| Variable | Required | Local | Render |
|---|---|---|---|
| `NODE_ENV` | **yes on Render** | unset | `production` — **switches the refresh cookie to `Secure; SameSite=None`** so cross-domain login survives token refresh. Without it, users drop ~15 min after login. |
| `DATABASE_URL` | yes | compose DB / pooler URL | Internal Connection String of `r2c-db-main` |
| `PORT` | no | `4000` | **leave unset** — Render injects `$PORT` |
| `CLIENT_ORIGIN` | yes | `http://localhost:5173,…` | exact frontend origin, e.g. `https://r2c-frontend.onrender.com` (comma-sep, no trailing slash) — drives CORS |
| `JWT_ACCESS_SECRET` | yes | dev value | a long random string |
| `ACCESS_TOKEN_TTL` | no | `15m` | `15m` |
| `REFRESH_TOKEN_DAYS` | no | `30` | `30` |
| `STORAGE_ROOT` | yes | `./storage` | `/app/storage` — **attach a Render Disk** here or uploads vanish on redeploy |
| `OPENAI_API_KEY` | yes (for AI) | — | your key |
| `GEMINI_API_KEY` | no | — | only if using Gemini |
| `COPILOT_PROVIDER` | no | `openai` | `openai` |
| `COPILOT_MODEL` | no | `gpt-5.4` | `gpt-5.4` (not `gpt-5.5`) |
| `COPILOT_TEMPERATURE` | no | `0.4` | `0.4` |
| `COPILOT_MAX_HISTORY` | no | `20` | `20` |
| `MATCHMAKING_API_URL` | yes (for match) | `http://localhost:8004` | `https://r2c-matchmaking.onrender.com` (or internal URL if private) |
| `MATCHMAKING_API_KEY` | no | — | only if the service requires auth |
| `SUTRA_AI_API_URL` | yes (for analysis) | `http://localhost:8000` | `https://r2c-ai-agents.onrender.com` (or internal URL) |
| `SUTRA_AI_API_KEY` | no | — | only if required |
| `SUPABASE_URL` / `SUPABASE_KEY` | no | — | optional direct-RPC use |
| `KEEP_ALIVE_URL` | no | unset (disabled) | auto on Render via `RENDER_EXTERNAL_URL`; self-pings `/api/v1/ping` to prevent cold starts. Set manually only on non-Render hosts. |
| `KEEP_ALIVE_MINUTES` | no | `10` | `10` (must be < the host's idle window, ~15 min on Render) |
| `AI_HTTP_TIMEOUT_MS` | no | `45000` | `120000` (SUTRA is slow) |
| `AI_HTTP_RETRIES` | no | `2` | `1` |
| `AI_HTTP_RETRY_BASE_MS` / `AI_CACHE_TTL_MS` / `AI_CACHE_MAX_ENTRIES` | no | tuning | leave default |

---

## 3. Frontend — React + Vite — file: [`Comprehensiveproductwireframesystem/frontend/.env.example`](../Comprehensiveproductwireframesystem/frontend/.env.example)

These are read at **build time** and baked into the bundle ([api.ts](../Comprehensiveproductwireframesystem/frontend/src/services/api.ts#L4-L7)).

| Variable | Required | Local | Render (static site) |
|---|---|---|---|
| `VITE_API_PORT` | no | `4001` | unused (use `VITE_API_URL`) |
| `VITE_API_URL` | **yes on Render** | unset (auto-derived from host) | `https://r2c-backend.onrender.com/api/v1` — include `/api/v1`, no trailing slash. **Changing it requires a rebuild.** |

Locally, leaving `VITE_API_URL` unset lets the app derive the API base from the host it's
opened on (works on localhost and any LAN IP). For hosting you must pin it.

---

## 4. Matchmaking — FastAPI + bge — file: [`AI 2/Matchmaking_problem_to_papers/.env.example`](../AI%202/Matchmaking_problem_to_papers/.env.example)

| Variable | Required | Local | Render |
|---|---|---|---|
| `SUPABASE_URL` | yes (primary mode) | — | your Supabase URL |
| `SUPABASE_KEY` | yes (primary mode) | — | Supabase publishable key |
| `DATABASE_URL` | no (fallback only) | — | Supabase Session Pooler URL; used **only** when the two `SUPABASE_*` vars are absent |
| `ANTHROPIC_API_KEY` | no | — | only for `/match?explain=true` |

**Render notes:** override the Docker Command to bind `$PORT`
(`uvicorn service.main:app --host 0.0.0.0 --port $PORT`); needs a **Standard** plan
(≥2 GB RAM — torch + the bge model).

---

## 5. AI agents (SUTRA) — FastAPI — file: [`AI r2c/AI-team/.env.example`](../AI%20r2c/AI-team/.env.example)

| Variable | Required | Local | Render |
|---|---|---|---|
| `DATABASE_URL` | yes | sutra DB URL | Internal URL of `r2c-db-sutra` — **needs `CREATE EXTENSION vector;`** |
| `REDIS_URL` | yes | `redis://localhost:6379/0` | Internal URL of `r2c-redis` |
| `LLM_PROVIDER` | yes | `openai` | `openai` |
| `OPENAI_API_KEY` | yes | — | your key |
| `OPENAI_MODEL` | no | `gpt-5-mini` | `gpt-5-mini` (not `gpt-5.5`) |
| `OPENAI_EMBEDDING_MODEL` | no | `text-embedding-3-small` | same |
| `ENVIRONMENT` | no | `development` | `production` |
| `SERVER_HOST` / `SERVER_PORT` | no | `0.0.0.0` / `8000` | bind `$PORT` via Docker Command instead |
| `DEBUG` / `LOG_LEVEL` | no | `true` / `INFO` | `false` / `INFO` |
| `GEMINI_*` / `ANTHROPIC_*` / `GROQ_*` | no | — | only if you switch `LLM_PROVIDER` |
| `CACHE_TTL` / `CACHE_MAX_SIZE` | no | `3600` / `1000` | defaults fine |
| `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` | no | `20` / `100` | defaults fine |

**Render notes:** override the Docker Command to bind `$PORT`
(`uvicorn app.main:app --host 0.0.0.0 --port $PORT`); health check path is `/health/`.

---

## Security checklist

- ✅ All `.env` files are **gitignored** — only `*.env.example` (placeholders) are committed.
- 🔑 If a real key ever lands in a commit, **rotate it** — git history is forever.
- 🔒 Always set a strong `JWT_ACCESS_SECRET` and a real `POSTGRES_PASSWORD` for any deploy.
- 🌐 On Render, set `NODE_ENV=production` on the backend or cross-domain login breaks.
