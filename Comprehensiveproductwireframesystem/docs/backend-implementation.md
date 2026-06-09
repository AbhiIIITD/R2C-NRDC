# Backend Implementation and Deployment

## Overview

The POC backend is a TypeScript Express API using PostgreSQL and Prisma. It
implements JWT access tokens, rotating refresh-token sessions, role and
ownership checks, transactional workflow commands, local file storage,
notifications, audit logs, and analytics metrics.

For the current implemented/partial/missing audit after frontend/backend
integration fixes, see `docs/current-backend-gap-analysis.md`.

The API base path is `/api/v1`. Responses use `{ "success": true, "data": {} }`
or `{ "success": false, "error": { "code": "CODE", "message": "Message" } }`.

## Folder Structure

```text
server/
  index.ts        Express routes and workflow commands
  lib.ts          auth/RBAC, errors, notifications, audit helpers
  config.ts       environment configuration
  prisma.ts       Prisma client
  types.ts        Express auth typing
prisma/
  schema.prisma
  seed.ts
  sync-existing-industry-passwords.ts
storage/          local POC object storage, ignored by git
```

## Environment Variables

Copy `.env.example` to `.env` and change secrets before deployment.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL Prisma connection URL |
| `PORT` | API port, default `4000` |
| `CLIENT_ORIGIN` | Allowed frontend origin |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `ACCESS_TOKEN_TTL` | Access-token lifetime |
| `REFRESH_TOKEN_DAYS` | Refresh-session lifetime |
| `STORAGE_ROOT` | Local POC file root |
| `VITE_API_URL` | Frontend API base URL |

## Local Deployment

```bash
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name initial
npm run prisma:seed
npm run dev:api
npm run dev
```

Demo accounts seeded with password `password`:

- `dr.smith@university.edu`
- `mark.wilson@pharmatech.com`
- `admin@nrdc.org`

## Existing Industry User Password Integration

Run this only against the database that already contains the requested company
and user mappings:

```bash
npm run industry:sync-passwords
```

The command updates existing industry users for the 12 named companies to
password `test1234`. It deliberately does not create missing companies or users,
and exits non-zero with a missing-mapping report.

## Authentication Flow

1. Login validates a bcrypt password.
2. API returns a short-lived JWT access token.
3. A random refresh token is stored in an HTTP-only cookie; only its SHA-256
   hash is stored in `Session`.
4. The frontend retries one unauthorized request through `/auth/refresh`.
5. Logout revokes the active session.
6. Every protected query derives user/company ownership from the token.

Public admin registration is disabled.

## Primary API Endpoints

### Authentication

- `POST /auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout`
- `POST /auth/forgot-password`
- `GET /auth/me`

### Research and Marketplace

- `GET|POST /studies`, `GET /studies/:id`, `PATCH /studies/:id/submit`
- `POST /studies/:id/approve|publish|reject|request-changes`
- `GET /marketplace/technologies`
- `POST /technologies/:id/interests`
- `GET /interests`, `PATCH /interests/:id/status`

### Industry Problems and Meetings

- `GET|POST /problem-statements`, `PATCH|DELETE /problem-statements/:id`
- `GET|POST /meetings`
- `PATCH /meetings/:id/schedule|complete|cancel|status`

### Licensing and Agreements

- `GET|POST /licenses`
- `PATCH /licenses/:id/advance|reject|status|execute|commercialize`
- `POST /licenses/:id/agreement`
- `POST /licenses/:id/signed-agreement`

### Operations

- `GET /notifications`, `PATCH /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /audit-logs`
- `GET /analytics/metrics`

## Role Permissions

| Capability | Researcher | Industry | Admin |
| --- | --- | --- | --- |
| Create/manage own studies | Yes | No | Review only |
| Browse published marketplace | No | Yes | Yes |
| Create interests/problems/license requests | No | Own company | No |
| View meetings/licenses | Own studies | Own company | All |
| Approve researcher license stage | Own studies | No | No |
| Publish/generate/execute/commercialize | No | No | Yes |
| Read audit/global analytics | No | No | Yes |

## Workflow and Files

Domain commands update related records, create notifications, and write audit
logs inside Prisma transactions. The license flow is:

```text
pending -> admin_approved -> researcher_approval -> researcher_approved
-> agreement_generated -> signed_submitted -> agreement_executed
-> commercialized
```

Signed agreements are multipart uploads up to 25 MB. The backend stores an
opaque file and records its original name, MIME type, size, SHA-256 checksum,
uploader, and agreement relationship.

## Industry Tier Blocker

The repository does not contain the separate three-tier Industry Data
Collection specification. The database reserves company tier and versioned
onboarding JSON records, but signup rejects tier payloads until the required
fields and validation rules can be implemented from that document.
