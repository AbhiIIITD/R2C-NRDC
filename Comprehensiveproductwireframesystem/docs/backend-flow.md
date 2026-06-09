# NRDC R2C Backend Flow Documentation

This document describes how the frontend MVP should translate into backend workflows. The current app uses React Context and localStorage, but every flow below is written as the target service behavior for a production backend.

For the latest frontend route, button, ownership, and status mapping, also see:

- [Frontend Workflow Architecture](frontend-workflow-architecture.md)
- [Button Action Map](button-action-map.md)

## System Workflow Model

NRDC R2C is a commercialization workflow platform, not a static research repository. The core pipeline is:

Research upload -> AI analysis -> admin review -> marketplace publication -> industry interest -> meeting -> licensing -> commercialization.

Each action must update a durable record, emit relevant notifications, refresh dashboard metrics, and move the business object to its next workflow state.

## Core Collections

| Collection | Purpose |
| --- | --- |
| `users` | Researchers, industry users, and admins with role, organization, and profile data. |
| `sessions` | JWT refresh/session records, device metadata, expiry, and revocation state. |
| `studies` | Research assets, AI extraction fields, TRL, domain, keywords, and lifecycle status. |
| `study_reviews` | Admin assignments, decisions, comments, change requests, approvals, and rejections. |
| `problem_statements` | Industry demand records used by Smart Match and admin demand visibility. |
| `interests` | Industry expressions of interest against published technologies. |
| `meetings` | Meeting requests, approvals, scheduled dates, links, notes, and completion state. |
| `license_requests` | Licensing requests, review state, agreement terms, fee, approval, rejection, and signature state. |
| `notifications` | User-visible workflow events with read/unread state. |
| `chat_sessions` | AI Copilot conversations, contextual prompts, study/problem references, and chat history. |
| `audit_logs` | Immutable record of sensitive actions such as approvals, publication, licensing, and auth events. |
| `analytics_snapshots` | Optional aggregate metrics for dashboards and stakeholder reports. |

## 1. Authentication Flow

| Step | Flow |
| --- | --- |
| User Action | User signs up or logs in from the public auth pages and selects a role: researcher, industry, or admin. |
| Frontend State Update | `AuthContext.user` is set, `isAuthenticated=true`, and the role-specific layout/dashboard is rendered. |
| Backend API Called | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `GET /auth/me`. |
| Database Collections Affected | `users`, `sessions`, `audit_logs`; forgot password also creates a password reset token record. |
| Notification Generated | Optional welcome/account-created notification; password reset email event for forgot password. |
| Next Workflow State | Valid JWT grants dashboard access. Researcher enters upload flow, industry enters discovery/problem flow, admin enters review/operations flow. |

Signup state sequence:

Signup -> user created -> password hash stored -> JWT generated -> session created -> role dashboard access.

Login state sequence:

Login -> credentials verified -> JWT generated -> session refreshed -> dashboard metrics loaded.

## 2. Research Submission Flow

| Step | Flow |
| --- | --- |
| User Action | Researcher uploads study details, optional PDF, keywords, TRL, and submits the wizard. |
| Frontend State Update | New study is added to `studies`; status moves from `draft` to `submitted`; researcher dashboard and My Studies update. |
| Backend API Called | `POST /studies`, `POST /studies/{id}/analyze`, `PATCH /studies/{id}/submit`. |
| Database Collections Affected | `studies`, `study_reviews`, `notifications`, `audit_logs`; optional file metadata in `study_files`. |
| Notification Generated | Admin receives `study_submitted`; researcher can receive "Submission received". |
| Next Workflow State | Study appears in Admin Review Queue with `study_reviews.status=pending`. |

Detailed sequence:

Researcher upload -> AI extraction -> researcher review -> submit -> study stored -> status `submitted` -> review record created -> admin notified -> admin queue updated.

Admin decision sequence:

Admin opens review -> status `under_review` -> approve/reject/request changes -> researcher notified -> approved study can be published -> published study appears in Marketplace.

## 3. Marketplace Discovery Flow

| Step | Flow |
| --- | --- |
| User Action | Industry user searches marketplace by title, keywords, domain, researcher, description, TRL, or readiness. |
| Frontend State Update | Filtered marketplace results update instantly; detail page opens for selected technology. |
| Backend API Called | `GET /marketplace/technologies`, `GET /marketplace/technologies/{id}`, `POST /technologies/{id}/interests`. |
| Database Collections Affected | Read from `studies`; write to `interests`, `notifications`, `audit_logs`. |
| Notification Generated | Researcher receives `interest_received`; optional admin activity event for commercialization tracking. |
| Next Workflow State | Interest record status is `interested`; industry can request meeting or license. |

Sequence:

Marketplace search -> technology detail -> express interest -> interest stored -> researcher notified -> researcher dashboard interest count updates.

## 4. Industry Problem Statement Flow

| Step | Flow |
| --- | --- |
| User Action | Industry user creates, edits, deletes, searches, or filters a problem statement. |
| Frontend State Update | Problem list, industry dashboard, profile, admin problem review page, and Smart Match profile update. |
| Backend API Called | `POST /problem-statements`, `PATCH /problem-statements/{id}`, `DELETE /problem-statements/{id}`, `GET /problem-statements`. |
| Database Collections Affected | `problem_statements`, `notifications`, `audit_logs`; Smart Match reads `studies`. |
| Notification Generated | Admin receives a demand-signal notification for high or critical urgency problems. |
| Next Workflow State | Problem becomes available for Smart Match ranking and admin demand review. |

Sequence:

Create problem -> extract keywords -> store problem -> admin visibility -> Smart Match recomputes -> recommended technologies appear.

## 5. Smart Match Flow

| Step | Flow |
| --- | --- |
| User Action | Industry user opens Smart Match or refreshes recommendations. |
| Frontend State Update | Match profile, recommendation list, match score, and explanation are recalculated from current study/problem data. |
| Backend API Called | `POST /smart-match/recommendations`, `GET /smart-match/recommendations?problemId=...`. |
| Database Collections Affected | Read `problem_statements`, `studies`, `interests`; optional write to `smart_match_runs` and `audit_logs`. |
| Notification Generated | Optional notification to industry when new high-scoring technology is published. |
| Next Workflow State | User views technology detail, expresses interest, requests meeting, or creates a more precise problem statement. |

Sequence:

Problem statement -> keyword extraction -> domain matching -> readiness scoring -> technology ranking -> match score -> recommendation explanation -> interest/meeting path.

## 6. Meeting Flow

| Step | Flow |
| --- | --- |
| User Action | Industry requests a meeting from a technology detail or interest record; admin/researcher approves and schedules. |
| Frontend State Update | Meeting Center, Admin Meeting Management, researcher dashboard, and industry dashboard update. |
| Backend API Called | `POST /meetings`, `POST /meetings/{id}/approve`, `PATCH /meetings/{id}/schedule`, `POST /meetings/{id}/complete`. |
| Database Collections Affected | `meetings`, `interests`, `studies`, `notifications`, `audit_logs`. |
| Notification Generated | Researcher and industry receive `meeting_requested`, `meeting_approved`, and `meeting_scheduled` events as appropriate. |
| Next Workflow State | Meeting moves `pending` -> `approved` -> `scheduled` -> `completed`; completed meetings can lead to license request. |

Sequence:

Interest created -> meeting request -> admin/researcher approval -> meeting scheduled -> meeting completed -> licensing CTA becomes prominent.

## 7. Licensing Flow

| Step | Flow |
| --- | --- |
| User Action | Industry requests a license; admin reviews; researcher approves terms; license is approved and signed. |
| Frontend State Update | Licensing Center, Admin Licensing Management, researcher study detail, and commercialization dashboard update. |
| Backend API Called | `POST /licenses`, `PATCH /licenses/{id}/status`, `POST /licenses/{id}/approve`, `POST /licenses/{id}/reject`, `POST /licenses/{id}/sign`. |
| Database Collections Affected | `license_requests`, `studies`, `interests`, `notifications`, `audit_logs`; optional `license_agreements`. |
| Notification Generated | Admin receives `license_requested`; researcher receives approval request; industry receives approval/rejection/signature updates. |
| Next Workflow State | License moves `requested` -> `under_review` -> `approved` or `rejected` -> `signed`; signed license drives commercialization tracking. |

Sequence:

License request -> admin review -> researcher approval -> license approved -> agreement generated -> license signed -> study marked licensed/commercialized when milestones are met.

## 8. Notification Flow

| Trigger | Recipient | Notification Type | Next Workflow State |
| --- | --- | --- | --- |
| Study submitted | Admin | `study_submitted` | Admin review queue item created. |
| Study approved | Researcher | `study_approved` | Study ready for publication. |
| Study rejected | Researcher | `study_rejected` | Researcher revises or resubmits. |
| Study published | Researcher, optional industry watchers | `study_published` | Marketplace visibility enabled. |
| Interest received | Researcher | `interest_received` | Meeting/license actions available. |
| Meeting requested | Researcher and industry | `meeting_requested` | Meeting pending approval. |
| Meeting approved/scheduled | Researcher and industry | `meeting_approved` or `meeting_scheduled` | Calendar/link available. |
| License requested | Admin | `license_requested` | Licensing review queue item created. |
| License approved | Industry and researcher | `license_approved` | Agreement signature workflow starts. |

Notification persistence sequence:

Domain event -> notification created -> recipient unread count updates -> dashboard bell/card refreshes -> user marks read -> read state persisted.

## 9. AI Copilot Flow

| Step | Flow |
| --- | --- |
| User Action | User asks a contextual question from dashboard, upload, marketplace, technology detail, review, Smart Match, or licensing pages. |
| Frontend State Update | Prompt and response are appended to the active chat session; suggested prompts update based on page context. |
| Backend API Called | `POST /copilot/chat`, `GET /copilot/sessions`, `GET /copilot/context`, `PATCH /copilot/sessions/{id}`. |
| Database Collections Affected | `chat_sessions`; read `studies`, `problem_statements`, `interests`, `meetings`, `license_requests`, and `analytics_snapshots`. |
| Notification Generated | None by default; optional task recommendation can create a workflow reminder. |
| Next Workflow State | User receives an answer and can follow suggested next actions such as submit, publish, match, meet, or license. |

Sequence:

User question -> context collection -> study/problem/engagement retrieval -> AI response generation -> chat history storage -> contextual next action.

## 10. Commercialization Tracking Flow

| Step | Flow |
| --- | --- |
| User Action | User advances a technology through publication, interest, meetings, licensing, and signing. |
| Frontend State Update | Dashboard KPI cards, analytics funnel, study status badges, and user-specific lists update. |
| Backend API Called | `GET /analytics/metrics`, `GET /analytics/funnel`, `GET /analytics/activity`, `PATCH /studies/{id}/commercialization-status`. |
| Database Collections Affected | `studies`, `interests`, `meetings`, `license_requests`, `analytics_snapshots`, `audit_logs`. |
| Notification Generated | Status milestone notifications for relevant researcher, industry, and admin users. |
| Next Workflow State | Technology moves from `published` to `interested`, `meeting_scheduled`, `license_requested`, `licensed`, and finally `commercialized`. |

Sequence:

Published technology -> industry interest -> meeting completed -> license requested -> license signed -> commercialization milestone recorded -> stakeholder analytics updated.

## Dashboard Update Rules

| Dashboard | Updates When |
| --- | --- |
| Researcher Dashboard | Study status changes, interest received, meeting scheduled/completed, license requested/approved/signed. |
| Industry Dashboard | New problem created, interest submitted, meeting status changes, license status changes, recommended technologies change. |
| Admin Dashboard | Study submitted, problem statement created, meeting requested, license requested, funnel metrics change. |
| Analytics Dashboard | Any study, interest, meeting, or license collection mutation occurs. |

## Backend Implementation Notes

- Use domain services for study review, marketplace, matching, meetings, licensing, notifications, and analytics.
- Emit notifications and audit logs from backend domain events, not from UI-only side effects.
- Protect every endpoint with RBAC: researchers own studies, industry owns problem statements/interests, admins manage review/publish/operations.
- Keep lifecycle transitions explicit and validated server-side. For example, only `approved` studies may be published, and only published studies can receive interests.
- The frontend localStorage keys map to backend collections and should be replaced by API calls without changing the user journey.

## Latest MVP State Mapping

| MVP Feature | Frontend State | Future Backend Owner |
| --- | --- | --- |
| Visible logout | `AuthContext.logout()` clears `auth_user`. | Auth Service revokes `sessions` token and records audit event. |
| Researcher live dashboard | Reads `studies`, `interests`, and `meetings`. | Analytics Service computes researcher KPIs from persisted collections. |
| Problem edit/delete/search/filter | Mutates `problemStatements` and recomputes Smart Match context. | Problem Service handles CRUD, search indexes, and high-urgency notifications. |
| Role notification pages | Reads `notifications`, updates read state, routes to related workflows. | Notification Service delivers role-scoped notifications and read/unread counts. |
| Admin notification route | Shows admin review, meeting, and license events. | Notification Service subscribes to study, meeting, license, and problem domain events. |
