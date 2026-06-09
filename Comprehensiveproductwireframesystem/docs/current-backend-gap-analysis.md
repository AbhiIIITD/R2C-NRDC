# Current Backend Gap Analysis

## Audit Date

June 7, 2026

## Implemented

- TypeScript Express API under `server/` with `/api/v1` base path.
- Prisma PostgreSQL schema under `prisma/schema.prisma`.
- JWT access tokens, refresh-token rotation, logout, and current-user lookup.
- RBAC middleware for researcher, industry, and admin roles.
- Company-scoped industry identity and researcher-owned study access rules.
- Study draft/submission/admin review/publication endpoints.
- Marketplace listing reads and express-interest command.
- Problem statement CRUD for industry companies.
- Meeting creation, listing, scheduling, completion, cancellation, and status updates.
- License request creation, role-scoped listing, approval/status transitions, rejection, agreement generation, signed upload, execution, and commercialization.
- Notification feed, mark-read, mark-all-read.
- Audit log writes for major workflow commands and admin audit-log read.
- Admin analytics metrics endpoint.
- Local POC file storage for research documents, generated agreements, and signed agreements.
- Authorized file download endpoints for research documents, generated agreements, and signed agreements.
- Seed script for one researcher, one admin, baseline demo company/user, 12 industry company/user accounts, and one published study.
- Separate industry password sync script that updates the requested 12 companies only if they already exist.
- Frontend API client and auth context integration.
- Frontend domain context now loads role-scoped backend data after authentication.
- Initial Prisma migration SQL under `prisma/migrations/20260607183000_initial/migration.sql`.

## Partially Implemented

- The backend is currently monolithic in `server/index.ts`; planned controllers/services/DTO folders are not separated yet.
- The research upload wizard can upload a selected file, but DOI extraction and AI parsing remain simulated.
- Agreement preview remains inline text in the UI, while download uses the backend file endpoint with a local fallback.
- Dashboard data is loaded from core list endpoints; dedicated role-specific dashboard endpoints are not implemented.
- Notification creation covers major transitions, but some frontend-only local notification calls still exist for optimistic feedback.
- Audit logs cover sensitive backend commands, while static/presentational frontend audit filters/export remain unfinished.
- Tier onboarding has schema placeholders (`Company.industryTier`, `CompanyOnboardingSubmission`) but no tier-specific validation because the required tier document is not present.
- Existing 12 industry accounts are supported by an update script, but the repository does not include the underlying database dump or records.
- Several profile, Copilot, export, reporting, and advanced filter controls remain presentational.

## Missing

- The separate three-tier Industry Data Collection document.
- A database dump containing the externally claimed existing 12 company/user records.
- Reset-password token creation/verification and email delivery.
- Dedicated backend services/controllers if maintainability beyond POC is required.
- Automated end-to-end tests against a running PostgreSQL instance.
- Production deployment manifests beyond `docker-compose.yml` for local PostgreSQL.

## Fixes Applied In This Pass

- Added API response compatibility fields expected by the frontend:
  - `Interest.industryUserId`
  - `Meeting.researcherId`
  - `Meeting.industryUserId`
  - `LicenseRequest.industryUserId`
  - signed agreement filename/content preview metadata
- Preserved frontend optimistic IDs for newly created interests, meetings, and license requests so immediate navigation remains stable.
- Allowed admin-created meetings to infer `companyId` from the selected interest instead of requiring the frontend to send a separate company field.
- Returned normalized meeting, interest, and license payloads from relevant create/list endpoints.
- Added multipart research file upload support and authorized file downloads.
- Added generated-agreement and signed-agreement download endpoints.
- Added local seed upserts for the 12 requested industry companies/users using password `test1234`.
- Added initial Prisma migration SQL generated from the schema.

## Validation Results

- `npm.cmd run build:api`: passed.
- `npm.cmd run build`: passed with only Vite chunk-size warning.
- `npx.cmd prisma validate`: initially failed because `DATABASE_URL` was not set in the shell; passed after injecting the `.env.example` value for validation.
- API route smoke test: `GET /api/v1/health` passed against the compiled API.

## Remaining Blockers

- The 12 requested industry accounts are available for local POC seeding. They still cannot be verified against a claimed external existing database without that database dump/connection.
- Tier-aware onboarding cannot be completed faithfully until the three-tier data collection specification is supplied.
- Full database-backed end-to-end runtime verification requires PostgreSQL. Docker is not installed in this environment, so migrations and seed could not be executed here against a live database.
