
# NRDC R2C - Research to Commercialization Platform

> **MVP Ready for Stakeholder Demo** - June 2026

## 🎯 Project Overview

NRDC R2C is a comprehensive web-based platform for managing the research-to-commercialization lifecycle. It connects researchers with industry partners to facilitate technology transfer, commercialization, and licensing.

**Perfect for:** Stakeholder demonstrations, MVP validation, and future backend integration.

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Routing:** React Router v7  
- **State Management:** React Context API
- **Data:** localStorage (easily replaceable with backend API)

### Current Project Layout
```
frontend/            React + Vite app, UI components, pages, and frontend services
backend/             Express API, Prisma schema/migrations, backend build output, and storage
docs/                Architecture and implementation notes
guidelines/          Design and product guidelines
package.json         Root scripts for frontend, backend, and Prisma commands
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Application runs on `http://localhost:5173`

---

## 🎭 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Researcher** | `dr.smith@university.edu` | `password` |
| **Industry Partner** | `mark.wilson@pharmatech.com` | `password` |
| **Admin** | `admin@nrdc.org` | `password` |

**Quick Tip:** Click role buttons on login page for instant demo access!

---

## 🔐 User Roles & Permissions

### 👨‍🔬 Researcher
- Upload studies through guided wizard
- Track commercialization progress
- Respond to industry interest
- Request/approve meetings
- Review licensing proposals
- Use AI Copilot for advice

### 🏢 Industry Partner
- Browse published research marketplace
- Express interest in technologies
- Request meetings with researchers
- Submit licensing requests
- Smart matching recommendations
- Track negotiation pipeline

### 👨‍💼 Admin
- Review & approve submissions
- Publish to marketplace
- Manage meeting requests
- Manage licensing pipeline
- Analytics dashboard
- Audit logs & monitoring

---

## 📋 Success Criteria - Demonstrated ✅

A stakeholder can now:

1. ✅ **Create an account** - Multi-step signup with role selection
2. ✅ **Login** - Full authentication with persistence
3. ✅ **Upload a study** - 4-step wizard with AI field extraction
4. ✅ **See it in dashboard** - Immediately appears in "My Studies"
5. ✅ **Submit for review** - Status changes to "submitted"
6. ✅ **Login as Admin** - Full admin access
7. ✅ **Approve it** - Study status updates to "approved"
8. ✅ **Publish it** - Study appears in marketplace
9. ✅ **Login as Industry** - Full industry portal access
10. ✅ **Discover in Marketplace** - Published studies appear with filters
11. ✅ **Express interest** - Interest recorded, researcher notified
12. ✅ **Request meeting** - Meeting request created
13. ✅ **Request license** - Licensing request submitted
14. ✅ **Track journey** - Complete pipeline visible in all dashboards

---

## 🏗️ Architecture

### Folder Structure
```
src/
├── contexts/              # State management
│   ├── AuthContext.tsx           # Auth & user state
│   └── AppDataContext.tsx        # Application data state
├── services/              # Business logic layer
│   ├── study.service.ts          # Study CRUD & workflow
│   ├── marketplace.service.ts    # Interest management  
│   ├── meeting.service.ts        # Meeting requests
│   ├── license.service.ts        # License handling
│   ├── notification.service.ts   # Notifications
│   └── analytics.service.ts      # Analytics calculations
├── types/index.ts         # TypeScript interfaces
├── lib/mockData.ts        # Mock data generator
├── components/            # Reusable UI components
│   ├── Header.tsx              # Authenticated/public headers
│   ├── ProtectedRoute.tsx      # Route protection & RBAC
│   └── ui/                     # shadcn components
└── app/
    ├── pages/              # Page components
    │   ├── public/                # Auth pages
    │   ├── researcher/            # Researcher pages
    │   ├── industry/              # Industry pages
    │   └── admin/                 # Admin pages
    ├── layouts/            # Layout wrappers
    └── routes.tsx          # Route definitions
```

### Data Flow
```
User Input → Component → Service Layer → Context → Components Re-render
                                    ↓
                            localStorage (Persistence)
```

### Key Features

#### Authentication System
- Mock authentication with localStorage
- 3-role RBAC (Researcher, Industry, Admin)
- Protected routes with role validation
- Session persistence
- Demo quick-login buttons

#### Research Upload Wizard
- Step 1: Basic Details (title, abstract, domain, TRL)
- Step 2: PDF Upload
- Step 3: AI Field Extraction (mock)
- Step 4: Review & Submit
- Auto-notification to admins

#### Study Lifecycle
- **Draft** → **Submitted** → **Under Review** → **Approved** → **Published**
- Admin can approve, reject, or request changes
- Researcher receives notifications at each stage

#### Marketplace
- Search by title/keywords
- Filter by domain
- Filter by readiness score
- Study cards show TRL, readiness, market potential
- One-click to technology detail page

#### Engagement Tracking
- **Interests:** Track which companies are interested
- **Meetings:** Schedule and manage calls
- **Licenses:** Full licensing workflow with agreements
- **Notifications:** Real-time alerts for all actions

#### Analytics Dashboard
- KPI cards (Total studies, Approved, Published, Interests, Meetings)
- Commercialization funnel visualization
- Domain distribution
- Recent activity timeline
- Per-researcher statistics

---

## 🔄 Complete User Flows

### Researcher: Upload to Licensing

```
Signup (Select Researcher) 
  ↓
Dashboard (View KPIs)
  ↓
Upload Study (4-step wizard)
  ↓
My Studies (Status: Submitted)
  ↓
Wait for Admin Review (Notification received)
  ↓
My Studies (Status: Approved)
  ↓
Study Published to Marketplace (Notification)
  ↓
Industry Interest Received (Notification)
  ↓
Meeting Request Received (Approve/Schedule)
  ↓
License Request Received (Review/Approve)
  ↓
License Signed (Complete)
```

### Industry: Discovery to Licensing

```
Signup (Select Industry)
  ↓
Dashboard (Browse Marketplace button)
  ↓
Marketplace (Search, filter, discover studies)
  ↓
Technology Detail (View full information)
  ↓
Express Interest (Study added to My Interests)
  ↓
Request Meeting (Propose date/time)
  ↓
Meeting Scheduled (Receive video link)
  ↓
Request License (Submit proposal)
  ↓
License Agreement (Review & sign)
  ↓
License Active (Appears in Licensing Center)
```

### Admin: Review & Publish

```
Login as Admin
  ↓
Review Queue (See pending studies)
  ↓
Review Detail (Read study, AI-extracted fields)
  ↓
Approve Study (Status changes to Approved)
  ↓
Publish Study (Status changes to Published)
  ↓
Researcher Notified
  ↓
Study Appears in Marketplace
```

---

## 🛠️ Service Layer (API-Ready)

All business logic is abstracted into services, making future API integration seamless:

```typescript
// Current: localStorage implementation
async function createStudy(study: Study): Promise<Study> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  // Store in localStorage
  localStorage.setItem('app_studies', JSON.stringify([...studies, study]));
  return study;
}

// Future: Just replace with:
async function createStudy(study: Study): Promise<Study> {
  const response = await fetch('/api/studies', {
    method: 'POST',
    body: JSON.stringify(study)
  });
  return response.json();
}
```

### Service Files Ready for API Integration
- `src/services/study.service.ts` - Study management
- `src/services/marketplace.service.ts` - Interests
- `src/services/meeting.service.ts` - Meetings
- `src/services/license.service.ts` - Licensing
- `src/services/notification.service.ts` - Notifications
- `src/services/analytics.service.ts` - Analytics

---

## 📚 Detailed Documentation

See **[docs/application-flow.md](docs/application-flow.md)** for:
- Detailed step-by-step flows
- Entity relationship diagram
- State transitions
- Integration points
- Future API endpoints

---

## 🗄️ Data Models

### Study
```typescript
{
  id: string;
  title: string;
  abstract: string;
  domain: ResearchDomain;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'rejected';
  trl: 1-9;
  readinessScore: number;
  researcherId: string;
  researcherName: string;
  createdAt: Date;
  // ... more fields
}
```

### Interest
```typescript
{
  id: string;
  studyId: string;
  industryUserId: string;
  status: 'interested' | 'meeting_scheduled' | 'license_requested' | 'licensed';
  createdAt: Date;
}
```

### Meeting
```typescript
{
  id: string;
  studyId: string;
  researcherId: string;
  industryUserId: string;
  status: 'pending' | 'approved' | 'scheduled' | 'completed';
  scheduledDate?: Date;
  meetingLink?: string;
}
```

### License
```typescript
{
  id: string;
  studyId: string;
  industryUserId: string;
  status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'signed';
  licenseFee?: number;
  agreementTerms?: string;
}
```

---

## 🔌 Mock Data

The platform includes realistic mock data:

**6 Pre-loaded Studies** across domains:
- Advanced Biodegradable Polymer Development (Published)
- AI-Powered Diagnostic Imaging System (Published)
- Precision Agriculture IoT Platform (Published)
- Renewable Energy Storage Solution (Submitted)
- Quantum Computing Algorithm Framework (Under Review)
- Sustainable Textile Manufacturing (Draft)

**3 Demo Users:**
- 2 Researchers with complete profiles
- 2 Industry partners with companies
- 1 Admin user

**Realistic Metadata:**
- Market sizes ($15B - $250B+)
- TRL levels (2-8)
- Readiness scores (45-85%)
- IP statuses (Patents, pending, filed)
- Competitor analysis

---

## 🚀 Pages Implemented

### Public Pages (No Login Required)
- ✅ Landing Page
- ✅ Login Page (with quick demo login)
- ✅ Signup Page (multi-step)
- ✅ Forgot Password Page

### Researcher Pages (Login Required - Researcher Role)
- ✅ Dashboard (KPIs, recent studies)
- ✅ Upload Research (4-step wizard)
- ✅ My Studies (search, filter)
- ✅ Study Details (view, edit, track engagement)
- ✅ AI Copilot (mock responses)
- ✅ Notifications
- ✅ Profile

### Industry Pages (Login Required - Industry Role)
- ✅ Dashboard (KPIs, quick actions)
- ✅ Marketplace (search, filter, discovery)
- ✅ Technology Detail (full view, actions)
- ✅ Smart Match (recommendations)
- ✅ Meeting Center (requests, scheduling)
- ✅ Licensing Center (requests, tracking)
- ✅ AI Copilot (market analysis)
- ✅ Notifications
- ✅ Profile

### Admin Pages (Login Required - Admin Role)
- ✅ Dashboard (KPIs, analytics)
- ✅ Review Queue (studies awaiting approval)
- ✅ Study Review Detail (full review interface)
- ✅ Meeting Management (all meetings)
- ✅ Licensing Management (all licenses)
- ✅ Audit Logs
- ✅ Analytics Dashboard

---

## 🔒 Security Notes

**Current (MVP):**
- localStorage persistence
- Client-side authentication
- No encryption (for demo only)
- Same-origin only

**For Production:**
- [ ] Move to backend authentication
- [ ] Implement JWT tokens
- [ ] Add HTTPS
- [ ] Encrypt sensitive data
- [ ] Add CORS protection
- [ ] Rate limiting
- [ ] Input validation & sanitization

---

## 🌐 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Deployment Options
- **Vercel** (Recommended - Git connected)
- **Netlify** (GitHub integration)
- **AWS S3 + CloudFront**
- **Docker** (Any hosting)

---

## 📊 Analytics & Monitoring

### KPI Dashboards
- Total studies submitted
- Studies approved vs published
- Industry interest count
- Meetings scheduled
- Licenses signed
- Commercialization funnel

### Funnel Visualization
```
Total Studies → Submitted → Approved → Published → Interests → Meetings → Licenses
```

---

## 🔮 Future Enhancements

### Phase 2 (Backend Integration)
- [ ] API integration (replace localStorage)
- [ ] Database (PostgreSQL)
- [ ] Authentication (JWT)
- [ ] File uploads (AWS S3)
- [ ] Email notifications

### Phase 3 (Advanced Features)
- [ ] Real AI models (Readiness scoring)
- [ ] Real LLM Copilot (GPT-4 integration)
- [ ] Video conferencing (Zoom/Jitsi)
- [ ] Digital signatures
- [ ] Advanced analytics

### Phase 4 (Scale)
- [ ] Machine learning recommendations
- [ ] Bulk operations
- [ ] API rate limiting
- [ ] Multi-language support
- [ ] Mobile app

---

## 🧪 Testing Scenarios

### Scenario 1: End-to-End Commercialization
1. Create researcher account
2. Upload study (4-step wizard)
3. Verify in My Studies
4. Login as admin
5. Approve study
6. Publish study
7. Login as industry
8. Find in marketplace
9. Express interest
10. Verify notifications flow

### Scenario 2: Meeting & Licensing
1. (From scenario 1)
2. Industry requests meeting
3. Researcher approves
4. Meeting scheduled
5. Industry requests license
6. Admin approves license
7. Agreement generated
8. Verify license signed

### Scenario 3: Filtering & Search
1. Go to marketplace
2. Search by keyword
3. Filter by domain
4. Filter by readiness score
5. Verify filtered results

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Data not persisting | Check browser localStorage is enabled (Settings → Privacy → Cookies) |
| Login fails | Use demo credentials exactly, try incognito mode |
| Routes not working | Ensure logged in and have correct role |
| Components not rendering | Clear browser cache and reload |
| localStorage full | Clear browser data and start fresh |

---

## 📞 Support

**Documentation:**
- README.md (this file)
- [docs/application-flow.md](docs/application-flow.md) - Detailed flows
- TypeScript types in `src/types/index.ts`
- Service functions in `src/services/`

**Code Structure:**
- Components in `src/components/`
- Pages in `src/app/pages/`
- Context providers in `src/contexts/`
- Business logic in `src/services/`

---

## 📄 License

Confidential - NRDC Internal Use Only

---

**Version:** 1.0.0 MVP  
**Status:** ✅ Ready for Stakeholder Demo  
**Last Updated:** June 2026  

**Next Steps:** Backend API integration, database setup, and production deployment preparation.

---

## Product Workflow Architecture

This MVP is prepared for stakeholder presentation as an end-to-end business workflow system. The current frontend uses localStorage, but every screen and action is mapped to a future backend implementation.

Required flow documents:

- [Application Flow](docs/application-flow.md): role journeys, UI flow, state flow, dashboard updates, and stakeholder demo sequence.
- [Backend Flow](docs/backend-flow.md): user action -> frontend state -> backend API -> database collections -> notification -> next workflow state.
- [Backend API Design](docs/backend-api-design.md): endpoint contracts, data model, RBAC, lifecycle transitions, and route-to-API mapping.
- [Frontend Workflow Architecture](docs/frontend-workflow-architecture.md): current role menus, pages, state transitions, ownership, workflow diagrams, and backend integration points.
- [Button Action Map](docs/button-action-map.md): button-by-button source, destination, action, state change, notification, and next owner mapping.

Core commercialization lifecycle:

```text
Research Upload -> AI Analysis -> Admin Review -> Marketplace Publication
-> Industry Interest -> Meeting -> Licensing -> Commercialization
```

Updated licensing lifecycle:

```text
Request License -> Admin Approval -> Researcher Approval -> Agreement Generation
-> Agreement Pending Signature -> Signed Agreement Submitted
-> Agreement Executed -> Commercialized
```

The frontend POC models this as a multi-stakeholder flow with mock state and notifications. Industry submits the request, Admin approves or rejects it, the Researcher approves or rejects licensing, Admin generates a tripartite agreement among NRDC, the Researcher/Inventor, and the Industry Partner, Industry views/downloads/uploads the signed agreement, and Admin verifies, executes, and commercializes the technology. Admin licensing views show current owner, current stage, pending action, and next step for each case.

The generated mock agreement includes technology details, licensor and licensee information, terms negotiation, royalty structure, premium amount, exclusivity rights, commercialization rights, duration, termination clauses, and signatures. Terms negotiation explicitly covers NRDC negotiating premium, royalty rates, exclusivity rights, and commercialization conditions with the prospective receiver.

Industry Interest now notifies Admin immediately when `Express Interest` is clicked. The notification includes industry name, organization, contact person, email, phone, technology interested in, and date. Admin Dashboard includes `Industry Interest Requests` with view details, schedule meeting, and approve discussion actions, while Industry Dashboard displays `Interest Submitted`, `Meeting Scheduled`, and `Discussion Approved`.

Every completed feature should continue to document:

- UI flow
- State flow
- Backend flow
- API design
- Database design

### Current Route Structure

| Role | Routes |
| --- | --- |
| Public | `/`, `/login`, `/signup`, `/forgot-password` |
| Researcher | `/researcher`, `/researcher/upload`, `/researcher/studies`, `/researcher/studies/:id`, `/researcher/copilot`, `/researcher/notifications`, `/researcher/profile` |
| Industry | `/industry`, `/industry/marketplace`, `/industry/technology/:id`, `/industry/problems`, `/industry/smart-match`, `/industry/meetings`, `/industry/licensing`, `/industry/copilot`, `/industry/notifications`, `/industry/profile` |
| Admin | `/admin`, `/admin/review-queue`, `/admin/review/:id`, `/admin/problems`, `/admin/meetings`, `/admin/licensing`, `/admin/copilot`, `/admin/audit-logs`, `/admin/analytics`, `/admin/profile` |

### Backend-Ready Workflow Summary

| Feature | MVP State | Future Backend |
| --- | --- | --- |
| Authentication | `AuthContext` plus localStorage session persistence. | `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`; `users` and `sessions`. |
| Research Submission | `studies` array with lifecycle statuses. | `/studies`, `/studies/{id}/analyze`, `/studies/{id}/submit`; `studies`, `study_reviews`, `notifications`. |
| Admin Review | Admin review pages mutate study status. | `/reviews`, `/studies/{id}/approve`, `/reject`, `/publish`; audit and notification events. |
| Marketplace | Published studies are searchable and filterable. | `/marketplace/technologies`; search indexes over title, keywords, domain, researcher, abstract. |
| Problem Statements | Industry demand records feed Smart Match and admin visibility. | `/problem-statements`; `problem_statements` with keyword extraction. |
| Smart Match | Recommendations use problem keywords, sector, domain, and readiness. | `/smart-match/recommendations`; ranking service with explainable scores. |
| Meetings | Meeting records move pending, approved, scheduled, completed. | `/meetings`, `/meetings/{id}/approve`, `/schedule`, `/complete`. |
| Licensing | License records move license requested, admin approved, researcher approved, agreement generated, signed submitted, agreement executed, commercialized, or rejected. | `/licenses`, `/licenses/{id}/approve`, `/reject`, `/generate-agreement`, `/upload-signed-agreement`, `/execute`, `/commercialize`. |
| Notifications | Notifications appear across role dashboards. | `/notifications`; domain-event-driven notification service. |
| AI Copilot | Chat sessions persist in app state. | `/copilot/chat`; context retrieval from studies, problems, meetings, licenses, analytics. |

### Latest Demo-Readiness Updates

- Authenticated layouts now include visible Logout actions.
- Researcher Dashboard uses live study, interest, and meeting data.
- Industry Problem Statements support create, search, urgency filter, edit, and delete.
- Researcher, Industry, and Admin notification pages are backed by persisted notification state.
- Meeting and licensing action buttons now navigate to or update the relevant workflow.
  
