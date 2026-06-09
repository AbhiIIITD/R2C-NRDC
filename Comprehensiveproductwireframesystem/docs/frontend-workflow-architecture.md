# Frontend Workflow Architecture

This document describes the current React + TypeScript + Vite frontend POC. The app uses role-based routes, shared mock state in `AppDataContext`, mock users/data in `src/lib/mockData.ts`, and persisted browser `localStorage`. These notes are implementation guidance for backend planning only; no backend code is implemented in the POC.

## Application Architecture Overview

- App shell: `src/app/App.tsx`, `src/app/routes.tsx`
- Role layouts: `ResearcherLayout`, `IndustryLayout`, `AdminLayout`
- Shared state: `AppDataContext`
- Auth/session mock: `AuthContext`
- Mock data: `MOCK_STUDIES`, `MOCK_INTERESTS`, `MOCK_MEETINGS`, `MOCK_LICENSE_REQUESTS`, `MOCK_NOTIFICATIONS`
- Shared UI patterns: `WireframeCard`, `WireframeTable`, `WireframeButton`, `StatusBadge`, `LicenseLifecycleStepper`
- Persistence: localStorage keys `app_studies`, `app_interests`, `app_meetings`, `app_license_requests`, `app_notifications`

## Sidebar Navigation Structure

### Researcher

- Dashboard: `/researcher`
- Upload Research: `/researcher/upload`
- My Studies: `/researcher/studies`
- License Requests: `/researcher/license-requests`, detail route `/researcher/license-requests/:id`
- AI Copilot: `/researcher/copilot`
- Notifications: `/researcher/notifications`
- Profile Settings: `/researcher/profile`

### Industry User

- Dashboard: `/industry`
- Marketplace: `/industry/marketplace`
- Technology Detail: `/industry/technology/:id`
- Problem Statements: `/industry/problems`
- Smart Match: `/industry/smart-match`
- Meetings: `/industry/meetings`
- Licensing: `/industry/licensing`, detail route `/industry/licensing/:id`
- AI Copilot: `/industry/copilot`
- Notifications: `/industry/notifications`
- Profile: `/industry/profile`

### Admin

- Dashboard: `/admin`
- Review Queue: `/admin/review-queue`
- Problem Statements: `/admin/problems`
- Interests Expressed: `/admin/interests`, detail route `/admin/interests/:id`
- Meeting Management: `/admin/meetings`, detail route `/admin/meetings/:id`
- Licensing Management: `/admin/licensing`, detail route `/admin/licensing/:id`
- AI Copilot: `/admin/copilot`
- Audit Logs: `/admin/audit-logs`
- Analytics: `/admin/analytics`
- Notifications: `/admin/notifications`
- Profile Settings: `/admin/profile`

## Researcher Workflow

1. Upload research from `/researcher/upload`.
2. Track studies in `/researcher/studies`.
3. Receive notifications for study approval, interest, meetings, and licensing.
4. Review license requests in `/researcher/license-requests`.
5. Open `/researcher/license-requests/:id` to see study title, researcher information, industry information, organization details, licensing type, request date, status, interest history, meeting history, notes, and commercialization information.
6. Approve Licensing moves the license to `researcher_approved`, notifies Admin, and makes Admin the next owner for Agreement Generation.
7. Reject Licensing moves the license to `rejected` and notifies Admin.

## Industry Workflow

1. Browse `/industry/marketplace`.
2. Open `/industry/technology/:id`.
3. Express Interest creates an `Interest` record with status `interested` and notifies Admin.
4. Request Meeting creates or updates an interest, creates a meeting record, and notifies Admin.
5. Request License creates a `LicenseRequest` with status `pending` and notifies Admin.
6. After Admin generates an agreement, Industry opens `/industry/licensing/:id`, views/downloads the agreement, uploads the signed agreement, and moves status to `signed_submitted`.
7. Uploading signed agreement notifies Admin; Admin must review and approve manually.

## Admin Workflow

1. Review submitted studies in `/admin/review-queue`.
2. Manage expressed interests in `/admin/interests`.
3. Schedule meetings from `/admin/interests` or manage them in `/admin/meetings`.
4. Manage licenses from `/admin/licensing`.
5. Approve License Request moves ownership to the Researcher and sends a researcher notification.
6. Generate Agreement is enabled after Researcher approval.
7. Signed agreements appear in `/admin/licensing` with View Signed Agreement, Download Signed Agreement, and Approve Signed Agreement.
8. Approve Signed Agreement moves status to `agreement_executed`.
9. Commercialize Technology moves status to `commercialized`.

## Commercialization Workflow

```text
Research Upload -> AI Analysis -> Admin Review -> Marketplace Publication
-> Industry Interest -> Meeting -> Licensing -> Agreement Signing
-> Agreement Execution -> Commercialization
```

## Industry Interest Workflow

Status values:

- `interested`: Interest Expressed
- `meeting_scheduled`: Meeting Scheduled
- `discussion_approved`: Discussion Completed
- `license_requested`: Licensing Requested
- `licensed`: Licensed

Flow:

```text
Industry Expresses Interest
-> Interest record created
-> Admin notified
-> Admin opens /admin/interests/:id
-> Admin schedules meeting
-> Meeting record created
-> Industry and Researcher notified
-> Status = meeting_scheduled
```

Recommended backend APIs:

- `POST /interests`
- `GET /admin/interests`
- `GET /interests/{id}`
- `PATCH /interests/{id}/status`
- `POST /interests/{id}/schedule-meeting`

Recommended entities:

- `interests`
- `studies`
- `users`
- `meetings`
- `notifications`

Required permissions:

- Industry can create interests for published studies.
- Admin can view all interests and schedule meetings.
- Researcher can view interests tied to their studies.

## Meeting Scheduling Workflow

Status values:

- `pending`
- `approved`
- `scheduled`
- `completed`
- `cancelled`

Flow:

```text
Interest Expressed -> Admin Schedule Meeting -> Meeting Scheduled
-> Researcher/Industry notified -> Admin marks Complete
```

Recommended APIs:

- `POST /meetings`
- `PATCH /meetings/{id}/schedule`
- `PATCH /meetings/{id}/complete`
- `GET /meetings?role=admin|researcher|industry`

## Licensing Workflow

Status values:

- `pending`: License Requested, Admin owner
- `admin_approved`: Admin Approved, Researcher owner
- `researcher_approval`: Researcher Review Pending, Researcher owner
- `researcher_approved`: Agreement Generation, Admin owner
- `agreement_generated`: Agreement Pending Signature, Industry owner
- `signed_submitted`: Signed Agreement Submitted, Admin owner
- `agreement_executed`: Agreement Executed, Admin owner
- `commercialized`: Commercialized, completed
- `rejected`: Closed

Flow:

```text
Industry Request License
-> Admin Approves Request
-> Researcher License Requests queue
-> Researcher Approves Licensing
-> Admin Generates Agreement
-> Industry Downloads Agreement
-> Industry Uploads Signed Agreement
-> Admin Views/Downloads Signed Agreement
-> Admin Approves Signed Agreement
-> Admin Commercializes Technology
```

Recommended APIs:

- `POST /licenses`
- `GET /licenses?owner=researcher|admin|industry`
- `GET /licenses/{id}`
- `PATCH /licenses/{id}/approve-admin`
- `PATCH /licenses/{id}/approve-researcher`
- `PATCH /licenses/{id}/reject`
- `POST /licenses/{id}/agreement`
- `POST /licenses/{id}/signed-agreement`
- `GET /licenses/{id}/signed-agreement`
- `PATCH /licenses/{id}/execute`
- `PATCH /licenses/{id}/commercialize`

Recommended entities:

- `license_requests`
- `license_agreements`
- `signed_agreement_files`
- `studies`
- `users`
- `notifications`
- `audit_logs`

Required file uploads:

- Signed agreement upload by Industry.
- Generated agreement download for Industry.
- Signed agreement view/download for Admin.

Required permissions:

- Industry can request licenses and upload signed agreements for their own requests.
- Admin can approve requests, generate agreements, review signed agreements, execute agreements, and commercialize.
- Researcher can approve/reject license requests for their own studies.

## Agreement Generation & Signing Workflow

```text
Researcher Approved
-> Admin Generate Agreement
-> agreementTerms created
-> Status = agreement_generated
-> Industry notified
-> Industry View/Download Agreement
-> Industry Upload Signed Agreement
-> signedAgreementFileName and signedAgreementContent stored in mock state
-> Status = signed_submitted
-> Admin notified
-> Admin View/Download Signed Agreement
-> Admin Approve Signed Agreement
-> Status = agreement_executed
```

Admin must manually review the signed agreement before approval. The frontend does not auto-execute agreements after upload.

## Notification Flow

- Industry Express Interest -> Admin receives `interest_received`, opens `/admin/interests/:id`
- Admin Schedule Meeting -> Industry and Researcher receive `meeting_scheduled`
- Industry Request License -> Admin receives `license_requested`
- Admin Approve Request -> Researcher receives `license_approved`, opens `/researcher/license-requests`
- Researcher Approve License -> Admin receives `researcher_license_approved`
- Admin Generate Agreement -> Industry receives `agreement_generated`
- Industry Upload Signed Agreement -> Admin receives `signed_agreement_uploaded`
- Admin Commercialize -> Industry receives `commercialization_completed`

Recommended API:

- `POST /notifications`
- `GET /notifications?userId=...`
- `PATCH /notifications/{id}/read`

## Role Ownership Transitions

```text
Interest Expressed: Admin
Meeting Scheduled: Admin/Researcher/Industry
License Requested: Admin
Admin Approved: Researcher
Researcher Approved: Admin
Agreement Generated: Industry
Signed Agreement Submitted: Admin
Agreement Executed: Admin
Commercialized: Completed
```

## Dashboard-To-Page Navigation Mapping

- Researcher Dashboard license cards -> `/researcher/license-requests/:id`
- Researcher notification for license -> `/researcher/license-requests`
- Industry technology detail -> interest, meeting, or license flows
- Industry licensing card -> `/industry/licensing/:id`
- Admin notification for interest -> `/admin/interests/:id`
- Admin notification for license -> `/admin/licensing/:id`
- Admin License Management View -> `/admin/licensing/:id`
- Admin Interests Expressed View Details -> `/admin/interests/:id`

## State Transition Diagrams

### Interest

```text
interested -> meeting_scheduled -> discussion_approved -> license_requested -> licensed
```

### License

```text
pending -> admin_approved -> researcher_approval -> researcher_approved
-> agreement_generated -> signed_submitted -> agreement_executed -> commercialized
```

Rejected can occur from pending, admin approved, researcher review, researcher approved, agreement generated, or signed submitted stages.

## Broken, Unused, Or Incomplete Flows Found

- Admin Dashboard still contains a compact `Industry Interest Requests` section, but `/admin/interests` is now the canonical management page.
- Search/filter controls in several wireframe tables are presentational only and do not filter state yet.
- Meeting scheduling uses a direct mock creation flow rather than a full date/time modal.
- Uploaded binary signed agreements are represented by metadata text in the frontend POC.
- Analytics are mock/local calculations and should be replaced by backend aggregation.

## Pending Backend Integration Points

- Authentication/session persistence
- Role-based permissions enforcement
- Study lifecycle APIs
- Interest creation and admin management APIs
- Meeting scheduling APIs
- License lifecycle APIs
- Agreement generation service
- File upload/storage for signed agreements
- Notification event service
- Audit logging
- Analytics aggregation
