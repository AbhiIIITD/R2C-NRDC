# NRDC R2C — AI Integration Master Plan

> **Status:** Phase 1 (Architecture Analysis) complete. Phases 2–10 specified below as the execution blueprint.
> **Scope:** Wire the **Matchmaking Engine** (FastAPI :8004) and **SUTRA AI Agents** (FastAPI :8000) end‑to‑end into the NRDC R2C platform (Express/Prisma backend + React/Vite frontend), replace all remaining mock/localStorage logic, and build the missing Smart‑Match + AI Copilot experiences.

---

## 0. System Map (as‑is)

```
                        ┌──────────────────────────────────────────────┐
                        │  NRDC R2C PLATFORM (this repo)                │
                        │                                              │
  React + Vite :5173 ───┼─► Express + Prisma :4000  (/api/v1)          │
   (mostly built,       │        │                                     │
    partly mock)        │        └─► PostgreSQL (Prisma)               │
                        └──────────────────────│───────────────────────┘
                                               │  NEW: backend proxy layer (BFF)
                          ┌────────────────────┼────────────────────┐
                          ▼                                         ▼
            ┌──────────────────────────┐            ┌──────────────────────────────┐
            │ Matchmaking Engine :8004 │            │ SUTRA AI Agents :8000        │
            │ FastAPI + pgvector       │            │ FastAPI + OpenAI/Gemini      │
            │ bge-base-en-v1.5 (768d)  │            │ 6 agents + pgvector          │
            │ POST /match              │            │ /company/analyze             │
            │ Supabase RPC             │            │ /technology/match …          │
            │   match_papers_by_problem│            │ /technology/compliance …     │
            └──────────────────────────┘            └──────────────────────────────┘
                          │                                         │
                          └──────────────► Supabase (Postgres + pgvector) ◄────────┘
```

**Integration principle:** the React app never calls the Python services directly. The **Express backend acts as the BFF / proxy** — it owns auth (JWT), RBAC, DTO validation, caching, retries, logging, and persistence of AI outputs into Prisma. This keeps API keys server‑side and gives us one consistent `/api/v1` surface.

---

## PHASE 1 — ARCHITECTURE ANALYSIS

### 1.1 Current frontend pages (`frontend/src/app/pages`)

| Role | Pages |
|------|-------|
| **public** | `LandingPage`, `LoginPage`, `SignupPage`, `ForgotPasswordPage` |
| **researcher** | `ResearcherDashboard`, `UploadResearchWizard`, `MyStudies`, `StudyDetails`, `ResearcherLicenseRequests`, `ResearcherAICopilot`, `ResearcherNotifications`, `ResearcherProfile` |
| **industry** | `IndustryDashboard`, `Marketplace`, `TechnologyDetail`, `ProblemStatements`, **`SmartMatch`**, `MeetingCenter`, `MeetingRequestForm`, `MeetingSummary`, `LicensingCenter`, `LicenseRequestDetail`, `IndustryAICopilot`, `IndustryNotifications`, `IndustryProfile` |
| **admin** | `AdminDashboard`, `ReviewQueue`, `StudyReviewDetail`, `MeetingManagement`, `MeetingDetail`, `LicensingManagement`, `AdminLicenseDetailView`, `InterestsExpressed`, `InterestDetail`, `ProblemStatementReview`, `AdminAICopilot`, `AuditLogs`, `AnalyticsDashboard`, `AdminProfile`, `AdminNotifications` |

Routing: `frontend/src/app/routes.tsx` (`createBrowserRouter`), role‑guarded by `ProtectedRoute requiredRoles={[...]}`. Layouts per role in `app/layouts/`.

**Observation:** `SmartMatch`, `ProblemStatements`, and the three `*AICopilot` pages already exist as **shells/mocks** — they are the primary integration targets, not greenfield.

### 1.2 Current backend routes (`backend/server/index.ts`, single `express.Router()` mounted at `/api/v1`)

- **Auth:** `POST /auth/signup|login|logout|refresh|forgot-password`, `GET /auth/me`
- **Studies:** `POST /studies`, `GET /studies`, `GET /studies/:id`, `PATCH /studies/:id/submit`, `POST /studies/:id/:decision`, `POST /studies/:id/documents`
- **Marketplace:** `GET /marketplace/technologies`, `GET /marketplace/domains`, `POST /technologies/:id/interests`
- **Interests:** `GET /interests`, `PATCH /interests/:id/status`
- **Problem statements:** `POST|GET /problem-statements`, `PATCH|DELETE /problem-statements/:id`
- **Meetings:** `POST|GET /meetings`, `PATCH /meetings/:id/{schedule,complete,cancel,status}`
- **Licenses:** `POST|GET /licenses`, `PATCH /licenses/:id/{status,advance,reject,execute,commercialize}`, `POST /licenses/:id/agreement`, `POST /licenses/:id/signed-agreement`, downloads
- **Notifications:** `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`
- **Audit/analytics:** `GET /audit-logs`, `GET /analytics/metrics`
- **Files:** `GET /files/:id/download`

Cross‑cutting helpers live in `server/lib.ts` (`ApiError`, `requireAuth`, `requireRole`, JWT, audit, notify). Config in `server/config.ts`. Prisma client in `server/prisma.ts`.

### 1.3 Existing Prisma schema (`backend/prisma/schema.prisma`, 404 lines)

Enums: `UserRole`, `UserStatus`, `StudyStatus`, `ReviewStatus`, `InterestStatus`, `MeetingStatus`, `LicenseStatus`, `AgreementFileKind`.
Models: `Company`, `CompanyOnboardingSubmission`, `User`, `Session`, `Study`, `StudyDocument`, `StudyReview`, `ReviewComment`, `MarketplaceListing`, `Interest`, **`ProblemStatement`**, `Meeting`, `MeetingParticipant`, `LicenseRequest`, `LicenseApproval`, `Agreement`, `AgreementFile`, `FileObject`, `CommercializationRecord`, `Notification`, `AuditLog`.

> `ProblemStatement` **already exists** but is a flat industry‑authored form (no AI‑extracted structure, no link to matches). It will be **extended**, not replaced.

### 1.4 Existing services

**Backend:** logic is inline in `index.ts` (no service layer yet). **Action:** introduce `backend/server/services/` for the AI integrations (clean seam, testable).

**Frontend (`frontend/src/services/`):** `api.ts` (real fetch client w/ JWT + refresh + `status` normalization), plus `study/marketplace/meeting/license/notification/analytics.service.ts`. **The latter six are mock** — `setTimeout` + `localStorage` (`app_studies`, etc.). `contexts/AppDataContext.tsx` already calls the **real** API and only falls back to mock on failure → the app is a **hybrid**.

### 1.5 Missing integrations

1. **No connection to Matchmaking (:8004)** — no `/match` call anywhere; `SmartMatch` is a shell.
2. **No connection to SUTRA (:8000)** — none of the 6 agents are invoked; AI copilots are static; "AI Field Extraction" in the upload wizard is UI‑only.
3. **No persistence of AI outputs** — match results, fit/compliance/commercialization reports, citations, copilot history are not stored.
4. **No backend proxy/service layer, no AI env wiring, no caching of expensive AI/embedding calls.**

### 1.6 Missing UI screens / workflows

- Industry: `/industry/problem/:id` (problem detail + extracted structure), `/industry/matches`, `/industry/match/:id` (full Smart‑Match result dashboard). `SmartMatch` needs to become a real results board.
- Admin: `/admin/problems`, `/admin/matches` (oversight of AI matching).
- Researcher: `/researcher/matches` (where my studies/papers surfaced as matches).
- A **real, streaming AI Copilot** for all three roles (currently static).
- Visualization components (score cards, fit/readiness/compliance charts) — none exist.

### 1.7 Missing API endpoints (to be added under `/api/v1`)

```
POST /ai/extract-requirements          (SUTRA: /company/analyze)
POST /ai/discover-technologies         (SUTRA: /technology/match)
POST /ai/industry-fit                  (SUTRA: /technology/industry-fit)
POST /ai/compliance                    (SUTRA: /technology/compliance)
POST /ai/commercialization             (SUTRA: /technology/license)
POST /ai/citation-verification         (SUTRA: /evidence/verify)
POST /matchmaking/match                (Matchmaking: /match  | ad-hoc text)
POST /matchmaking/problem/:id          (Matchmaking: saved problem ref / RPC)
POST /copilot/chat                     (LLM, streaming, role-scoped, w/ history+citations)
GET  /copilot/sessions, /copilot/sessions/:id   (history)
POST /ai/problems/:id/run-pipeline     (orchestrates the full Phase-4 workflow)
GET  /matches, GET /matches/:id        (read persisted match results)
```

### 1.8 Missing database entities (Phase 2)

`ResearchPaper`, `MatchResult` (+`ResearchMatch` join), `IndustryRequirement`, `TechnologyRecommendation`, `TechnologyFitEvaluation`, `ComplianceReport`, `CommercializationReport`, `CitationVerification`, `AIAgentExecution` (telemetry/audit of every AI call), `Conversation` + `CopilotSession` (chat). Plus a `ProblemStatement` extension linking to its requirement/matches and a `processingStatus`.

---

## PHASE 2 — DATABASE DESIGN

New Prisma models (full definitions in the schema PR). Conventions for **every** new model: `id @default(cuid())`, `createdAt @default(now())`, `updatedAt @updatedAt`, soft delete via `deletedAt DateTime?` (+ `@@index`), and FK‑indexed relations.

| Model | Purpose | Key links |
|-------|---------|-----------|
| `IndustryRequirement` | SUTRA‑extracted structured need (domain, subDomain, problemStatement, technologyNeeded, keywords[], requiredTrl, deploymentScale, raw JSON) | `problemStatementId`, `companyId` |
| `ResearchPaper` | Cache of papers returned by Matchmaking (`seedRef` unique, title, subDomain, abstract, doi, year, externalSource) | — |
| `MatchResult` | One matching run for a problem (engine, topN, model, status, summary) | `problemStatementId` |
| `ResearchMatch` | Join: paper ↔ match with `cosine`, `rank`, `whyItFits` | `matchResultId`, `researchPaperId` |
| `TechnologyRecommendation` | SUTRA discovery output (name, matchScore, reasons[], trl, patentStatus) | `problemStatementId` |
| `TechnologyFitEvaluation` | Fit level/score/strengths/risks/confidence | `recommendationId` |
| `ComplianceReport` | Required/missing certs, approval status, recommendations, regulators[] | `problemStatementId` / `recommendationId` |
| `CommercializationReport` | License type, transfer timeline, readiness, roadmap, **quickLicense** + **patentBuyout** flags | `problemStatementId` |
| `CitationVerification` | Claim, verified answer, confidence, status, sources[] | `reportId?` |
| `AIAgentExecution` | Telemetry: agent name, provider, model, input/output JSON, latency, tokens, status, error — audit + cost | `actorId`, polymorphic `relatedType/relatedId` |
| `CopilotSession` | A chat session (role, title, lastMessageAt) | `userId` |
| `Conversation` | One message (role: user/assistant/system, content, citations JSON, tokens) | `sessionId` |

`ProblemStatement` gains: `requirementId?`, `processingStatus` (`DRAFT|EXTRACTING|MATCHING|ANALYZING|COMPLETE|FAILED`), `deletedAt`, relations to the above.

**Migrations:** generated via `prisma migrate dev` → `backend/prisma/migrations/<ts>_ai_integration/`.

---

## PHASE 3 — BACKEND INTEGRATION

New layer `backend/server/services/` (no external dep beyond a fetch wrapper):

| Service | Talks to | Notes |
|---------|----------|-------|
| `httpClient.ts` | — | fetch w/ timeout, **exponential‑backoff retries**, structured logging, error normalization |
| `aiCache.ts` | Prisma | content‑hash cache of AI/embedding responses (TTL) to cut cost/latency |
| `MatchmakingService` | :8004 `/match`, RPC | ad‑hoc + saved‑problem paths; persists `ResearchPaper`/`MatchResult`/`ResearchMatch` |
| `RequirementExtractionService` | SUTRA `/company/analyze` | persists `IndustryRequirement` |
| `TechnologyDiscoveryService` | SUTRA `/technology/match` | persists `TechnologyRecommendation` |
| `IndustryFitService` | SUTRA `/technology/industry-fit` | persists `TechnologyFitEvaluation` |
| `ComplianceService` | SUTRA `/technology/compliance` | persists `ComplianceReport` |
| `CommercializationService` | SUTRA `/technology/license` | persists `CommercializationReport` (+ derive quick‑license / patent‑buyout) |
| `CitationVerificationService` | SUTRA `/evidence/verify` | persists `CitationVerification` |
| `AIService` | OpenAI/Gemini | copilot chat (streaming) + orchestration; logs every call to `AIAgentExecution` |

Cross‑cutting: **Zod DTOs** per endpoint, `requireAuth`+`requireRole` RBAC, try/catch → `ApiError`, request/response logging, retries in `httpClient`, cache in `aiCache`. New `.env` keys:

```
OPENAI_API_KEY=        GEMINI_API_KEY=
MATCHMAKING_API_URL=   MATCHMAKING_API_KEY=
SUTRA_AI_API_URL=      SUTRA_AI_API_KEY=
SUPABASE_URL=          SUPABASE_KEY=
COPILOT_PROVIDER=openai   COPILOT_MODEL=gpt-5.5
```

---

## PHASE 4 — INDUSTRY PROBLEM WORKFLOW (orchestration)

`POST /api/v1/ai/problems/:id/run-pipeline` runs (and persists each step, updating `ProblemStatement.processingStatus`):

```
Create Problem Statement
  → RequirementExtractionService (SUTRA)          → IndustryRequirement
  → MatchmakingService (/match or RPC)            → MatchResult + ResearchMatch[]
  → TechnologyDiscoveryService (SUTRA)            → TechnologyRecommendation[]
  → IndustryFitService                            → TechnologyFitEvaluation[]
  → ComplianceService                             → ComplianceReport
  → CommercializationService                      → CommercializationReport
                                                     ├─ Quick‑License recommendation
                                                     └─ Patent‑Buyout recommendation
```

Steps are resumable and idempotent (cache‑keyed); partial failures leave the problem in `FAILED` with the failing stage recorded in `AIAgentExecution`.

---

## PHASE 5 — SMART MATCH DASHBOARD (frontend)

New/real routes:

- Industry: `/industry/problems` (list+create), `/industry/problem/:id` (form + **AI extraction preview**), `/industry/matches`, `/industry/match/:id` (full result board: match scores, top papers, tech recs, quick‑license & patent‑buyout, compliance, commercialization readiness).
- Admin: `/admin/problems`, `/admin/matches` (oversight).
- Researcher: `/researcher/matches` (my studies surfaced as matches).

### PHASE 6 — AI COPILOT
Real, **streaming** copilot per role (`/copilot/chat` SSE), with **chat history** (`CopilotSession`/`Conversation`), **citations**, and source references. Role‑specific system prompts: Researcher (commercialization/licensing/publication/TRL), Industry (discovery/market/compliance/licensing), Admin (review/recommendations/matchmaking insight). Wires `ResearcherAICopilot`, `IndustryAICopilot`, `AdminAICopilot`.

### PHASE 7 — VISUALIZATION COMPONENTS
`MatchScoreCard`, `TechnologyFitCard`, `ComplianceCard`, `CommercializationCard`, `ResearchPaperCard`, `PatentOpportunityCard`, `LicenseOpportunityCard`, plus `recharts` gauges for fit/readiness/commercialization/compliance scores. Modular, in `frontend/src/components/ai/`.

### PHASE 8 — FRONTEND CLEANUP
Replace the **199 localStorage/mock occurrences** (18 files) — kill the six mock `*.service.ts` and `lib/mockData.ts`. Introduce **React Query**: `src/api/` (typed clients over `api.ts`), `src/hooks/`, `src/query/` (keys + query/mutation hooks). Every page reads from React Query, not localStorage.

### PHASE 9 — MISSING FEATURES
Standardized loading / error / empty states, pagination, filters, sorting, search, notifications, audit logs, activity timeline — applied across new AI screens and back‑filled where missing.

### PHASE 10 — DELIVERABLES
Updated folder structure, schema + migrations, endpoints, services, pages, components, hooks, API clients, route updates, `.env` template, **deployment guide**, and **integration guide** (`docs/AI_INTEGRATION_GUIDE.md`).

---

## Key architecture decisions (confirm before Phase 2 code)

1. **DB strategy** — point Prisma `DATABASE_URL` at the **same Supabase Postgres** the AI services use (one DB, Prisma tables alongside the AI tables) vs. keep a separate platform Postgres and only call the AI services over HTTP.
2. **AI service connectivity** — are :8004 / :8000 deployed at stable URLs (set via `*_API_URL`) or local‑only for now?
3. **Copilot LLM** — drive `/copilot/chat` directly from the Express backend via `OPENAI_API_KEY` (GPT‑5.5), or route copilot through the SUTRA service?

> These are config/seam decisions; the model and service designs above hold either way.
</content>
</invoke>
