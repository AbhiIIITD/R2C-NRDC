# Phase 2 Backend Architecture

## Recommended POC Architecture

Use a TypeScript Express API in the same repository with PostgreSQL and Prisma.
The frontend remains a Vite application and calls `/api/v1`.

```text
React frontend
  -> typed API client
  -> Express routes
  -> authentication/RBAC middleware
  -> domain services and transition policies
  -> Prisma transactions
  -> PostgreSQL
  -> local object storage for POC files
```

## Backend Modules

- `auth`: login, refresh rotation, logout, forgot/reset password, current user.
- `users` and `companies`: role profiles, company membership, onboarding data.
- `studies`: research CRUD, submission, files, lifecycle.
- `reviews`: admin review decisions and comments.
- `marketplace`: published technology search and interests.
- `problems` and `smart-match`: industry demand and recommendation runs.
- `meetings`: requests, participants, scheduling, completion.
- `licenses`: approvals, status transitions, agreements, execution.
- `commercialization`: milestone records and final state.
- `notifications`: event-driven role/user feeds.
- `files`: storage metadata, authorization, download/upload history.
- `audit`: immutable sensitive-action records.
- `analytics`: role-scoped and global aggregates.

## Core Data Model

| Entity | Important Relationships |
| --- | --- |
| User | Has role; optionally belongs to Company; owns sessions, notifications, uploads, audit actions. |
| Company | Has many industry users, interests, problems, meetings, licenses, and onboarding submissions. |
| CompanyOnboardingSubmission | Belongs to Company; stores tier and versioned tier-specific JSON after specification is supplied. |
| Session | Belongs to User; stores hashed refresh token and revocation/expiry. |
| Study | Belongs to researcher User; has documents, reviews, interests, meetings, licenses. |
| StudyDocument | Belongs to Study and FileObject; records purpose/version. |
| StudyReview | Belongs to Study and assigned Admin; has comments/decision/history. |
| MarketplaceListing | One-to-one with Study; controls publication and listing metadata. |
| Interest | Belongs to Company, creating User, and Study; unique Company + Study. |
| Meeting | Belongs to Study and optional Interest; has participants and status history. |
| LicenseRequest | Belongs to Company and Study; has approvals, agreements, status history. |
| LicenseApproval | Belongs to LicenseRequest; records role, decision, actor, notes. |
| Agreement | Belongs to LicenseRequest; has generated and signed AgreementFiles. |
| FileObject | Storage metadata and ownership for all uploaded/generated files. |
| CommercializationRecord | Belongs to LicenseRequest and Study; records milestones and completion. |
| Notification | Belongs to recipient User; points to related workflow object. |
| AuditLog | Immutable actor/action/entity/change record. |

## Authentication and Authorization

- Short-lived JWT access token.
- Opaque random refresh token stored as an `httpOnly`, `secure`,
  `sameSite=lax` cookie; only its hash is stored in `Session`.
- Refresh-token rotation and session revocation.
- Password hashes using bcrypt/argon2.
- Middleware: authenticate, require role, load ownership context.
- Admin signup is not public.
- Industry access is company-scoped; researcher access is study-owner-scoped.

## File Storage

POC storage root:

```text
storage/
  studies/{studyId}/{fileId}
  agreements/{licenseId}/generated/{fileId}
  agreements/{licenseId}/signed/{fileId}
  users/{userId}/{fileId}
```

Database metadata is authoritative. Downloads pass through an authorized API
endpoint. The storage adapter must allow later replacement with S3-compatible
object storage.

## Workflow Engine

Use explicit transition policy functions inside domain services rather than a
generic configurable workflow engine for the POC. Each command:

1. Loads and authorizes the aggregate.
2. Validates the requested transition.
3. Mutates all related records in a Prisma transaction.
4. Writes status history and audit log.
5. Creates recipient notifications.
6. Returns the updated aggregate.

## API Shape

- Base path: `/api/v1`.
- Success: `{ "success": true, "data": ... }`.
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- Lists: `items`, `total`, `page`, `pageSize`, `hasMore`.
- Validation: Zod schemas at route boundaries.
- Uploads: multipart form data; all other commands use JSON.

## Transaction Boundaries

- Study submit: study + review + notifications + audit.
- Express interest: interest + study derived state + notifications + audit.
- Schedule meeting: meeting + interest + notifications + audit.
- Request/approve license: license + interest/study derived state +
  approvals + notifications + audit.
- Generate/upload/execute agreement: agreement/files + license +
  notifications + audit.
- Commercialize: commercialization + license + study + interest +
  notifications + audit.

## Industry Tier Support

The schema should reserve:

- `Company.industryTier`
- `CompanyOnboardingSubmission.tier`
- `CompanyOnboardingSubmission.schemaVersion`
- `CompanyOnboardingSubmission.data` as validated JSON
- `CompanyOnboardingSubmission.status`

The required field schemas and validation rules cannot be defined until the
separate three-tier Industry Data Collection document is supplied.

## Migration Order

1. Add backend, Prisma schema, and infrastructure.
2. Import/verify existing companies and users before seeding credentials.
3. Implement auth and company-scoped identity.
4. Implement read APIs and replace initial frontend mock loading.
5. Implement workflow commands in lifecycle order.
6. Implement file storage, notifications, audit, and analytics.
7. Implement tier onboarding after receiving the specification.
8. Remove remaining mock state only after each route is verified end to end.

