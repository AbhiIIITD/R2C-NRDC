# NRDC R2C Backend API Design

This document defines the production API contract implied by the frontend MVP. It is intended for a backend team starting implementation tomorrow.

For the latest frontend route, button, ownership, status, and notification mapping, also see:

- [Frontend Workflow Architecture](frontend-workflow-architecture.md)
- [Button Action Map](button-action-map.md)

## API Principles

- Base path: `/api/v1`.
- Authentication: JWT access token plus refresh-token session stored server-side.
- Authorization: role-based access control for `researcher`, `industry`, and `admin`.
- Response shape:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

- List response shape:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
}
```

## Domain Data Model

### `users`

Fields: `id`, `email`, `passwordHash`, `name`, `role`, `organization`, `phone`, `avatar`, `createdAt`, `updatedAt`, `lastLoginAt`, `status`.

Indexes: unique `email`, compound `role,status`.

### `sessions`

Fields: `id`, `userId`, `refreshTokenHash`, `device`, `ipAddress`, `expiresAt`, `revokedAt`, `createdAt`.

Indexes: `userId`, `expiresAt`, `revokedAt`.

### `studies`

Fields: `id`, `title`, `abstract`, `domain`, `status`, `trl`, `researcherId`, `researcherName`, `pdfUrl`, `keywords`, `commercialPotential`, `marketSize`, `competitors`, `ipStatus`, `readinessScore`, `approvedBy`, `approvedAt`, `publishedAt`, `rejectionReason`, `createdAt`, `updatedAt`.

Indexes: `status`, `domain`, `researcherId`, text index on `title`, `abstract`, `keywords`, `researcherName`.

### `study_reviews`

Fields: `id`, `studyId`, `assignedTo`, `status`, `decision`, `comments`, `createdAt`, `updatedAt`.

Indexes: `studyId`, `assignedTo,status`.

### `problem_statements`

Fields: `id`, `industryUserId`, `industryName`, `title`, `industrySector`, `problemDescription`, `currentChallenges`, `expectedSolution`, `budgetRange`, `urgency`, `contactPerson`, `keywords`, `createdAt`, `updatedAt`.

Indexes: `industryUserId`, `industrySector`, `urgency`, text index on `title`, `industrySector`, `keywords`, `problemDescription`.

### `interests`

Fields: `id`, `studyId`, `industryUserId`, `industryName`, `status`, `createdAt`, `updatedAt`.

Indexes: unique compound `studyId,industryUserId`, `studyId`, `industryUserId`, `status`.

### `meetings`

Fields: `id`, `interestId`, `studyId`, `researcherId`, `industryUserId`, `status`, `proposedDate`, `scheduledDate`, `meetingLink`, `notes`, `createdAt`, `updatedAt`.

Indexes: `studyId`, `researcherId`, `industryUserId`, `status`, `scheduledDate`.

### `license_requests`

Fields: `id`, `studyId`, `industryUserId`, `status`, `requestedAt`, `reviewedAt`, `approvedAt`, `agreementTerms`, `licenseFee`, `createdAt`, `updatedAt`.

Indexes: `studyId`, `industryUserId`, `status`, `requestedAt`.

### `notifications`

Fields: `id`, `userId`, `type`, `title`, `message`, `relatedId`, `relatedType`, `read`, `createdAt`.

Indexes: `userId,read`, `userId,createdAt`, `relatedId,relatedType`.

### `chat_sessions`

Fields: `id`, `userId`, `title`, `messages`, `contextStudyId`, `contextProblemId`, `createdAt`, `updatedAt`.

Indexes: `userId`, `contextStudyId`, `updatedAt`.

## Authentication APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create user, hash password, create session, return JWT. |
| `POST` | `/auth/login` | Public | Verify credentials, create session, return JWT. |
| `POST` | `/auth/logout` | Authenticated | Revoke current session. |
| `POST` | `/auth/refresh` | Refresh token | Rotate access token. |
| `POST` | `/auth/forgot-password` | Public | Create reset token and email reset link. |
| `GET` | `/auth/me` | Authenticated | Return current user profile and role. |

## Study and Review APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/studies` | Researcher | Create draft/submitted study. |
| `GET` | `/studies` | Researcher/Admin | List studies with filters. |
| `GET` | `/studies/{id}` | Owner/Admin/Industry if published | Get detail. |
| `PATCH` | `/studies/{id}` | Researcher owner | Update draft or requested-change study. |
| `POST` | `/studies/{id}/analyze` | Researcher owner | Run AI extraction and readiness scoring. |
| `PATCH` | `/studies/{id}/submit` | Researcher owner | Move to `submitted` and create review. |
| `GET` | `/reviews` | Admin | Admin review queue. |
| `GET` | `/reviews/{studyId}` | Admin | Review study detail. |
| `POST` | `/studies/{id}/approve` | Admin | Mark approved and notify researcher. |
| `POST` | `/studies/{id}/reject` | Admin | Mark rejected with reason and notify researcher. |
| `POST` | `/studies/{id}/request-changes` | Admin | Create review comment and return to researcher. |
| `POST` | `/studies/{id}/publish` | Admin | Mark published and expose in marketplace. |

Study search query parameters: `q`, `domain`, `status`, `researcherId`, `trl`, `minReadinessScore`, `sortBy`, `page`, `pageSize`.

## Marketplace APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/marketplace/technologies` | Industry/Admin | Search published studies by title, keyword, domain, researcher, description, readiness, and TRL. |
| `GET` | `/marketplace/technologies/{id}` | Industry/Admin | Technology detail for a published study. |
| `POST` | `/technologies/{id}/interests` | Industry | Express interest in a published technology. |
| `GET` | `/studies/{id}/interests` | Researcher owner/Admin | List interests for a study. |
| `GET` | `/industry-users/{id}/interests` | Industry owner/Admin | List an industry user's interests. |
| `PATCH` | `/interests/{id}/status` | Admin/System | Advance interest status. |

Express interest side effects: create `interests`, notify researcher, update dashboard counts, write audit log.

## Problem Statement APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/problem-statements` | Industry | Create problem and extract keywords. |
| `GET` | `/problem-statements` | Industry/Admin | Search problems by title, sector, urgency, keyword, owner. |
| `GET` | `/problem-statements/{id}` | Owner/Admin | View problem detail. |
| `PATCH` | `/problem-statements/{id}` | Owner | Edit problem. |
| `DELETE` | `/problem-statements/{id}` | Owner/Admin | Delete or archive problem. |

Problem creation side effects: store problem, extract keywords, notify admin for high/critical urgency, make problem available to Smart Match.

## Smart Match APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/smart-match/recommendations` | Industry | Generate recommendations from problem statements and current marketplace. |
| `GET` | `/smart-match/recommendations` | Industry | Retrieve latest recommendations, optionally filtered by problem. |
| `GET` | `/smart-match/explain/{studyId}` | Industry | Explain match score for one technology. |

Scoring inputs: problem keywords, industry sector, study domain, study keywords, abstract/title similarity, TRL, readiness score, market potential, and existing interest activity.

## Meeting APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/meetings` | Industry/Admin | Create meeting request from an interest. |
| `GET` | `/meetings` | Authenticated | List meetings by role, status, study, or user. |
| `POST` | `/meetings/{id}/approve` | Admin/Researcher owner | Approve meeting request. |
| `PATCH` | `/meetings/{id}/schedule` | Admin/Researcher owner | Set scheduled date and meeting link. |
| `PATCH` | `/meetings/{id}/status` | Admin/Participants | Change status to pending, approved, scheduled, completed, or cancelled. |
| `POST` | `/meetings/{id}/complete` | Admin/Participants | Mark completed and unlock next licensing action. |

Meeting side effects: update `interests.status`, notify both parties, update calendars/dashboard metrics.

## Licensing APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/licenses` | Industry | Request license for a published/interested technology. |
| `GET` | `/licenses` | Authenticated | List license requests by role, status, study, or user. |
| `PATCH` | `/licenses/{id}/status` | Admin | Move request through `requested`, `under_review`, `approved`, `rejected`, `signed`. |
| `POST` | `/licenses/{id}/approve` | Admin/Researcher workflow | Approve terms and notify industry. |
| `POST` | `/licenses/{id}/reject` | Admin/Researcher workflow | Reject request with reason. |
| `POST` | `/licenses/{id}/generate-agreement` | Admin | Generate agreement text/document from study and terms. |
| `POST` | `/licenses/{id}/sign` | Industry/Admin | Mark agreement signed. |

License side effects: notify admin/researcher/industry, update `studies.status` to `license_requested`, `licensed`, or `commercialized` when appropriate.

## Notification APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Authenticated | List current user's notifications. |
| `GET` | `/notifications/unread-count` | Authenticated | Get unread count for dashboard bell. |
| `POST` | `/notifications` | System/Admin | Create notification from domain event. |
| `PATCH` | `/notifications/{id}/read` | Owner | Mark one notification read. |
| `POST` | `/notifications/read-all` | Owner | Mark all read. |
| `DELETE` | `/notifications/{id}` | Owner | Delete or archive notification. |

Notification events should be generated by backend domain services, not trusted from arbitrary client input.

## AI Copilot APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/copilot/sessions` | Authenticated | List user's chat sessions. |
| `POST` | `/copilot/sessions` | Authenticated | Create chat session. |
| `GET` | `/copilot/context` | Authenticated | Build role/page/study/problem context payload. |
| `POST` | `/copilot/chat` | Authenticated | Generate response and store message history. |
| `PATCH` | `/copilot/sessions/{id}` | Owner | Rename/update context. |
| `DELETE` | `/copilot/sessions/{id}` | Owner | Archive session. |

Context rules:

- Researcher context includes owned studies, statuses, interests, meetings, and license requests.
- Industry context includes problem statements, interests, Smart Match recommendations, meetings, and license requests.
- Admin context includes review queue, problem statements, pending meetings, pending licenses, analytics, and audit highlights.

## Analytics APIs

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/analytics/metrics` | Admin | Global KPI cards. |
| `GET` | `/analytics/funnel` | Admin | Commercialization funnel. |
| `GET` | `/analytics/domains` | Admin | Domain distribution. |
| `GET` | `/analytics/status` | Admin | Study status distribution. |
| `GET` | `/analytics/activity` | Admin | Recent activity timeline. |
| `GET` | `/analytics/researchers/{id}` | Researcher/Admin | Researcher-specific metrics. |
| `GET` | `/analytics/industry/{id}` | Industry/Admin | Industry-specific demand/engagement metrics. |

## Lifecycle Transition Rules

| Object | Allowed Transitions |
| --- | --- |
| Study | `draft` -> `submitted` -> `under_review` -> `approved` -> `published` -> `interested` -> `meeting_scheduled` -> `license_requested` -> `licensed` -> `commercialized`; `under_review` can also become `rejected` or return for changes. |
| Interest | `interested` -> `meeting_scheduled` -> `license_requested` -> `licensed`. |
| Meeting | `pending` -> `approved` -> `scheduled` -> `completed`; any pre-completed state can become `cancelled`. |
| License | `requested` -> `under_review` -> `approved` -> `signed`; `under_review` can become `rejected`. |

Backend services must reject invalid transitions, such as publishing a rejected study or licensing an unpublished technology.

## Route-to-API Mapping

| Frontend Route | Primary APIs |
| --- | --- |
| `/login`, `/signup`, `/forgot-password` | `/auth/login`, `/auth/signup`, `/auth/forgot-password` |
| `/researcher` | `/analytics/researchers/{id}`, `/notifications`, `/studies?researcherId=...` |
| `/researcher/upload` | `/studies`, `/studies/{id}/analyze`, `/studies/{id}/submit` |
| `/researcher/studies` | `/studies?researcherId=...` |
| `/researcher/studies/{id}` | `/studies/{id}`, `/studies/{id}/interests`, `/meetings`, `/licenses` |
| `/industry` | `/marketplace/technologies`, `/problem-statements`, `/notifications`, `/analytics/industry/{id}` |
| `/industry/marketplace` | `/marketplace/technologies` |
| `/industry/technology/{id}` | `/marketplace/technologies/{id}`, `/technologies/{id}/interests`, `/meetings`, `/licenses` |
| `/industry/problems` | `/problem-statements`, `/smart-match/recommendations` |
| `/industry/smart-match` | `/smart-match/recommendations`, `/smart-match/explain/{studyId}` |
| `/industry/meetings` | `/meetings` |
| `/industry/licensing` | `/licenses` |
| `/admin` | `/analytics/metrics`, `/reviews`, `/notifications` |
| `/admin/review-queue` | `/reviews`, `/studies/{id}/approve`, `/studies/{id}/reject`, `/studies/{id}/publish` |
| `/admin/problems` | `/problem-statements`, `/smart-match/recommendations` |
| `/admin/meetings` | `/meetings`, `/meetings/{id}/approve`, `/meetings/{id}/schedule` |
| `/admin/licensing` | `/licenses`, `/licenses/{id}/approve`, `/licenses/{id}/reject` |
| `/admin/analytics` | `/analytics/metrics`, `/analytics/funnel`, `/analytics/domains`, `/analytics/status`, `/analytics/activity` |
| `/*/copilot` | `/copilot/sessions`, `/copilot/context`, `/copilot/chat` |

## Backend Service Boundaries

| Service | Responsibilities |
| --- | --- |
| Auth Service | Signup, login, JWT, sessions, password reset, RBAC context. |
| Study Service | Study CRUD, status transitions, AI extraction orchestration, file metadata. |
| Review Service | Admin queue, comments, decisions, approvals, rejection, publish. |
| Marketplace Service | Published technology search, detail, interest creation. |
| Problem Service | Industry problem CRUD, search, keyword extraction, demand visibility. |
| Match Service | Recommendation scoring, explanations, new-match monitoring. |
| Meeting Service | Request, approval, scheduling, completion. |
| Licensing Service | Requests, review, approval, agreement generation, signature. |
| Notification Service | Domain-event notifications, read/unread state. |
| Copilot Service | Context collection, model invocation, chat persistence. |
| Analytics Service | KPI/funnel/domain/status/recent activity aggregations. |
| Audit Service | Immutable sensitive-action trail. |

## MVP-to-Backend Migration Plan

1. Replace localStorage reads/writes in `AuthContext` with `/auth/*` calls.
2. Replace `AppDataContext` mutation methods with API-backed service calls while keeping the same TypeScript domain types.
3. Move notification creation into backend domain events.
4. Add backend transition validation for study, interest, meeting, and license lifecycles.
5. Add search indexes for studies and problem statements before scaling marketplace and admin search.
6. Add analytics aggregation endpoints after core workflow persistence is stable.

## Newly Connected Frontend Behaviors to Preserve

| Behavior | Endpoint Contract |
| --- | --- |
| Problem statement edit/delete | `PATCH /problem-statements/{id}` and `DELETE /problem-statements/{id}` must preserve Smart Match recomputation semantics. |
| Problem statement search/filter | `GET /problem-statements?q=&urgency=&industrySector=` should match title, sector, description, challenges, expected solution, and keywords. |
| Notification workflow routing | `GET /notifications` should include `relatedId` and `relatedType` so clients can open study, meeting, license, or review workflows. |
| Researcher dashboard metrics | `GET /analytics/researchers/{id}` should return total studies, published studies, interests received, and active meetings. |
| Logout | `POST /auth/logout` should revoke the active session and make subsequent `/auth/me` calls fail until login. |
