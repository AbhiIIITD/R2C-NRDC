# Button Action Map

This document maps visible frontend actions to navigation, state changes, next owner, and backend recommendations.

| Button Name | Source Page | Destination / UI Opened | Action Performed | State Change | Notifications Generated | Next Responsible User |
| --- | --- | --- | --- | --- | --- | --- |
| Upload New Research | Researcher Dashboard | `/researcher/upload` | Opens upload wizard | None until submit | None | Researcher |
| Submit Study | Upload Research Wizard | Researcher studies/dashboard | Creates or updates study | `draft` -> `submitted` | Admin review notification recommended | Admin |
| View All | Researcher Dashboard Recent Studies | `/researcher/studies` | Opens study list | None | None | Researcher |
| View Study | Researcher License Request Details | `/researcher/studies/:id` | Opens study detail | None | None | Researcher |
| Approve Licensing | Researcher License Requests | Same page | Researcher approves request | `admin_approved` -> `researcher_approval` -> `researcher_approved` | Admin receives `researcher_license_approved` | Admin |
| Reject Licensing | Researcher License Requests | Same page | Researcher rejects request | Current license status -> `rejected` | Admin receives rejection notification | Admin |
| View Request Details | Researcher License Requests | `/researcher/license-requests/:id` | Opens routed details page | None | None | Researcher |
| Express Interest | Industry Technology Detail | Same page / Admin Interests | Creates interest record | Interest `interested` | Admin receives `interest_received` linked to `/admin/interests/:id`; Researcher receives interest notification | Admin |
| Request Meeting | Industry Technology Detail | `/industry/meetings` | Creates meeting request | Interest -> `meeting_scheduled`; Meeting `pending` | Admin receives `meeting_requested` | Admin |
| Request License | Industry Technology Detail | `/industry/licensing/:id` | Creates license request | License `pending`; Interest -> `license_requested` | Admin receives `license_requested` | Admin |
| View Details | Industry Licensing Center | `/industry/licensing/:id` | Opens license details | None | None | Industry |
| View Agreement | Industry License Detail | Inline agreement viewer | Shows generated agreement | None | None | Industry |
| Download Agreement | Industry License Detail | Browser download | Downloads generated agreement text | None | None | Industry |
| Upload Signed Agreement | Industry License Detail | File input on page | Stores signed file name/content metadata | `agreement_generated` -> `signed_submitted` | Admin receives `signed_agreement_uploaded` | Admin |
| View Details | Admin Interests Expressed | `/admin/interests/:id` | Opens selected interest details | None | None | Admin |
| Schedule Meeting | Admin Interests Expressed | Same page; meeting appears in `/admin/meetings` | Creates scheduled meeting from interest | Interest -> `meeting_scheduled`; Meeting `scheduled` | Industry and Researcher receive `meeting_scheduled` | Admin / attendees |
| Discussion Completed | Admin Interests Expressed | Same page | Marks discussion completed | Interest `meeting_scheduled` -> `discussion_approved` | Notification recommended | Admin |
| Open Meeting Management | Admin Interest Details | `/admin/meetings` | Opens meeting management | None | None | Admin |
| View Study Review | Admin Interest Details | `/admin/review/:id` | Opens study review/detail | None | None | Admin |
| Approve | Admin Meeting Management | Same page | Schedules pending meeting | Meeting `pending` -> `scheduled` | Industry receives `meeting_approved`; Researcher receives `meeting_scheduled` | Meeting attendees |
| Complete | Admin Meeting Management | Same page | Completes scheduled meeting | Meeting `scheduled` -> `completed` | Notification recommended | Admin |
| View | Admin Meeting Management | `/admin/meetings/:id` | Opens meeting detail | None | None | Admin |
| Approve Request | Admin Licensing Management / Detail | Same page | Admin approves industry request | `pending` -> `admin_approved` | Researcher receives `license_approved` | Researcher |
| Generate Agreement | Admin Licensing Management / Detail | Same page | Creates mock tripartite agreement | `researcher_approved` -> `agreement_generated`; sets `agreementTerms` | Industry receives `agreement_generated` | Industry |
| View Signed Agreement | Admin Licensing Management | Inline signed agreement review panel | Opens signed agreement preview/metadata | None | None | Admin |
| Download Signed Agreement | Admin Licensing Management | Browser download | Downloads signed agreement content/metadata | None | None | Admin |
| Approve Signed Agreement | Admin Licensing Management / Review Panel | Same page | Admin manually approves signed upload | `signed_submitted` -> `agreement_executed` | Industry receives license update | Admin |
| Commercialize Technology | Admin Licensing Management / Detail | Same page | Completes licensing workflow | `agreement_executed` -> `commercialized` | Industry receives `commercialization_completed` | Completed |
| View | Admin Licensing Management | `/admin/licensing/:id` | Opens license case detail | None | None | Admin |
| Open Workflow | Admin Notifications | Related route | Opens notification target | Marks notification read | None | Current owner |
| Open Workflow | Researcher Notifications | Related route | License notifications open `/researcher/license-requests` | Marks notification read | None | Researcher |

## Backend Recommendations By Workflow

### Industry Interest

- Required APIs: `POST /interests`, `GET /admin/interests`, `GET /interests/{id}`, `PATCH /interests/{id}/status`
- Required entities: `interests`, `studies`, `users`, `notifications`
- Status values: `interested`, `meeting_scheduled`, `discussion_approved`, `license_requested`, `licensed`
- Notifications: Admin on create; Industry/Researcher on meeting scheduled
- File uploads: None
- Permissions: Industry create; Admin manage; Researcher read for own studies

### Meeting Scheduling

- Required APIs: `POST /meetings`, `PATCH /meetings/{id}/schedule`, `PATCH /meetings/{id}/complete`, `GET /meetings`
- Required entities: `meetings`, `interests`, `studies`, `users`, `notifications`
- Status values: `pending`, `approved`, `scheduled`, `completed`, `cancelled`
- Notifications: Admin on request; Industry and Researcher on schedule/approval
- File uploads: None
- Permissions: Admin schedule/complete; Industry request/read own; Researcher read own

### Licensing

- Required APIs: `POST /licenses`, `GET /licenses/{id}`, `GET /licenses?role=...`, `PATCH /licenses/{id}/approve-admin`, `PATCH /licenses/{id}/approve-researcher`, `PATCH /licenses/{id}/reject`
- Required entities: `license_requests`, `studies`, `users`, `interests`, `meetings`, `notifications`, `audit_logs`
- Status values: `pending`, `admin_approved`, `researcher_approval`, `researcher_approved`, `agreement_generated`, `signed_submitted`, `agreement_executed`, `commercialized`, `rejected`
- Notifications: Admin on request; Researcher on admin approval; Admin on researcher approval/rejection; Industry on agreement generated and commercialization complete
- File uploads: Signed agreement upload
- Permissions: Admin approve/generate/execute/commercialize; Researcher approve own study licenses; Industry create/upload own

### Agreement Generation And Signing

- Required APIs: `POST /licenses/{id}/agreement`, `GET /licenses/{id}/agreement`, `POST /licenses/{id}/signed-agreement`, `GET /licenses/{id}/signed-agreement`, `PATCH /licenses/{id}/execute`
- Required entities: `license_agreements`, `signed_agreement_files`, `license_requests`, `users`, `studies`
- Status values: `agreement_generated`, `signed_submitted`, `agreement_executed`
- Notifications: Industry on generated agreement; Admin on signed upload
- File uploads: Signed agreement file; generated agreement download
- Permissions: Admin generate/view/download/approve; Industry view/download/upload

### Notifications

- Required APIs: `POST /notifications`, `GET /notifications?userId=...`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`
- Required entities: `notifications`, plus related domain entity IDs
- Status values: `read` boolean
- Notifications: Event-driven from study, interest, meeting, license, agreement, commercialization flows
- File uploads: None
- Permissions: Users read/update own notifications; Admin receives platform workflow notifications
