# NRDC R2C — Service Integration Report

How the 6 services of the NRDC Research-to-Commercialization (R2C) platform connect, and
the verified status of each integration. The whole stack is Dockerized and comes up with a
single `docker compose up --build`.

- **Date:** 2026-06-09
- **Topology:** 6 containers on one Compose network. The browser reaches the backend on the
  host; everything else talks over the internal Compose network by service name.

## Services (host port → container port)

| Service        | Image / Stack                                   | Host → Container | Role |
|----------------|-------------------------------------------------|------------------|------|
| `frontend`     | React/Vite built to static, served by nginx     | `5174` → `80`    | SPA; `VITE_API_URL` baked in at build time |
| `backend`      | Express + Prisma + TypeScript                   | `4001` → `4000`  | API gateway / orchestrator (Express `PORT=4000`) |
| `postgres`     | `pgvector/pgvector:pg16`                         | `55433` → `5432` | DBs `nrdc_r2c` (Prisma) + `sutra` (agents) |
| `redis`        | `redis:7-alpine`                                | `6380` → `6379`  | Cache for the SUTRA agents only |
| `matchmaking`  | FastAPI + `bge-base-en-v1.5` embeddings         | `8004` → `8004`  | Problem→papers semantic search |
| `ai-agents`    | FastAPI, 6 OpenAI "SUTRA" agents                | `8000` → `8000`  | Requirement/technology/compliance/etc. agents |

In-cluster the services address each other by Compose service name:
`backend → http://matchmaking:8004`, `backend → http://ai-agents:8000`,
`backend → postgres:5432`, `ai-agents → postgres:5432/sutra` + `redis:6379`.
The browser calls the backend at `http://localhost:4001/api/v1` (baked into the frontend
build via `VITE_API_URL`).

---

## 1. Architecture & Data Flow

```
                                  Browser (host)
                                       │
              REST + SSE over HTTP  ──►│  http://localhost:4001/api/v1
              (VITE_API_URL baked      │  (CORS allowed via CLIENT_ORIGIN)
               into the nginx build)   │
                                       ▼
┌──────────────┐   serves static   ┌──────────────────────────────────────────────┐
│  frontend    │◄───(nginx :80)────│                  backend                      │
│  React/Vite  │   host :5174      │            Express + Prisma (TS)              │
│  nginx       │                   │              host :4001 → :4000               │
└──────────────┘                   └───┬───────────┬───────────────┬──────────────┘
                                       │           │               │
                  Prisma               │           │ HTTP          │ HTTP
                  DATABASE_URL         │           │ MATCHMAKING_  │ SUTRA_AI_
                                       │           │ API_URL       │ API_URL
                                       ▼           ▼               ▼
                            ┌────────────────┐ ┌────────────┐ ┌──────────────────┐
                            │   postgres     │ │matchmaking │ │   ai-agents      │
                            │  pgvector:pg16 │ │  FastAPI   │ │ FastAPI (SUTRA)  │
                            │                │ │  + bge     │ │  6 OpenAI agents │
                            │ DB: nrdc_r2c   │ │            │ │                  │
                            │ DB: sutra ◄────┼─┼────────────┼─┤ SQLAlchemy       │
                            └────────────────┘ │            │ │ create_all       │
                                   ▲           │            │ │ (DB: sutra)      │
                       redis://    │           │            │ └───────┬──────────┘
                       redis:6379  │           │ PostgREST  │         │ OpenAI
                            ┌──────┴─────┐     │ RPC/HTTPS  │         │ chat+embeddings
                            │   redis    │     │ (publish-  │         ▼
                            │ 7-alpine   │     │  able key) │   ┌──────────────┐
                            │ (SUTRA     │     ▼            │   │  OpenAI API  │
                            │  cache)    │  ┌───────────────────────────┐
                            └────────────┘  │   Supabase  (cloud)       │
                                            │   PostgREST + pgvector     │
                                            │  RPC: match_papers_by_*    │
                                            │  60 papers, cosine search  │
                                            └───────────────────────────┘

Copilot path:  browser ──/copilot/chat (SSE)──► backend ──chat/completions (stream)──► OpenAI
```

**Two main flows the backend orchestrates:**

- **Smart-Match pipeline** (`POST /ai/problems/:id/run-pipeline`): runs two independent,
  fault-isolated blocks — (A) Matchmaking papers, and (B) SUTRA agents (extract requirement
  → discover technologies → for the top technologies: industry-fit + compliance +
  commercialization). A failure in one block does not discard the other's results.
- **Copilot** (`POST /copilot/chat`): the backend streams OpenAI chat completions back to the
  browser as Server-Sent Events, with role-scoped system prompts and optional grounding
  sources turned into citations.

---

## 2. Integration Matrix

Legend: ✅ verified end-to-end.

| # | From → To | Mechanism | Config (env var / URL) | Status |
|---|-----------|-----------|------------------------|--------|
| 1 | **Frontend ↔ Backend** | REST + SSE over HTTP | `VITE_API_URL=http://localhost:4001/api/v1` (build arg); CORS allowed via `CLIENT_ORIGIN` | ✅ **verified** — CORS preflight returns `204`; pages call `/matchmaking/match`, `/copilot/chat`, `/ai/problems/:id/run-pipeline` |
| 2 | **Backend ↔ PostgreSQL** | Prisma ORM | `DATABASE_URL=postgresql://postgres:***@postgres:5432/nrdc_r2c?schema=public` | ✅ **verified** — 34 tables present after the `ai_integration` migration; auth/login reads the `users` table |
| 3 | **Backend ↔ Matchmaking** | HTTP (`POST /match`) | `MATCHMAKING_API_URL=http://matchmaking:8004` | ✅ **verified** — both free-text (`problem_statement`) and `problemRef` returned real papers |
| 4 | **Backend ↔ AI Agents (SUTRA)** | HTTP — 6 agent passthrough routes + the pipeline orchestrator | `SUTRA_AI_API_URL=http://ai-agents:8000` | ✅ **verified** — full pipeline produced fit / compliance / commercialization. *Fixed the `/technology/match` query-param bug* (see note below) |
| 5 | **Backend ↔ Redis** | *(none — not a direct integration)* | — | ⚪ **N/A** — the Express backend does **not** use Redis (no `redis`/`ioredis` dependency, no references in `server/`). Redis is consumed only by the SUTRA agents |
| 6 | **Matchmaking ↔ Supabase** | PostgREST RPC over HTTPS, publishable key (no DB password) | `SUPABASE_URL`, `SUPABASE_KEY` (publishable); `service/supa.py` calls `/rest/v1/rpc/match_papers_by_problem` and `/rest/v1/rpc/match_papers_by_vector` | ✅ **verified** — 60 papers; cosine results returned |
| 7 | **Matchmaking ↔ pgvector** | Server-side cosine search inside Supabase pgvector, via the RPCs above | (same Supabase project) | ✅ **verified** — e.g. self-match cosine `1.000` |
| 8 | **AI Agents ↔ OpenAI** | OpenAI chat/completions (JSON mode) + embeddings | `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5-mini`, `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` (provider also supports gemini / anthropic / groq) | ✅ **verified** — extractor, discovery match-reasons, fit, compliance, commercialization, and citation all produced real output |
| 9 | **AI Agents ↔ PostgreSQL (`sutra` DB)** | SQLAlchemy `Base.metadata.create_all` on startup | `DATABASE_URL=postgresql://postgres:***@postgres:5432/sutra` | ✅ **verified** — startup `create_all` makes the 6 tables (CompanyProfile, TechnologyProfile, IndustryRequirement, CertificationProfile, MarketProfile, EvidenceSource) |
| 10 | **Copilot ↔ OpenAI** | Backend streams chat/completions (SSE to browser) | `COPILOT_PROVIDER=openai`, `COPILOT_MODEL=gpt-5.4`, `OPENAI_API_KEY` | ✅ **verified** — live token streaming |

### Note on the fixed `/technology/match` query-param bug (#4)

SUTRA's `/technology/match` endpoint takes `requirement_id` as a **query parameter** (a bare
`int` argument in FastAPI), **not** a JSON body. Sending a body returns `422 Unprocessable
Entity`. The backend's `discoverTechnologies()` was corrected to pass it as a query param
(`{ requirement_id }`) with no body. The Citation Verifier (`/evidence/verify`) is the same
shape: `claim`, `domain`, `sub_domain` are query params, not a body.

---

## 3. Model Notes

- **No `gpt-5.5` exists on this account.** (Note: the in-code default fallback in
  `aiConfig.openai.model` still literally reads `"gpt-5.5"`, but the deployed config always
  sets `COPILOT_MODEL=gpt-5.4`, so the fallback is never reached.)
- **`gpt-5.4` is the newest *streamable* chat model** and is what the **Copilot** uses
  (`COPILOT_MODEL=gpt-5.4`), because the Copilot streams tokens over SSE.
- **"pro" models reject the streaming chat endpoint**, so they cannot back the Copilot.
- **SUTRA agents use `gpt-5-mini` for speed.** Running the agents on `gpt-5.4` took roughly
  **30–60 s per agent call**, which is too slow for the multi-agent pipeline; `gpt-5-mini`
  keeps each call fast.
- **The provider omits `temperature` for `gpt-5` models.** Both the backend Copilot path and
  the SUTRA `OpenAIProvider` only send `temperature` for non-`gpt-5` models, and use
  `max_completion_tokens` (not `max_tokens`) for `gpt-5*` / `gpt-4o`.

---

## 4. Known Constraints

- **Matchmaking free-text needs the bge model.** Free-text matching embeds the query with
  `BAAI/bge-base-en-v1.5` before the pgvector search. That model is **baked into the
  matchmaking image**; without it, only registered-problem matching (`problemRef`, which uses
  a pre-stored embedding) works. (The backend has a Supabase-REST fallback for `problemRef`
  only; free text re-throws if the matchmaking service is down.)
- **SUTRA discovery requires an EXACT domain / sub_domain match** to the extractor's output.
  The Technology Discovery agent only returns technologies whose `domain` / `sub_domain`
  exactly match what the Requirement Extractor produced.
- **`technology_profiles` ships empty.** No seed technologies are loaded by default, so
  discovery returns nothing until technologies are seeded.
- **The pipeline runs `topTech=1` in the UI.** The Compliance agent is ~**60 s per
  technology**, so the UI deep-analyzes only the single top technology (fit + compliance +
  commercialization) to keep the run responsive. (The API itself allows `topTech` up to 10;
  the orchestrator default is 3.)
- **SUTRA needs a direct Postgres connection.** The agents connect to the `sutra` DB over
  SQLAlchemy/`DATABASE_URL`; the Supabase **publishable key cannot be used** for this — it is
  only sufficient for the matchmaking service's PostgREST RPC path.

---

## Appendix — Source references

- Compose / wiring: `docker-compose.yml`, `.env`
- Backend AI config: `Comprehensiveproductwireframesystem/backend/server/services/aiConfig.ts`
- Matchmaking client (+ Supabase REST fallback): `.../server/services/matchmaking.service.ts`, `.../server/services/supabaseMatch.service.ts`
- SUTRA client (query-param fixes): `.../server/services/sutra.service.ts`
- Pipeline orchestrator: `.../server/services/pipeline.service.ts`
- Copilot SSE streaming: `.../server/services/copilot.service.ts`
- API routes: `.../server/routes/ai.routes.ts`
- Matchmaking service: `AI 2/Matchmaking_problem_to_papers/service/main.py`, `.../service/supa.py`
- AI-agents config / providers / DB / models: `AI r2c/AI-team/app/config.py`, `.../app/services/llm_service.py`, `.../app/database.py`, `.../app/models/__init__.py`, `.../app/main.py`
