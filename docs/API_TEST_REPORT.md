# NRDC R2C Backend — API Test Report

**Project:** NRDC Research-to-Commercialization (R2C) Platform
**Component:** Backend REST API (Express + Prisma + SUTRA/AI services)
**Base URL prefix:** `/api/v1`
**Report date:** 2026-06-09
**Sources enumerated:**
- `Comprehensiveproductwireframesystem/backend/server/index.ts`
- `Comprehensiveproductwireframesystem/backend/server/routes/ai.routes.ts`

All endpoints return a standard envelope. On success: `{ "success": true, "data": <payload> }`. On error the global error handler returns `{ "success": false, "error": { "code": <string>, "message": <string> } }`.

---

## 1. Summary

The API exposes **51 endpoints** across 14 functional areas. Authentication is JWT-based: a short-lived access token is sent as `Authorization: Bearer <token>`, and a long-lived refresh token is stored in an httpOnly cookie. All routes registered after `api.use(authenticate)` require a valid access token; a subset additionally enforce role-based access control via `requireRole(...)`.

| Area | # Endpoints | Auth | Notes |
|---|---|---|---|
| Auth | 7 | Public (5) / Bearer (1) / Cookie (1) | Login, signup, refresh, logout, forgot-password, `/auth/me`. `/health` is also public. |
| Health | 1 | Public | Liveness probe. |
| Studies | 6 | Bearer; RESEARCHER/ADMIN for writes | Researcher CRUD + admin review decisions + document upload. |
| Review / Publish | 1 | ADMIN | `approve` / `publish` / `reject` / `request-changes` (one parameterized route). |
| Marketplace | 2 | INDUSTRY/ADMIN | Published-technology browse + domain facets. |
| Interests | 3 | Bearer; INDUSTRY create, ADMIN status | Industry expresses interest; admin updates status. |
| Problem Statements | 4 | Bearer; INDUSTRY write | Industry CRUD of R&D problem statements. |
| Meetings | 4 | Bearer; INDUSTRY/ADMIN create, ADMIN lifecycle | Scheduling between industry and researcher. |
| Licensing | 11 | Bearer; role-gated per stage | Full tripartite licensing workflow incl. agreement generation/signing. |
| Files | 1 | Bearer (ownership/role checks) | Authenticated download of study/agreement files. |
| Notifications | 3 | Bearer | List + mark-read + mark-all-read (per-user). |
| Audit | 1 | ADMIN | Last 200 audit-log entries. |
| Analytics | 1 | ADMIN | Aggregate platform metrics. |
| AI — SUTRA agents | 6 | INDUSTRY/ADMIN (citation: any auth) | Requirement extraction, discovery, fit, compliance, commercialization, citation. |
| AI — Matchmaking | 2 | RESEARCHER/INDUSTRY/ADMIN | Paper matchmaking (free-text/ref) + persisted per-problem match. |
| AI — Pipeline & Matches | 5 | Bearer; INDUSTRY/ADMIN for run | 6-agent pipeline, report retrieval, matches feed, researcher opportunities. |
| AI — Copilot | 4 | Bearer | SSE streaming chat + session management. |

**Status legend:** ✅ Verified = exercised end-to-end against the running stack this session. "Not individually load-tested this run" = present and documented from source, but not separately invoked in this session.

---

## 2. Auth & RBAC

### 2.1 Token model
- **Access token (JWT):** issued by `signAccessToken(user)` on login / signup / refresh. Sent by the client on every protected request as `Authorization: Bearer <accessToken>`. Carries `userId`, `role`, and `companyId` (surfaced on `req.auth`).
- **Refresh token (httpOnly cookie):** `refreshToken` cookie set via `refreshCookie()` with `httpOnly: true`, `sameSite: "lax"`, `secure` in production, `maxAge = refreshDays * 86400000`. The raw token is never returned in JSON; only its SHA-256 hash (`hashToken`) is stored in the `Session` table. Refresh rotates the token (old hash replaced) on every `/auth/refresh`.
- **Logout:** revokes the session (`revokedAt`) matching the cookie hash and clears the cookie.

### 2.2 Middleware ordering (defense in depth)
In `index.ts` the public routes (`/health`, `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`) are declared **before** the line `api.use(authenticate)`. `/auth/me` registers `authenticate` explicitly. Every route after that line — Studies, Marketplace, Interests, Problem Statements, Meetings, Licensing, Files, Notifications, Audit, Analytics, and all AI routes (`registerAiRoutes(api)`) — inherits global `authenticate`. A missing/invalid token therefore yields `401` before any handler runs.

### 2.3 Roles
Three roles in `UserRole`: **RESEARCHER**, **INDUSTRY**, **ADMIN**. The JSON API lowercases roles in `publicUser` (`researcher` / `industry` / `admin`).

- `requireRole(...allowed)` rejects with **403 FORBIDDEN** when `req.auth.role` is not in the allowed set.
- Several handlers add row-level ownership checks beyond role (e.g. a researcher may only read/modify their own study; an industry user may only act within their own `companyId`).
- Industry users acting on company-scoped resources must be linked to a company; `requireCompany(companyId)` throws **403 COMPANY_REQUIRED** otherwise.

### 2.4 Refresh-on-401 pattern
The intended client flow: when a protected call returns `401` (expired access token), the client silently calls `POST /auth/refresh` (browser sends the httpOnly cookie automatically), receives a fresh `accessToken`, and retries the original request. If refresh itself returns `401` (`REFRESH_REQUIRED` / `INVALID_REFRESH`), the client must re-authenticate via `/auth/login`.

---

## 3. Validation & error handling

### 3.1 Validation
Request bodies, params, and selected query fields are validated with **Zod**. Both `index.ts` and `ai.routes.ts` define a `parse(schema, input)` helper that runs `safeParse`; on failure it throws `new ApiError(400, "VALIDATION_ERROR", <first issue message>)`. So malformed input deterministically yields **400 VALIDATION_ERROR** with the first failing field's message.

### 3.2 ApiError codes
Errors are raised as `ApiError(status, code, message)` and serialized by a single global error handler:

```js
app.use((error, _req, res, _next) => {
  const status = error instanceof ApiError ? error.status : 500;
  const code   = error instanceof ApiError ? error.code   : "INTERNAL_ERROR";
  if (status === 500) console.error(error);
  res.status(status).json({
    success: false,
    error: { code, message: status === 500 ? "Internal server error" : error.message },
  });
});
```

Note: for unexpected (500) errors the message is masked to `"Internal server error"` and the real error is logged server-side; for all `ApiError`s the real message is returned.

Observed / source-declared codes:

| HTTP | Code | Meaning / where raised |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod validation failure (any validated endpoint); also matchmaking "provide problemStatement or problemRef". |
| 400 | `FILE_REQUIRED` | Multipart upload expected but no file (study documents, signed agreement). |
| 400 | `COMPANY_REQUIRED` | Meeting creation without a resolvable company. |
| 400 | `COMPANY_META_REQUIRED` | `/ai/extract-requirements` called with neither `sutraCompanyId` nor `companyMeta`. |
| 401 | `INVALID_CREDENTIALS` | Bad email/password or inactive user on login. |
| 401 | `REFRESH_REQUIRED` | `/auth/refresh` with no cookie. |
| 401 | `INVALID_REFRESH` | Refresh token missing/revoked/expired. |
| 403 | `FORBIDDEN` | `requireRole` denial, or row-level ownership failure. |
| 403 | `COMPANY_REQUIRED` | Industry user not linked to a company (`requireCompany`). |
| 403 | `CORS_FORBIDDEN` | Origin not in allow-list. |
| 404 | `NOT_FOUND` | Resource missing, action not in allow-list, or unmatched endpoint (catch-all). |
| 409 | `ALREADY_EXISTS` | Duplicate email/company on signup (Prisma P2002). |
| 409 | `TIER_SPEC_REQUIRED` | Industry signup with tier data (onboarding disabled). |
| 409 | `INVALID_TRANSITION` | Illegal study/license/meeting state change. |
| 502 | `AI_UPSTREAM_ERROR` | Upstream SUTRA / model service failure (raised by AI service/HTTP layer; surfaced through AI routes). |
| 500 | `INTERNAL_ERROR` | Uncaught exception (message masked). |

---

## 4. Endpoints by area

> RBAC column: "Bearer" = any authenticated user; otherwise the allowed roles. Ownership/scoping notes are inline.

### 4.1 Auth

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` | `{ accessToken, user }` + sets refresh cookie | ✅ Verified |
| POST | `/auth/signup` | Public | `{ email, password(min8), name, role: researcher\|industry, organization, tier?, tierData? }` | `201` `{ accessToken, user }` | Not individually load-tested this run |
| POST | `/auth/refresh` | Refresh cookie | (cookie only) | `{ accessToken, user }` + rotates cookie | Not individually load-tested this run |
| POST | `/auth/logout` | Refresh cookie | (cookie only) | `null` + clears cookie | Not individually load-tested this run |
| POST | `/auth/forgot-password` | Public | `{ email }` | `{ message }` (always generic) | Not individually load-tested this run |
| GET | `/auth/me` | Bearer | — | `user` object | ✅ Verified |

Industry signup with `tier`/`tierData` is intentionally rejected with **409 TIER_SPEC_REQUIRED** (tier onboarding disabled).

### 4.2 Health

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/health` | Public | — | `{ status: "ok" }` | ✅ Verified |

### 4.3 Studies

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/studies` | Bearer (role-scoped) | query: `q?`, `status?`, `domain?` | `Study[]` (researcher: own; industry: PUBLISHED only) | ✅ Verified |
| GET | `/studies/:id` | Bearer (ownership/publish gate) | — | `Study` (+ documents) | Not individually load-tested this run |
| POST | `/studies` | RESEARCHER | multipart: `title, abstract, domain, trl(1-9), keywords[], status: draft\|submitted, …` + optional `file` | `201` `Study` | Not individually load-tested this run |
| POST | `/studies/:id/documents` | RESEARCHER (owner) | multipart `file` (required) | `201` `StudyDocument` (+ file) | Not individually load-tested this run |
| PATCH | `/studies/:id/submit` | RESEARCHER (owner) | — | `Study` (status → SUBMITTED) | Not individually load-tested this run |

### 4.4 Review / Publish

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/studies/:id/:decision` | ADMIN | `:decision ∈ {approve, publish, reject, request-changes}`; body `{ reason? }` for reject | `Study` (transitioned; publish also upserts marketplace listing) | Not individually load-tested this run |

Invalid `:decision` → **404 NOT_FOUND**. Publishing a non-reviewable study → **409 INVALID_TRANSITION**.

### 4.5 Marketplace

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/marketplace/technologies` | INDUSTRY, ADMIN | query: `q?`, `domain?` | `Study[]` (PUBLISHED + active listing) | Not individually load-tested this run |
| GET | `/marketplace/domains` | INDUSTRY, ADMIN | — | `string[]` (distinct domains) | Not individually load-tested this run |

### 4.6 Interests

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/technologies/:id/interests` | INDUSTRY (company-scoped) | `{ id? }` (passthrough) | `201` `Interest` (idempotent upsert per study+company) | Not individually load-tested this run |
| GET | `/interests` | Bearer (role-scoped) | query: `q?`, `status?` | `Interest[]` (industry: own company; researcher: own studies) | Not individually load-tested this run |
| PATCH | `/interests/:id/status` | ADMIN | `{ status: interested\|meeting_scheduled\|discussion_approved\|license_requested\|licensed }` | `Interest` | Not individually load-tested this run |

### 4.7 Problem Statements

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/problem-statements` | Bearer (industry: own company) | query: `q?`, `urgency?` | `ProblemStatement[]` | ✅ Verified |
| POST | `/problem-statements` | INDUSTRY (company-scoped) | `{ title, industrySector, problemDescription, currentChallenges?, expectedSolution?, budgetRange?, urgency?, contactPerson?, keywords[]? }` | `201` `ProblemStatement` | ✅ Verified |
| PATCH | `/problem-statements/:id` | INDUSTRY (owner company) | full problem-statement fields | `ProblemStatement` | Not individually load-tested this run |
| DELETE | `/problem-statements/:id` | INDUSTRY, ADMIN | — | `null` | Not individually load-tested this run |

### 4.8 Meetings

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/meetings` | INDUSTRY, ADMIN | `{ studyId, interestId?, proposedDate?, scheduledDate?, meetingLink?, notes?, companyId?(admin) }` | `201` `Meeting` (+ participants) | Not individually load-tested this run |
| GET | `/meetings` | Bearer (role-scoped) | query: `q?`, `status?` | `Meeting[]` | Not individually load-tested this run |
| PATCH | `/meetings/:id/{schedule\|complete\|cancel}` | ADMIN | `{ scheduledDate?, meetingLink? }` | `Meeting` (status transition) | Not individually load-tested this run |
| PATCH | `/meetings/:id/status` | Bearer (participant or ADMIN) | `{ status: pending\|approved\|scheduled\|completed\|cancelled, scheduledDate?, meetingLink? }` | `Meeting` | Not individually load-tested this run |

### 4.9 Licensing

The licensing workflow advances through this status chain:
`PENDING → ADMIN_APPROVED → RESEARCHER_APPROVAL → RESEARCHER_APPROVED → AGREEMENT_GENERATED → SIGNED_SUBMITTED → AGREEMENT_EXECUTED → COMMERCIALIZED` (with `REJECTED` as a terminal branch). Status setters are role-gated per stage.

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/licenses` | INDUSTRY (company-scoped) | `{ id?, studyId, licenseFee? }` | `201` `License` (workflowType full/simplified by fee) | Not individually load-tested this run |
| GET | `/licenses` | Bearer (role-scoped) | query: `q?`, `status?` | `License[]` | Not individually load-tested this run |
| PATCH | `/licenses/:id/status` | Bearer (role-gated target) | `{ status, agreementTerms?, signedAgreementFileName?, signedAgreementContent? }` | `License` | Not individually load-tested this run |
| PATCH | `/licenses/:id/advance` | ADMIN, RESEARCHER (owner) | — | `License` (advanced one stage) | Not individually load-tested this run |
| PATCH | `/licenses/:id/reject` | ADMIN, RESEARCHER (owner) | `{ reason(min3) }` | `License` (REJECTED) | Not individually load-tested this run |
| POST | `/licenses/:id/agreement` | ADMIN | `{ terms? }` | `License` (AGREEMENT_GENERATED; generates file) | Not individually load-tested this run |
| GET | `/licenses/:id/agreement/download` | Bearer (admin/company/researcher) | — | file stream (text/plain) | Not individually load-tested this run |
| POST | `/licenses/:id/signed-agreement` | INDUSTRY (owner company) | multipart `file` (required) | `201` `License` (SIGNED_SUBMITTED) | Not individually load-tested this run |
| GET | `/licenses/:id/signed-agreement/download` | Bearer (admin/company/researcher) | — | file stream | Not individually load-tested this run |
| PATCH | `/licenses/:id/execute` | ADMIN | — | `License` (AGREEMENT_EXECUTED) | Not individually load-tested this run |
| PATCH | `/licenses/:id/commercialize` | ADMIN | `{ milestones? }` | `License` (COMMERCIALIZED; study→COMMERCIALIZED) | Not individually load-tested this run |

`PATCH /licenses/:id/status` enforces a per-role target matrix: ADMIN may set `ADMIN_APPROVED / AGREEMENT_GENERATED / AGREEMENT_EXECUTED / COMMERCIALIZED / REJECTED`; RESEARCHER may set `RESEARCHER_APPROVAL / RESEARCHER_APPROVED / REJECTED` (own study only); INDUSTRY may set `SIGNED_SUBMITTED` (own company only). Out-of-matrix targets → **403 FORBIDDEN**.

### 4.10 Files

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/files/:id/download` | Bearer (uploader / study access / agreement party / ADMIN) | — | file stream | Not individually load-tested this run |

Access is granted if the requester is the uploader, can read the related study (admin, owning researcher, or published study), or is a party to the related agreement; otherwise **403 FORBIDDEN**.

### 4.11 Notifications

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/notifications` | Bearer (own) | — | `Notification[]` (with `read` boolean) | Not individually load-tested this run |
| PATCH | `/notifications/:id/read` | Bearer (own) | — | `null` (404 if not yours) | Not individually load-tested this run |
| POST | `/notifications/read-all` | Bearer (own) | — | `null` | Not individually load-tested this run |

### 4.12 Audit

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/audit-logs` | ADMIN | — | `AuditLog[]` (latest 200, with actor name/email) | Not individually load-tested this run |

### 4.13 Analytics

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/analytics/metrics` | ADMIN | — | `{ totalStudies, publishedStudies, industryInterests, meetingsScheduled, licensesRequested, licensesSigned }` | Not individually load-tested this run |

### 4.14 AI — SUTRA agents

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/ai/extract-requirements` | INDUSTRY, ADMIN | `{ requirementText(min10), sutraCompanyId? \| companyMeta{ companyName, sector, subSector, location, companySize } }` | `{ sutraCompanyId, requirement_id, extracted_data{ domain, sub_domain, … } }` | ✅ Verified |
| POST | `/ai/discover-technologies` | INDUSTRY, ADMIN | `{ requirementId(int) }` | `{ matches: SutraTechnologyMatch[] }` | Not individually load-tested this run |
| POST | `/ai/industry-fit` | INDUSTRY, ADMIN | `{ technologyId, requirementId }` | `SutraFitResponse{ industry_fit, score, strengths, risks, … }` | Not individually load-tested this run |
| POST | `/ai/compliance` | INDUSTRY, ADMIN | `{ technologyId }` | `SutraComplianceResponse{ required/available/missing_certifications, approval_status, … }` | Not individually load-tested this run |
| POST | `/ai/commercialization` | INDUSTRY, ADMIN | `{ technologyId }` | `SutraCommercializationResponse{ recommended_license, market_readiness, … }` | Not individually load-tested this run |
| POST | `/ai/citation-verification` | Bearer (any auth) | `{ claim(min3), domain?, subDomain?, persist?, relatedType?, relatedId? }` | `SutraCitationResponse{ answer, confidence_score, sources[], verification_status }` | ✅ Verified |

### 4.15 AI — Matchmaking

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/matchmaking/match` | RESEARCHER, INDUSTRY, ADMIN | `{ problemStatement? \| problemRef?, topN(1-50)=10, explain=false }` (one of statement/ref required) | match result with ranked papers + cosine scores | ✅ Verified |
| POST | `/matchmaking/problem/:id` | INDUSTRY, ADMIN (owner) | `{ topN?, explain? }` | `201` persisted `MatchResult` | Not individually load-tested this run |

### 4.16 AI — Pipeline, Matches & Researcher feed

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| POST | `/ai/problems/:id/run-pipeline` | INDUSTRY, ADMIN (owner) | `{ topN?, topTech?, explain? }` | full 6-agent report (requirement, papers, tech recommendations, fit, compliance, commercialization) | ✅ Verified |
| GET | `/ai/problems/:id/report` | Bearer (owner/admin) | — | stored pipeline report | Not individually load-tested this run |
| GET | `/matches` | Bearer (role-scoped) | — | problem summaries with AI counts (researcher → `[]`) | Not individually load-tested this run |
| GET | `/matches/:id` | Bearer (owner/admin) | — | problem report | Not individually load-tested this run |
| GET | `/researcher/match-opportunities` | RESEARCHER | — | scored industry-problem opportunities (anonymized) | Not individually load-tested this run |

### 4.17 AI — Copilot

| Method | Path | Auth/RBAC | Request | Response (`data`) | Status |
|---|---|---|---|---|---|
| GET | `/copilot/sessions` | Bearer (own) | — | `CopilotSession[]` (id, title, role, timestamps) | Not individually load-tested this run |
| GET | `/copilot/sessions/:id` | Bearer (own) | — | session + ordered messages | Not individually load-tested this run |
| DELETE | `/copilot/sessions/:id` | Bearer (own) | — | `null` (soft delete) | Not individually load-tested this run |
| POST | `/copilot/chat` | Bearer | `{ message(min1), sessionId?, problemStatementId? }` | **SSE stream** (`session` → `token`* → `done`/`error`), persists conversation | ✅ Verified |

`/copilot/chat` is not a JSON-envelope endpoint: it responds with `text/event-stream` and emits `event: session` (sessionId), repeated `event: token` (`{ delta }`), then `event: done` (`{ citations, model }`) or `event: error`. When `problemStatementId` is supplied, the copilot is grounded with sources built from that problem's AI report (papers, technology recommendations, commercialization).

---

## 5. Live verification (this session)

The following calls were executed end-to-end against the running stack and confirmed working. Example payloads below are real (verified) requests/responses captured this session; no results have been invented.

### 5.1 Auth — `POST /api/v1/auth/login`
Industry credentials `mark.wilson@pharmatech.com` / `password`.

Request:
```json
{ "email": "mark.wilson@pharmatech.com", "password": "password" }
```
Response (`200`):
```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "email": "mark.wilson@pharmatech.com",
      "role": "industry",
      "organization": "PharmaTech"
    }
  }
}
```
An httpOnly `refreshToken` cookie is set on the response. **Status: ✅ Verified.**

### 5.2 `GET /api/v1/auth/me` and `GET /api/v1/health`
`/auth/me` with the Bearer token returned the authenticated industry user; `/health` returned `{ "status": "ok" }`. **Status: ✅ Verified.**

### 5.3 Studies & Problem Statements listing
`GET /api/v1/studies` and `GET /api/v1/problem-statements` both returned `200` with the expected role-scoped arrays. **Status: ✅ Verified.**

### 5.4 `POST /api/v1/problem-statements`
Created a new problem statement; the backend returned `201` with a generated UUID `id`. **Status: ✅ Verified.**

### 5.5 Matchmaking — `POST /api/v1/matchmaking/match`
Both invocation modes were verified against live Supabase-backed paper data:
- By reference: `{ "problemRef": "PROB-NT-02" }`
- By free text: `{ "problemStatement": "<text>" }`

Both returned real research papers ranked by cosine similarity scores. **Status: ✅ Verified.**

### 5.6 Full pipeline — `POST /api/v1/ai/problems/:id/run-pipeline`
Returned a complete 6-agent report. Verified findings this session:
- **Requirement extraction:** domain = Renewable Energy / Green Hydrogen, TRL 7.
- **Paper matching:** 6 Supabase research papers.
- **Technology recommendations:** 3, ranked with match scores **90.4 / 69.6 / 14.3**.
- **Industry fit:** **HIGH (95)**.
- **Compliance:** Pending — missing certifications **ISO 22734 / BIS / MNRE**.
- **Commercialization:** Exclusive license, market-ready.

**Status: ✅ Verified.**

### 5.7 `POST /api/v1/ai/extract-requirements`
Returned `extracted_data` with domain = Renewable Energy / Solar. **Status: ✅ Verified.**

### 5.8 `POST /api/v1/ai/citation-verification`
Returned `verification_status = partially_verified` with 2 supporting sources. **Status: ✅ Verified.**

### 5.9 Copilot — `POST /api/v1/copilot/chat` (SSE)
Streamed live tokens over Server-Sent Events from model **gpt-5.4**, emitting `session` → `token`* → `done`. **Status: ✅ Verified.**

---

## 6. Fixed bug — SUTRA Technology Discovery request encoding

**Symptom:** the full pipeline returned **0 technology recommendations**.

**Root cause:** the backend SUTRA client sent Technology Discovery's `requirement_id` to SUTRA `POST /technology/match` as a **JSON body**. The SUTRA FastAPI endpoint declares `requirement_id` as a bare integer argument, i.e. it expects it as a **query parameter**. Supplying it in the body left the required query param unbound, so SUTRA responded **422 Unprocessable Entity**, and the discovery step yielded no matches.

**Fix:** in `Comprehensiveproductwireframesystem/backend/server/services/sutra.service.ts`, `discoverTechnologies()` now sends `requirement_id` as a query param (body `undefined`):

```js
// SUTRA's /technology/match takes requirement_id as a QUERY param (bare int
// arg in FastAPI), not a JSON body — sending a body returns 422.
http.post<SutraMatchResponse>(base(), "/technology/match", undefined, {
  apiKey: key(),
  query: { requirement_id: requirementId },
  label: "sutra:/technology/match",
});
```

**Result after fix:** Technology Discovery returns ranked matches, and the end-to-end pipeline produced the 3 ranked technology recommendations (90.4 / 69.6 / 14.3) documented in §5.6. (For consistency, the Citation Verifier in the same file uses the same query-param convention for `claim` / `domain` / `sub_domain` against `/evidence/verify`.)

---

## 7. Notes & caveats

- Endpoints not marked "✅ Verified" are documented from source and were **not** individually invoked this session; their request/response shapes are taken directly from the Zod schemas and handler code, but no live assertion is claimed for them.
- The `/copilot/chat` endpoint deliberately breaks the standard JSON envelope (it streams SSE); clients must read it as an event stream, not parse it as a single JSON body.
- Error messages for genuine 500s are masked to `"Internal server error"`; only `ApiError` messages are returned verbatim to clients.

*End of report.*
