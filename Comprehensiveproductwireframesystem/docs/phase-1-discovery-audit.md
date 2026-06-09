# Phase 1 Application Discovery Audit

## Scope and Source of Truth

This audit was completed before backend implementation. The React frontend is
the primary specification. Existing documents were used as supporting context:

- `README.md`
- `NAVIGATION_MAP.md`
- `WIREFRAME_GUIDE.md`
- `WIREFRAME_INDEX.md`
- `FEATURE_UPDATE.md`
- `FLEXIBLE_LICENSING.md`
- `docs/application-flow.md`
- `docs/backend-api-design.md`
- `docs/backend-flow.md`
- `docs/button-action-map.md`
- `docs/frontend-workflow-architecture.md`

The application is currently a frontend-only Vite POC. Authentication and
domain records are stored in browser `localStorage`. There is no backend,
Prisma schema, SQL dump, database connection configuration, or server
environment file in the repository.

## Missing Required Inputs

The following items named in the implementation request are not present in the
workspace:

- The separate three-tier Industry Data Collection specification.
- Existing `Companies` and `Users` database tables.
- The 12 named hardcoded industry/company accounts.
- Any database dump, migration, connection string, or external database access
  instructions.

The frontend currently contains only two mock industry users:

| User | Company | Email | Current Demo Password |
| --- | --- | --- | --- |
| Mark Wilson | PharmaTech Inc | `mark.wilson@pharmatech.com` | `password` |
| Lisa Chen | CleanTech Solutions | `lisa.chen@cleantech.com` | `password` |

Tier-aware onboarding must not be implemented until the missing tier
specification is supplied. The 12 requested users can only be migrated without
duplicates after access to the claimed existing records is available.

## Current Application Architecture

- Router: React Router browser router in `src/app/routes.tsx`.
- Authentication: `AuthContext`, with users and plaintext demo passwords in
  `localStorage`.
- Shared domain state: `AppDataContext`, initialized from `src/lib/mockData.ts`
  and persisted to `localStorage`.
- Service layer: six async service files that simulate latency and mostly read
  or write `localStorage`.
- Authorization: frontend route guards by `researcher`, `industry`, or `admin`.
- Notifications: domain handlers create role-specific notification records.
- Files: research PDF is represented by a URL/file name; signed agreement is
  represented by file name and text content rather than durable binary storage.
- Agreement generation: deterministic mock text generated in the frontend.
- Analytics: calculated in-browser from shared mock records.

## Route and Page Inventory

### Public

| Route | Page | Purpose and Active Behavior |
| --- | --- | --- |
| `/` | Landing Page | Product explanation and links to login/signup. Several marketing CTAs are presentational. |
| `/login` | Login | Email/password login, remember email, quick demo role login, role dashboard redirect. |
| `/signup` | Signup | Select researcher or industry, basic account fields, role-specific fields, accept terms, auto-login. |
| `/forgot-password` | Forgot Password | Validates known email and shows a simulated reset-email success state. |
| `/unauthorized` | Unauthorized | Shown when an authenticated user enters another role's route. |

### Researcher

| Route | Page | Purpose and Active Behavior |
| --- | --- | --- |
| `/researcher` | Dashboard | Role KPIs, recent studies, interests, meetings, and pending license approvals. |
| `/researcher/upload` | Upload Research Wizard | Four-step upload, metadata entry, mock AI analysis, draft save, final submission, admin notification. |
| `/researcher/studies` | My Studies | Search and status filter owned studies; open study detail; start upload. |
| `/researcher/studies/:id` | Study Details | Read study, engagement, lifecycle, documents, and commercialization information. Most secondary actions are presentational. |
| `/researcher/license-requests` | License Requests | List owned-study license requests and approve/reject researcher review. |
| `/researcher/license-requests/:id` | License Request Detail | Same component with selected request detail and workflow history. |
| `/researcher/copilot` | AI Copilot | Presentational assistant interface. |
| `/researcher/notifications` | Notifications | List own notifications, mark read/all read, navigate to related study/license workflow. |
| `/researcher/profile` | Profile | Presentational profile, verification, export, and deactivation controls. |

### Industry

| Route | Page | Purpose and Active Behavior |
| --- | --- | --- |
| `/industry` | Dashboard | Company-specific interests, meetings, licensing activity, recommendations, and marketplace navigation. |
| `/industry/marketplace` | Marketplace | Search/filter/sort published studies and open technology detail. |
| `/industry/technology/:id` | Technology Detail | Express interest, request meeting, request license, and open Copilot. |
| `/industry/problems` | Problem Statements | Create, edit, delete, search, and urgency-filter company problem statements. |
| `/industry/smart-match` | Smart Match | Rank matching studies and request a license from a recommendation. Several recommendation actions are presentational. |
| `/industry/meetings` | Meeting Center | List own meetings, mark a scheduled meeting completed, open summary. |
| `/industry/meetings/new` | Meeting Request Form | Select published study, create interest and pending meeting, notify admin. |
| `/industry/meetings/:id/summary` | Meeting Summary | Read-only meeting summary. |
| `/industry/licensing` | Licensing Center | List own license cases, show lifecycle, open detail/download path. |
| `/industry/licensing/:id` | License Request Detail | View/download generated agreement and upload signed agreement metadata/content. |
| `/industry/copilot` | AI Copilot | Presentational assistant interface. |
| `/industry/notifications` | Notifications | List own notifications, mark read/all read, navigate to related workflows. |
| `/industry/profile` | Company Profile | Presentational company/profile fields and logo upload. |

### Admin

| Route | Page | Purpose and Active Behavior |
| --- | --- | --- |
| `/admin` | Dashboard | Platform KPIs and compact queues. Some quick actions are presentational. |
| `/admin/review-queue` | Review Queue | List submitted/under-review studies and open review detail. Filters/tabs are presentational. |
| `/admin/review/:id` | Study Review Detail | Approve, publish, reject, or request changes; notify researcher. |
| `/admin/problems` | Problem Statement Review | Read company demand signals and calculated matching counts. |
| `/admin/interests` | Interests Expressed | View interest, schedule meeting, or complete discussion. |
| `/admin/interests/:id` | Interest Detail | Inspect company/study context and schedule a meeting. |
| `/admin/meetings` | Meeting Management | Approve/schedule pending meeting, complete scheduled meeting, open detail. |
| `/admin/meetings/:id` | Meeting Detail | Read-only meeting detail. |
| `/admin/licensing` | Licensing Management | Advance license workflow, review/download/approve signed agreement, open detail. |
| `/admin/licensing/:id` | License Detail | Advance admin-owned stages and open research review. |
| `/admin/copilot` | AI Copilot | Presentational assistant interface. |
| `/admin/audit-logs` | Audit Logs | Static audit-log table and presentational filters/export/pagination. |
| `/admin/analytics` | Analytics | Static/mock analytics visualizations. |
| `/admin/notifications` | Notifications | List admin notifications, mark read/all read, navigate to related workflow. |
| `/admin/profile` | Profile | Displays admin account and supports logout. |

## Sidebar Navigation

- Researcher: Dashboard, Upload Research, My Studies, License Requests, AI
  Copilot, Notifications, Profile Settings.
- Industry: Dashboard, Marketplace, Problems, Smart Match, Meetings, Licensing,
  AI Copilot, Notifications, Profile Settings.
- Admin: Dashboard, Review Queue, Problem Statements, Interests Expressed,
  Meeting Management, Licensing Management, AI Copilot, Audit Logs, Analytics,
  Notifications, Profile Settings.

## Forms and Uploads

| Form/Upload | Fields and Behavior | Required Backend Work |
| --- | --- | --- |
| Login | Email, password, remember me | Credential verification, access/refresh tokens, session/audit record. |
| Signup | Role, name, email, password, organization/institution, department/job title, optional sector/research area, terms | User/company/researcher profile transaction and role validation. |
| Forgot Password | Email | Reset token, expiry, delivery event, non-enumerating response. |
| Research Upload | PDF placeholder, title, abstract, domain, TRL, keywords, IP/commercial fields, consent | Multipart file storage, metadata, draft/submit transitions, review creation. |
| Problem Statement | Title, sector, description, challenges, expected solution, budget, urgency, contact, keywords | Company-owned CRUD and match recomputation. |
| Meeting Request | Technology, date/notes | Interest creation/reuse, pending meeting, admin notification. |
| Signed Agreement Upload | File input represented as name/text in POC | Multipart upload, versioned metadata, checksum, ownership, audit trail. |

No drawer component is used by the domain pages. Agreement preview and signed
agreement review are inline conditional panels rather than modal dialogs.

## Active Button and Workflow Map

| Button/Action | Source | Backend Operation | Durable Changes | Notification | Next Owner |
| --- | --- | --- | --- | --- | --- |
| Sign In | Login | Authenticate and create/rotate session | Session, last login, audit | None | Current role |
| Create Account | Signup | Create user and role profile/company | User, company/profile, session, audit | Optional welcome/admin verification | Current role/Admin |
| Save Draft | Upload Wizard | Create/update draft | Study, document metadata, audit | None | Researcher |
| Submit Study | Upload Wizard | Submit study and create review | Study `submitted`, review `pending`, audit | Admin `study_submitted` | Admin |
| Approve/Publish/Reject/Request Changes | Admin Study Review | Validate review transition | Study/review/history/audit | Researcher | Researcher or completed/published |
| Express Interest | Technology Detail | Create unique company-study interest | Interest `interested`, audit | Admin and researcher | Admin |
| Request Meeting | Technology Detail / Meeting Form | Create/reuse interest and create meeting | Interest/meeting/audit | Admin | Admin |
| Schedule/Approve Meeting | Admin Interest/Meeting pages | Schedule meeting | Meeting `scheduled`, interest `meeting_scheduled`, audit | Industry and researcher | Attendees/Admin |
| Complete Meeting/Discussion | Admin/Industry meeting pages | Complete meeting/discussion | Meeting/interest status, audit | Relevant participants recommended | Industry/Admin |
| Request License | Technology Detail / Smart Match | Create unique active license case | License `pending`, interest `license_requested`, audit | Admin | Admin |
| Approve Request | Admin Licensing | Advance license | `pending` -> `admin_approved` -> researcher review handoff, audit | Researcher | Researcher |
| Approve/Reject Licensing | Researcher License Requests | Researcher decision | `researcher_approval` -> `researcher_approved` or `rejected`, audit | Admin | Admin or closed |
| Generate Agreement | Admin Licensing | Generate versioned agreement | Agreement file/version, license `agreement_generated`, audit | Industry | Industry |
| Download Agreement | Industry License Detail | Authorize and stream file | Download audit event | None | Industry |
| Upload Signed Agreement | Industry License Detail | Store signed file/version | File metadata, license `signed_submitted`, audit | Admin | Admin |
| Approve Signed Agreement | Admin Licensing | Execute accepted agreement | License `agreement_executed`, approval/audit | Industry/researcher recommended | Admin |
| Commercialize Technology | Admin Licensing | Record commercialization | Commercialization record, license/study/interests, audit | Industry and researcher | Completed |
| Mark Notification Read/All Read | Notification pages | Update own notifications | Read timestamps | None | Current user |

## Lifecycle State Transitions

### Study

```text
draft -> submitted -> under_review -> approved -> published
under_review -> rejected
under_review -> submitted/requested changes
published -> interested -> meeting_scheduled -> license_requested
-> licensed -> commercialized
```

The frontend currently permits some direct shortcuts, including approve and
publish in one admin action. The backend must preserve intended convenience
while validating legal transitions transactionally.

### Interest

```text
interested -> meeting_scheduled -> discussion_approved
-> license_requested -> licensed
```

### Meeting

```text
pending -> approved/scheduled -> completed
pending/approved/scheduled -> cancelled
```

The frontend often moves `pending` directly to `scheduled`.

### License

```text
pending -> admin_approved -> researcher_approval -> researcher_approved
-> agreement_generated -> signed_submitted -> agreement_executed
-> commercialized
```

`rejected` is terminal and is available before execution. The current
researcher action advances both `admin_approved -> researcher_approval` and
`researcher_approval -> researcher_approved` in one click.

## Notifications and Recipients

| Event | Recipient |
| --- | --- |
| Study submitted | Admin |
| Study approved/published/rejected/changes requested | Study researcher |
| Interest submitted | Admin and study researcher |
| Meeting requested | Admin |
| Meeting scheduled/approved | Industry user and study researcher |
| License requested | Admin |
| Admin license approval | Study researcher |
| Researcher license approval/rejection | Admin |
| Agreement generated | Industry user |
| Signed agreement uploaded | Admin |
| Agreement executed | Industry user; researcher recommended |
| Commercialization completed | Industry user; researcher recommended |

## Presentational or Incomplete Controls

These visible controls currently have no complete domain behavior and require
either an API/UI implementation or explicit removal from the POC:

- Landing-page `Learn More` and some marketing CTAs.
- Researcher Study Details: Edit, Share, Download, engagement View/Respond,
  Add Document, Contact Admin, Analytics Report, Copilot.
- Researcher and Industry profile save/upload/verification/export/deactivation.
- Upload wizard Choose File, Add Author, and Re-analyze are not full workflows.
- Smart Match refresh, edit problems, browse links, full detail, and meeting
  buttons are partly presentational.
- Admin dashboard View All, quick actions, and Export Report.
- Review Queue tabs/filter/pagination.
- Study Review Save Notes.
- Admin Problem Review `Review Technologies`.
- Audit Log filters, export, tabs, and pagination.
- Copilot pages are static rather than model/API backed.
- Search/filter controls in some legacy wireframe tables are presentational.
- Notification category tabs do not filter.
- File uploads do not preserve binary files or upload history.

## Key Backend Rules Derived from Frontend

1. Every role-scoped query must derive ownership from the authenticated user,
   never from a client-provided user ID.
2. Interest must be unique per company and study.
3. A company may only interact with published technologies.
4. Researcher approval is limited to licenses for their own studies.
5. Admin-only transitions include publication, agreement generation,
   agreement execution, and commercialization.
6. Every transition that mutates more than one domain object must be a database
   transaction and must emit notifications and audit logs in the same unit of
   work.
7. Files require ownership, purpose, MIME type, size, checksum, storage key,
   version, uploader, and timestamps.
8. Notification routing requires `relatedType` and `relatedId`.
9. Company-specific industry dashboards must be keyed by `companyId`, not only
   the individual industry user ID.
10. Flexible licensing workflow type currently uses a frontend fee threshold;
    it must become an explicit, auditable backend decision/rule.

