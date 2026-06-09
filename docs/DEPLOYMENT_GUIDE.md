# NRDC R2C — Deployment Guide

Run the entire NRDC R2C stack with **one command** using Docker Compose.

---

## 1. Overview

NRDC R2C is a 6-service stack orchestrated by a single `docker-compose.yml`:

| Service | Tech | Role |
| --- | --- | --- |
| **frontend** | React build served by **nginx** | Web UI |
| **backend** | **Express + Prisma** | REST API (`/api/v1`); runs DB migrations + seed on boot |
| **postgres** | `pgvector/pgvector:pg16` | Two databases: `nrdc_r2c` (Prisma) and `sutra` (AI agents) |
| **redis** | `redis:7-alpine` | Cache for the SUTRA agents |
| **matchmaking** | **FastAPI** + **bge** embeddings | Embeds a problem statement and matches it against papers in **Supabase pgvector** (via REST RPCs) |
| **ai-agents** | **FastAPI**, **6 OpenAI agents** (SUTRA) | Multi-agent analysis pipeline; auto-creates its 6 tables |

Everything starts together with **Docker Compose** — no per-service setup required.

---

## 2. Prerequisites

- **Docker Desktop** with **Compose v2** (the `docker compose` subcommand, not the legacy `docker-compose` binary).
- **~6–8 GB free disk.** The `matchmaking` image bakes in **torch** plus the **bge** embedding model, so it is large.
- **Internet access**, needed to:
  - pull base images,
  - **download the bge model at build time**, and
  - call **OpenAI** and **Supabase** at runtime.

---

## 3. Configure

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

At minimum set `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_KEY`. The host ports are optional to change.

### Variables in `.env.example`

**Host ports** (left side of each port mapping; change to avoid conflicts):

| Variable | Default | What it maps |
| --- | --- | --- |
| `FRONTEND_PORT` | `5174` | nginx (container port 80) |
| `BACKEND_PORT` | `4001` | Express API (container port 4000) |
| `MATCHMAKING_PORT` | `8004` | Matchmaking FastAPI (8004) |
| `AI_AGENTS_PORT` | `8000` | SUTRA AI agents FastAPI (8000) |
| `POSTGRES_PORT` | `55433` | PostgreSQL (5432) |
| `REDIS_PORT` | `6380` | Redis (6379) |

> The standard/default-looking ports (`5173`/`4000`/`55432`) are intentionally **avoided** to dodge common conflicts. You can move to those if you prefer, but watch for a stale stack already holding them (see Troubleshooting).

**Secrets / config:**

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | `postgres` | Postgres superuser password (user is `postgres`). Used in both `DATABASE_URL`s. |
| `JWT_ACCESS_SECRET` | `change-me-in-production` | Signing secret for backend access tokens. **Change for any real deployment.** |
| `OPENAI_API_KEY` | `sk-proj-your-openai-key` | OpenAI key used by both the **Copilot** (backend) and the **SUTRA agents**. **Required** for AI features. |
| `COPILOT_MODEL` | `gpt-5.4` | Chat model for the Copilot. |
| `SUTRA_OPENAI_MODEL` | `gpt-5-mini` | Faster model the 6 SUTRA agents use. |
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` | Supabase project URL (matchmaking corpus: 60 papers + pgvector). **Required** for Smart Match. |
| `SUPABASE_KEY` | `sb_publishable_xxx` | Supabase **publishable** key — enough for matching (REST RPCs). A DB password is **not** required for the matchmaking path. |

### OpenAI model notes

- This account has **no `gpt-5.5`**. Do not set it.
- **Copilot** uses **`gpt-5.4`** — the newest model that streams via `chat/completions`.
- **SUTRA agents** use **`gpt-5-mini`** (faster).
- Any model you set must be a **real chat model** available to your key.

---

## 4. Run

From the folder that contains `docker-compose.yml`, run:

```bash
docker compose up --build
```

- Add **`-d`** to run detached (in the background): `docker compose up --build -d`.
- **The first build is slow** — it installs torch and **downloads the bge model**. Subsequent builds use the cache and are fast.

### Startup order

Compose health/dependency conditions enforce this sequence:

1. **postgres** + **redis** start and become healthy.
2. In parallel:
   - **backend** boots and auto-runs **`prisma migrate deploy` + seed** (waits for postgres healthy),
   - **ai-agents** boots and **auto-creates its 6 tables** (waits for postgres healthy + redis started),
   - **matchmaking** boots.
3. **frontend** starts once the **backend is healthy**.

---

## 5. Service URLs

Using the default ports from `.env.example`:

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:4001/api/v1  — health: http://localhost:4001/api/v1/health |
| Matchmaking | http://localhost:8004/health  — docs: http://localhost:8004/docs |
| AI agents (SUTRA) | http://localhost:8000/  — health: http://localhost:8000/health/  — OpenAPI: http://localhost:8000/docs |
| Postgres | `localhost:55433` — user `postgres` / password from `POSTGRES_PASSWORD`; databases `nrdc_r2c`, `sutra` |
| Redis | `localhost:6380` |

> If you changed any `*_PORT` in `.env`, substitute accordingly.

---

## 6. Default credentials (seeded)

The backend seed creates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Researcher | `dr.smith@university.edu` | `password` |
| Admin | `admin@nrdc.org` | `password` |
| Industry | `mark.wilson@pharmatech.com` | `password` |
| Additional industry users | `*@nrdc-r2c.demo` | `test1234` |

---

## 7. Verify

Run the bundled health check (prints **PASS/FAIL** per service):

```bash
bash scripts/healthcheck.sh
```

### Curl examples

**1) Log in and capture the token:**

```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.smith@university.edu","password":"password"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "$TOKEN"
```

**2) Run a match using the Bearer token:**

```bash
curl -s -X POST http://localhost:4001/api/v1/matchmaking/match \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"problemStatement":"Improve catalyst efficiency for green hydrogen production"}'
```

---

## 8. Using the AI features

- **Copilot** is live and uses **`gpt-5.4`**.
- **Smart Match** returns **real Supabase papers** (matched via the matchmaking service against the pgvector corpus).
- **Problem Statements → "Run AI Analysis"** runs the full **6-agent SUTRA pipeline** (takes **~2 minutes**).
  - It works best for a **Renewable Energy / Green Hydrogen** problem, because the **sample technologies are seeded in that domain**.
  - To analyze **other domains**, first register technologies in the SUTRA service:

    ```bash
    curl -X POST http://localhost:8000/technology/register \
      -H "Content-Type: application/json" \
      -d '{ ... your technology payload ... }'
    ```

    (See the SUTRA OpenAPI docs at http://localhost:8000/docs for the exact schema.)

---

## 9. Operations

| Action | Command |
| --- | --- |
| List services / status | `docker compose ps` |
| Tail logs for a service | `docker compose logs -f <service>` |
| Stop the stack, **keep data** | `docker compose down` |
| Stop the stack, **wipe DB volumes** | `docker compose down -v` |
| Rebuild a single service | `docker compose up --build <service>` |

Service names: `frontend`, `backend`, `postgres`, `redis`, `matchmaking`, `ai-agents`.

> `docker compose down -v` removes the named volumes `nrdc_pg_data` and `nrdc_backend_storage` — the database and uploaded storage will be lost and re-seeded on next boot.

---

## 10. Troubleshooting

**Port conflicts.** Change the offending `*_PORT` in `.env` and bring the stack back up. Note that a **stale older stack** may still be holding `4000`, `5173`, or `55432`; stop it (or pick different ports).

**OpenAI errors.** Check the `OPENAI_API_KEY` and the model values. The model must be a **real chat model** available to your key — **there is no `gpt-5.5`**. Copilot expects `gpt-5.4`; agents expect `gpt-5-mini`.

**Supabase matching returns empty.** Verify `SUPABASE_URL` and `SUPABASE_KEY` are set correctly (publishable key is sufficient). Without them, Smart Match has no corpus to query.

**AI Analysis comes back empty for a domain.** That domain likely has **no seeded technologies**. Register technologies via `POST http://localhost:8000/technology/register`, then re-run the analysis. (Renewable Energy / Green Hydrogen is seeded out of the box.)

**First matchmaking request is slow.** This only happens if the **bge model was not baked** into the image — normally it is downloaded at build time, so runtime requests are fast. If you see this, rebuild the `matchmaking` image.
