# NRDC R2C - Application Flow Documentation

**Complete guide to user journeys, data flow, and system architecture**

---

## Table of Contents
1. [Overview](#overview)
2. [User Registration & Authentication](#user-registration--authentication)
3. [Researcher Workflow](#researcher-workflow)
4. [Industry Workflow](#industry-workflow)
5. [Admin Workflow](#admin-workflow)
6. [Data Architecture](#data-architecture)
7. [State Management](#state-management)
8. [Service Layer](#service-layer)
9. [Notifications System](#notifications-system)
10. [Future API Integration](#future-api-integration)

---

## Overview

NRDC R2C orchestrates a complete commercialization pipeline connecting researchers with industry partners. The platform handles:

- **User Management:** 3 distinct roles with RBAC
- **Research Lifecycle:** From draft to published marketplace
- **Engagement:** Interest, meetings, licensing
- **Analytics:** Funnel tracking and KPIs
- **Notifications:** Real-time alerts for all actions

Current implementation detail for backend handoff is maintained in:

- [Frontend Workflow Architecture](frontend-workflow-architecture.md)
- [Button Action Map](button-action-map.md)

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    React Components UI                   │
├─────────────────────────────────────────────────────────┤
│            Context API (AuthContext, AppDataContext)    │
├─────────────────────────────────────────────────────────┤
│                   Service Layer (6 services)             │
├─────────────────────────────────────────────────────────┤
│          localStorage (Mock) → Future: Backend API       │
└─────────────────────────────────────────────────────────┘
```

---

## User Registration & Authentication

### Signup Flow

```
START: Landing Page
  ↓
Click "Get Started"
  ↓
Select Role (Researcher / Industry)
  ↓
FORM SUBMISSION
│
├─ Researcher Path:
│   ├─ Enter: Name, Email, Password, Confirm Password
│   ├─ Enter: Institution
│   └─ Accept Terms
│
└─ Industry Path:
    ├─ Enter: Name, Email, Password, Confirm Password
    ├─ Enter: Company Name
    └─ Accept Terms
  ↓
SignupPage.tsx calls useAuth().signup()
  ↓
AuthContext Validation:
  ├─ Email format validation
  ├─ Password length check (min 6 chars)
  ├─ Password match check
  └─ Email uniqueness check
  ↓
User Created + Stored in localStorage['all_users']
  ↓
Password hashed + Stored in localStorage['user_passwords']
  ↓
Auto-login user
  ↓
Navigate to Dashboard (by role)
```

### Login Flow

```
LoginPage.tsx
  ↓
User enters Email + Password
  ↓
useAuth().login(email, password)
  ↓
AuthContext checks:
  ├─ User exists in all_users
  ├─ Password matches user_passwords
  └─ Return user object if valid
  ↓
Store in localStorage['auth_user']
  ↓
Set AuthContext.user = user
  ↓
RoleRedirect routes to dashboard:
  ├─ researcher → /researcher
  ├─ industry → /industry
  └─ admin → /admin
```

### Session Management

```
On App Load:
  ↓
App.tsx → AuthProvider
  ↓
useEffect checks localStorage['auth_user']
  ↓
If found:
  ├─ Restore user session
  ├─ Set AuthContext.user
  └─ User stays logged in
  ↓
If not found:
  └─ Redirect to /login
```

---

## Researcher Workflow

### Complete Researcher Journey

```
┌─────────────────────────────────────────────────────────────┐
│ RESEARCHER COMPLETE JOURNEY (14 Steps)                       │
└─────────────────────────────────────────────────────────────┘

1. ACCOUNT CREATION
   └─ SignupPage → Role: Researcher → Create account

2. LOGIN
   └─ LoginPage → Email + Password → Access Researcher Portal

3. DASHBOARD VIEW
   └─ ResearcherDashboard
      ├─ KPI Cards:
      │  ├─ Total Studies
      │  ├─ Approved Studies
      │  ├─ Industry Interests
      │  └─ Meetings Scheduled
      ├─ Recent Studies List
      └─ Quick Actions

4. STUDY UPLOAD
   └─ UploadResearchWizard (4-step)
      ├─ Step 1: Basic Details
      │  ├─ Title
      │  ├─ Abstract
      │  ├─ Research Domain
      │  ├─ TRL Level (1-9)
      │  └─ Keywords
      ├─ Step 2: PDF Upload
      │  ├─ Drag & drop
      │  └─ File validation
      ├─ Step 3: AI Extraction (Mock)
      │  ├─ Commercial Potential
      │  ├─ Market Size
      │  ├─ Competitors
      │  └─ IP Status
      └─ Step 4: Review & Submit
         ├─ Review all fields
         └─ Submit for admin review

5. STUDY CREATED
   └─ Status: DRAFT
   └─ Stored in localStorage['app_studies']
   └─ Notification sent to admin

6. VIEW MY STUDIES
   └─ MyStudies.tsx
      ├─ List all researcher's studies
      ├─ Search by title/keywords
      ├─ Filter by status
      ├─ View status badges
      │  ├─ Draft (gray)
      │  ├─ Submitted (blue)
      │  ├─ Under Review (yellow)
      │  ├─ Approved (green)
      │  ├─ Published (blue)
      │  └─ Rejected (red)
      └─ Click to view details

7. STUDY SUBMITTED
   └─ MyStudies → Click Study → Submit Button
   └─ Status changes to: SUBMITTED
   └─ Admin notification sent

8. WAIT FOR ADMIN REVIEW
   └─ MyStudies shows "Under Review"
   └─ Researcher dashboard shows status
   └─ Notification bell shows pending

9. ADMIN APPROVAL
   └─ (See Admin Workflow → Study Review)
   └─ Status changes to: APPROVED
   └─ Researcher receives notification

10. STUDY PUBLISHED
    └─ Admin publishes to marketplace
    └─ Status changes to: PUBLISHED
    └─ Researcher receives notification

11. INDUSTRY INTEREST RECEIVED
    └─ Header notifications badge increases
    └─ MyStudies shows "X interests"
    └─ Study detail shows interested companies
    └─ Notification: "[Company] expressed interest"

12. MEETING REQUEST
    └─ Header notification: "Meeting request from [Company]"
    └─ StudyDetails shows meeting request
    └─ Researcher can approve/schedule
    └─ Once approved: Meeting appears in Meeting Center

13. LICENSE REQUEST
    └─ Header notification: "License request from [Company]"
    └─ License details show in system
    └─ Terms visible with market fee

14. COMPLETE JOURNEY
    └─ All metrics visible in dashboard
    └─ Can view interests, meetings, licenses
    └─ Track commercialization progress
```

### Key Researcher Pages

#### ResearcherDashboard
```typescript
Display KPIs:
- Total Studies: Count all studies where researcherId = user.id
- Approved Studies: Count studies with status = 'approved'
- Industry Interests: Count interests for this researcher's studies
- Meetings: Count meetings for this researcher's studies

Recent Studies List:
- Show last 5 studies
- Status badge
- Industry interest count
- Last modified date

Quick Actions:
- [Upload New Study] → /researcher/upload
- [View All Studies] → /researcher/studies
- [Meetings] → /researcher/meetings (future)
- [Licenses] → /researcher/licenses (future)
```

#### UploadResearchWizard
```typescript
Step 1: Basic Details
  Form inputs:
  - title (required, min 10 chars)
  - abstract (required, min 50 chars)
  - domain (dropdown, required)
  - trl (dropdown 1-9, required)
  - keywords (comma-separated)
  
  Progress bar: 25%

Step 2: PDF Upload
  - Drag & drop area or file picker
  - File validation: .pdf only
  - Show file size
  
  Progress bar: 50%

Step 3: AI Extraction (Mock)
  - Simulate 2-second API call
  - Display extracted fields:
    - commercial_potential
    - market_size
    - competitors
    - ip_status
  - Allow editing
  
  Progress bar: 75%

Step 4: Review & Submit
  - Display summary of all fields
  - Confirm submission
  - Create Study object:
    {
      title,
      abstract,
      domain,
      trl,
      researcherId,
      status: 'draft',
      readinessScore: calculateScore(),
      createdAt: new Date()
    }
  - Add to localStorage['app_studies']
  - Create notification for admins
  - Redirect to /researcher/studies
  
  Progress bar: 100%
```

#### MyStudies
```typescript
Display:
- Search input (searches title, domain, keywords)
- Status filter dropdown (all/draft/submitted/under_review/approved/published/rejected)
- Studies list:
  For each study:
  - Title (clickable → StudyDetails)
  - Domain badge
  - TRL level
  - Readiness score
  - Status badge (color-coded)
  - Industry interest count
  - Last modified

Actions:
- Click study → StudyDetails
- [Upload New Study] → /researcher/upload
```

---

## Industry Workflow

### Complete Industry Journey

```
┌─────────────────────────────────────────────────────────────┐
│ INDUSTRY COMPLETE JOURNEY (14 Steps)                         │
└─────────────────────────────────────────────────────────────┘

1. ACCOUNT CREATION
   └─ SignupPage → Role: Industry → Create account

2. LOGIN
   └─ LoginPage → Email + Password → Access Industry Portal

3. DASHBOARD VIEW
   └─ IndustryDashboard
      ├─ KPI Cards:
      │  ├─ Available Studies (published count)
      │  ├─ My Interests (interest count)
      │  ├─ Meetings (scheduled count)
      │  └─ Active Licenses
      ├─ Recent interests
      └─ Quick actions

4. BROWSE MARKETPLACE
   └─ IndustryDashboard or click "Explore Marketplace"
   └─ Navigate to /industry/marketplace

5. MARKETPLACE DISCOVERY
   └─ Marketplace.tsx
      ├─ Search bar (title/keywords)
      ├─ Domain filter (dropdown)
      ├─ Readiness score filter (slider 0-100%)
      ├─ Study cards showing:
      │  ├─ Title
      │  ├─ TRL level
      │  ├─ Readiness score
      │  ├─ Market size
      │  ├─ Industry interest count
      │  └─ [View Details] button
      └─ Click card → TechnologyDetail

6. TECHNOLOGY DETAIL VIEW
   └─ TechnologyDetail.tsx (/industry/technology/:id)
      ├─ Full study information:
      │  ├─ Title, Abstract
      │  ├─ Researcher name
      │  ├─ Domain, TRL
      │  ├─ Readiness score
      │  ├─ Market size
      │  ├─ Competitors
      │  ├─ IP status
      │  └─ Commercial potential
      ├─ Industry interest count
      └─ Action buttons:
         ├─ [Express Interest]
         ├─ [Request Meeting]
         ├─ [Request License]
         └─ [Ask AI] (mock)

7. EXPRESS INTEREST
   └─ TechnologyDetail → Click "Express Interest"
   └─ Create Interest record:
      {
        studyId,
        industryUserId,
        status: 'interested',
        createdAt: new Date()
      }
   └─ Store in localStorage['app_interests']
   └─ Researcher receives notification
   └─ Button changes to "✓ Interest Expressed"

8. MY INTERESTS VIEW
   └─ Dashboard shows "My Interests" count
   └─ Can click to see list of interested studies
   └─ Shows status for each interest

9. REQUEST MEETING
   └─ TechnologyDetail → Click "Request Meeting"
   └─ Modal opens:
      ├─ Proposed date/time
      ├─ Meeting notes
      └─ [Submit Request]
   └─ Create Meeting record:
      {
        studyId,
        researcherId,
        industryUserId,
        status: 'pending',
        createdAt: new Date()
      }
   └─ Researcher receives notification

10. MEETING APPROVED & SCHEDULED
    └─ After researcher approval
    └─ Meeting status → 'scheduled'
    └─ Meeting link generated
    └─ Industry user receives notification
    └─ Appears in MeetingCenter

11. REQUEST LICENSE
    └─ TechnologyDetail → Click "Request License"
    └─ Modal opens:
       ├─ License type (Research/Commercial)
       ├─ Proposed fee
       ├─ License terms
       └─ [Submit Request]
    └─ Create LicenseRequest record:
       {
         studyId,
         industryUserId,
         status: 'requested',
         createdAt: new Date()
       }
    └─ Admin receives notification

12. LICENSE APPROVED
    └─ Admin approves license
    └─ Agreement terms generated
    └─ Status → 'approved'
    └─ Industry user receives notification

13. LICENSE AGREEMENT
    └─ LicensingCenter shows agreement
    └─ Terms visible:
       ├─ License fee
       ├─ Territory
       ├─ Duration
       ├─ Restrictions
       └─ [Sign Agreement]
    └─ Click sign → Status → 'signed'

14. COMPLETE JOURNEY
    └─ Dashboard shows:
       ├─ Studies discovered: Count
       ├─ Interests made: Count
       ├─ Meetings: Count
       ├─ Licenses: Count
    └─ All metrics tracked
    └─ Can track each opportunity
```

### Key Industry Pages

#### IndustryDashboard
```typescript
Display KPIs:
- Discoveries: Count published studies
- My Interests: Count interests for this user
- Meetings: Count scheduled meetings for this user
- Licenses: Count signed licenses for this user

Quick Statistics:
- Studies available (published count)
- Active opportunities (interests count)
- Meetings scheduled
- License agreements

Recent Interests:
- Last 5 interests
- Study title & researcher
- Status badge
- Click to view details

Quick Actions:
- [Browse Marketplace] → /industry/marketplace
- [My Interests] → Show filtered list
- [Meeting Center] → /industry/meetings
- [Licensing Center] → /industry/licensing
- [Smart Matches] → /industry/smart-match
```

#### Marketplace
```typescript
Features:
- Published studies only (status = 'published')
- Search by title/keywords
- Filter by research domain
- Filter by readiness score (slider)

Display:
- Study cards with:
  ├─ Title
  ├─ Researcher name
  ├─ TRL level (1-9)
  ├─ Readiness score (0-100%)
  ├─ Market size
  ├─ Domain badge
  ├─ Interest count badge
  └─ [View Details] button

Responsive:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

Actions:
- Click card → /industry/technology/:id
- Search filters real-time
- Reset filters button
```

#### TechnologyDetail
```typescript
Sections:
1. Header
   ├─ Title
   ├─ Researcher name (clickable → profile)
   └─ TRL badge

2. Overview
   ├─ Abstract
   ├─ Domain
   ├─ Research institution
   ├─ Market size
   ├─ Commercial potential

3. Details
   ├─ IP Status
   ├─ Competitors
   ├─ Current applications
   ├─ Readiness score explanation

4. Interest Stats
   ├─ Number of interested companies
   ├─ Status distribution (interested/meeting/license)

5. AI Insights (Mock)
   ├─ Market analysis
   ├─ Readiness assessment
   ├─ Recommendation

6. Action Buttons
   ├─ [Express Interest] - If not already interested
   ├─ [Request Meeting] - If interested
   ├─ [Request License] - If meeting scheduled
   └─ [Ask AI] - Ask questions about technology

7. Engagement Timeline
   └─ Show:
      ├─ When interest expressed
      ├─ When meeting requested
      ├─ When meeting scheduled
      └─ When license requested
```

---

## Admin Workflow

### Complete Admin Journey

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN COMPLETE JOURNEY (Studies & Licensing)                │
└─────────────────────────────────────────────────────────────┘

1. LOGIN AS ADMIN
   └─ LoginPage → Email: admin@nrdc.org → Access Admin Portal

2. ADMIN DASHBOARD
   └─ AdminDashboard
      ├─ KPI Cards:
      │  ├─ Total Studies
      │  ├─ Studies Submitted (awaiting review)
      │  ├─ Published Studies
      │  ├─ Industry Interests
      │  ├─ Meetings Scheduled
      │  └─ Licenses Signed
      ├─ Commercialization Funnel:
      │  └─ Visualization showing:
      │     ├─ Total → Submitted → Approved → Published
      │     ├─ → Industry Interest → Meetings → Licenses
      ├─ Recent Activity:
      │  └─ Timeline of last 10 actions
      └─ Domain Distribution:
         └─ Chart showing studies by domain

3. REVIEW QUEUE
   └─ ReviewQueue.tsx (/admin/review-queue)
      ├─ List all submitted studies
      ├─ Sort by submission date (newest first)
      ├─ Show for each:
      │  ├─ Title
      │  ├─ Researcher name
      │  ├─ Domain
      │  ├─ TRL
      │  ├─ Submission date
      │  └─ Status badge
      └─ Click to review

4. STUDY REVIEW DETAIL
   └─ StudyReviewDetail.tsx (/admin/review/:id)
      ├─ Full Study Information:
      │  ├─ Title, Abstract
      │  ├─ Researcher details
      │  ├─ Domain, TRL
      │  ├─ PDF link
      │  └─ All AI-extracted fields
      ├─ Admin Actions:
      │  ├─ [Approve Study]
      │  │  └─ Status → 'approved'
      │  │  └─ Researcher notification
      │  │  └─ Study removed from review queue
      │  ├─ [Request Changes]
      │  │  └─ Modal: Add comments
      │  │  └─ Researcher notified
      │  │  └─ Study stays in queue
      │  └─ [Reject Study]
      │     └─ Modal: Add rejection reason
      │     └─ Status → 'rejected'
      │     └─ Researcher notification
      └─ Comments Section:
         ├─ Add admin comments
         ├─ Visible to researcher
         └─ Timestamp for each

5. APPROVED STUDIES
   └─ Approved studies appear in a separate "Approved" list
   └─ Admin can publish them

6. PUBLISH TO MARKETPLACE
   └─ AdminDashboard or ReviewQueue
   └─ Click [Publish] on approved study
   └─ Status changes to 'published'
   └─ Study appears in Industry Marketplace
   └─ Researcher receives notification
   └─ Industry users can see in Marketplace

7. MEETING MANAGEMENT
   └─ MeetingManagement.tsx (/admin/meetings)
      ├─ List all meeting requests
      ├─ Statuses: pending/approved/scheduled/completed
      ├─ Show for each:
      │  ├─ Researcher name
      │  ├─ Industry partner name
      │  ├─ Technology title
      │  ├─ Requested date
      │  └─ Status
      └─ Admin can:
         ├─ View details
         ├─ Schedule meeting (set time & link)
         └─ Cancel if needed

8. LICENSE MANAGEMENT
   └─ LicensingManagement.tsx (/admin/licensing)
      ├─ List all license requests
      ├─ Statuses: requested/under_review/approved/rejected/signed
      ├─ Show for each:
      │  ├─ Technology title
      │  ├─ Industry partner
      │  ├─ Requested date
      │  ├─ Status
      │  └─ Proposed fee
      └─ Admin can:
         ├─ Review terms
         ├─ [Approve License]
         │  └─ Generate agreement
         │  └─ Status → 'approved'
         │  └─ Both parties notified
         ├─ [Reject License]
         │  └─ Add reason
         │  └─ Status → 'rejected'
         └─ [Request Negotiation]
            └─ Send back to industry user

9. ANALYTICS DASHBOARD
   └─ AnalyticsDashboard.tsx (/admin/analytics)
      ├─ Commercialization Funnel:
      │  └─ Show conversion at each stage
      ├─ Domain Distribution:
      │  └─ Bar chart or pie chart
      ├─ Status Distribution:
      │  └─ How many in each status
      ├─ Monthly Activity:
      │  └─ Trends over time
      └─ Researcher Performance:
         ├─ Top researchers by interests
         ├─ Top researchers by meetings
         └─ Top researchers by licenses

10. AUDIT LOGS
    └─ AuditLogs.tsx (/admin/audit-logs)
       ├─ Chronological log of all actions:
       │  ├─ User action
       │  ├─ Timestamp
       │  ├─ Entity affected
       │  └─ Status change
       ├─ Searchable by:
       │  ├─ User
       │  ├─ Action type
       │  ├─ Date range
       │  └─ Entity
       └─ Export audit trail

11. COMPLETE GOVERNANCE
    └─ Admin dashboard shows:
       ├─ All metrics in real-time
       ├─ Platform health
       ├─ Bottlenecks in pipeline
       └─ Performance indicators
```

### Key Admin Pages

#### AdminDashboard
```typescript
KPI Cards (4 across):
- Total Studies: COUNT(studies)
- Submitted: COUNT(studies WHERE status='submitted')
- Published: COUNT(studies WHERE status='published')
- Active Licenses: COUNT(licenses WHERE status='signed')

Commercialization Funnel (Chart):
- Shows counts at each stage:
  Total Studies
    ↓
  Submitted
    ↓
  Approved
    ↓
  Published
    ↓
  Industry Interests
    ↓
  Meetings Scheduled
    ↓
  Licenses Signed

Domain Distribution (Chart):
- Pie/Bar chart showing study count by domain

Recent Activity (List):
- Last 20 actions in system:
  ├─ "[Researcher] uploaded study"
  ├─ "[Admin] approved study"
  ├─ "[Industry] expressed interest"
  ├─ "[Industry] requested meeting"
  ├─ "[Industry] requested license"
  └─ Timestamp for each

Quick Actions:
- [Review Queue] → See pending studies
- [Meeting Management] → Manage all meetings
- [Licensing Management] → Manage all licenses
- [Analytics] → Full analytics dashboard
```

#### ReviewQueue
```typescript
Display List of Submitted Studies:
- Filter by status:
  ├─ Submitted
  ├─ Under Review
  └─ All

Sort Options:
- Newest first (default)
- By researcher name
- By domain
- By TRL level

For each study, show:
- Title (clickable → StudyReviewDetail)
- Researcher name
- Domain badge
- TRL level
- Submission date
- Status badge

Bulk Actions (Future):
- [ ] Select multiple studies
- [ ] Bulk approve
- [ ] Bulk reject

Quick Stats:
- X studies awaiting review
- X studies under review
- X studies ready to publish
```

#### StudyReviewDetail
```typescript
Left Panel (Study Info):
- Title
- Abstract (full text)
- Researcher:
  ├─ Name (clickable → profile)
  ├─ Institution
  └─ Previous studies count
- Domain
- TRL Level
- Keywords

Center Panel (AI Extracted Fields):
- Commercial Potential: [rating]
- Market Size: $[value]
- Competitors: [list]
- IP Status: [status]
- Current Applications: [list]

Right Panel (Admin Actions):
Buttons:
- [Approve Study]
  └─ Modal confirmation
  └─ Status → 'approved'
  └─ Auto-create notification

- [Request Changes]
  └─ Modal: Add comments/feedback
  └─ Status stays 'submitted'
  └─ Researcher notified

- [Reject Study]
  └─ Modal: Add rejection reason
  └─ Status → 'rejected'
  └─ Researcher notified

Comments Section:
- Admin can add comments
- Researcher can view
- Timestamp shown

Related Studies:
- Other studies from same researcher
- Studies in same domain
```

#### LicensingManagement
```typescript
Filters & Sort:
- Status filter (all/requested/approved/rejected/signed)
- Sort by date requested (newest first)
- Search by technology title

Table/List View:
For each license request:
- Technology title
- Industry partner name
- Researcher name
- Date requested
- Proposed fee
- Status badge
- [View Details] button

Details Modal:
- Full license request info
- Proposed terms
- Admin actions:
  ├─ [Approve & Generate Agreement]
  │  └─ Creates agreement document
  │  └─ Status → 'approved'
  │  └─ Both parties notified
  ├─ [Reject]
  │  └─ Modal: Add reason
  │  └─ Status → 'rejected'
  │  └─ Both parties notified
  └─ [Request Negotiation]
     └─ Modal: Counter-offer
     └─ Send back to industry
```

---

## Data Architecture

### Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
└─────────────┘
      │
      ├─── ONE-TO-MANY ──→ Studies (researcherId)
      ├─── ONE-TO-MANY ──→ Interests (industryUserId)
      ├─── ONE-TO-MANY ──→ Meetings (researcherId/industryUserId)
      ├─── ONE-TO-MANY ──→ LicenseRequests (industryUserId)
      └─── ONE-TO-MANY ──→ Notifications (userId)

┌──────────────┐
│   Studies    │
└──────────────┘
      │
      ├─── ONE-TO-MANY ──→ Interests (studyId)
      ├─── ONE-TO-MANY ──→ Meetings (studyId)
      └─── ONE-TO-MANY ──→ LicenseRequests (studyId)

┌──────────────┐
│ Interests    │
└──────────────┘
      │
      ├─── REFERENCED-BY ──→ Meetings
      └─── REFERENCED-BY ──→ Notifications
```

### Data Schema

#### Users
```typescript
interface User {
  id: string;                  // UUID
  email: string;              // Unique
  name: string;
  role: 'researcher' | 'industry' | 'admin';
  organization: string;        // Institution or Company
  avatar?: string;            // Avatar URL (optional)
  bio?: string;               // User bio (optional)
  createdAt: Date;
  updatedAt: Date;
}
```

#### Studies
```typescript
interface Study {
  id: string;
  title: string;
  abstract: string;
  domain: ResearchDomain;     // Enum: Biotech, AI, Energy, etc.
  trl: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  researcherId: string;       // FK → Users
  researcherName: string;     // Denormalized for performance
  status: StudyStatus;        // draft|submitted|under_review|approved|published|rejected
  readinessScore: number;     // 0-100
  commercialPotential: string;
  marketSize: string;
  competitors: string[];
  ipStatus: string;
  currentApplications: string[];
  keywords: string[];
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  publishedAt?: Date;
}
```

#### Interests
```typescript
interface Interest {
  id: string;
  studyId: string;            // FK → Studies
  industryUserId: string;     // FK → Users
  status: 'interested' | 'meeting_scheduled' | 'license_requested' | 'licensed';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Meetings
```typescript
interface Meeting {
  id: string;
  studyId: string;            // FK → Studies
  researcherId: string;       // FK → Users
  industryUserId: string;     // FK → Users
  status: 'pending' | 'approved' | 'scheduled' | 'completed';
  proposedDate?: Date;
  scheduledDate?: Date;
  meetingLink?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### LicenseRequests
```typescript
interface LicenseRequest {
  id: string;
  studyId: string;            // FK → Studies
  industryUserId: string;     // FK → Users
  status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'signed';
  licenseFee?: number;
  agreementTerms?: string;
  territoryRestrictions?: string;
  duration?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  signedAt?: Date;
}
```

#### Notifications
```typescript
interface Notification {
  id: string;
  userId: string;             // FK → Users (recipient)
  type: NotificationType;     // Enum: study_submitted, approved, published, etc.
  title: string;
  message: string;
  relatedEntityId?: string;   // studyId, meetingId, etc.
  isRead: boolean;
  createdAt: Date;
}
```

---

## State Management

### AuthContext

```typescript
interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  login(email: string, password: string): Promise<void>;
  signup(email: string, password: string, name: string, role: UserRole, organization: string): Promise<void>;
  logout(): void;
  forgotPassword(email: string): Promise<void>;
  clearError(): void;
}
```

**Implementation Details:**
- Uses localStorage['auth_user'] for persistence
- Checks localStorage['all_users'] and localStorage['user_passwords'] during login
- Session survives page refresh
- Logout clears localStorage['auth_user']

### AppDataContext

```typescript
interface AppDataContextType {
  // Data
  studies: Study[];
  interests: Interest[];
  meetings: Meeting[];
  licenseRequests: LicenseRequest[];
  notifications: Notification[];
  
  // Studies
  addStudy(study: Study): Promise<void>;
  updateStudy(id: string, updates: Partial<Study>): Promise<void>;
  getStudyById(id: string): Study | undefined;
  getStudiesByResearcher(researcherId: string): Study[];
  
  // Interests
  addInterest(interest: Interest): Promise<void>;
  updateInterest(id: string, updates: Partial<Interest>): Promise<void>;
  getInterestsByStudy(studyId: string): Interest[];
  getInterestsByIndustryUser(industryUserId: string): Interest[];
  
  // Meetings
  addMeeting(meeting: Meeting): Promise<void>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<void>;
  getMeetingsByResearcher(researcherId: string): Meeting[];
  getMeetingsByIndustryUser(industryUserId: string): Meeting[];
  
  // Licenses
  addLicenseRequest(license: LicenseRequest): Promise<void>;
  updateLicenseRequest(id: string, updates: Partial<LicenseRequest>): Promise<void>;
  getLicenseRequestsByStudy(studyId: string): LicenseRequest[];
  getLicenseRequestsByIndustryUser(industryUserId: string): LicenseRequest[];
  
  // Notifications
  addNotification(notification: Notification): Promise<void>;
  markNotificationAsRead(id: string): Promise<void>;
  getUnreadNotifications(userId: string): Notification[];
  getUserNotifications(userId: string): Notification[];
}
```

**Implementation Details:**
- All data synced to localStorage automatically
- Key format: 'app_[entity_type]' (e.g., 'app_studies')
- Each operation triggers re-render via React Context

---

## Service Layer

### Design Pattern

Each service exports async functions that abstract data access:

```typescript
// Current implementation (localStorage)
async function createStudy(study: Study): Promise<Study> {
  // Simulate API delay
  await simulateApiDelay(400);
  
  // Read from localStorage
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  
  // Perform operation
  studies.push(study);
  
  // Write back to localStorage
  localStorage.setItem('app_studies', JSON.stringify(studies));
  
  return study;
}

// Future implementation (API)
async function createStudy(study: Study): Promise<Study> {
  const response = await fetch('/api/studies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(study)
  });
  return response.json();
}
```

### Six Service Files

#### 1. study.service.ts
```typescript
- createStudy(study: Study): Promise<Study>
- updateStudy(id: string, updates: Partial<Study>): Promise<Study>
- getStudyById(id: string): Promise<Study | null>
- getResearcherStudies(researcherId: string): Promise<Study[]>
- updateStudyStatus(id: string, status: StudyStatus): Promise<Study>
- publishStudy(id: string): Promise<Study>
- approveStudy(id: string): Promise<Study>
- rejectStudy(id: string, reason: string): Promise<Study>
- searchStudies(query: string, domain?: string, status?: StudyStatus): Promise<Study[]>
```

#### 2. marketplace.service.ts
```typescript
- expressInterest(studyId: string, industryUserId: string): Promise<Interest>
- updateInterestStatus(id: string, status: InterestStatus): Promise<Interest>
- getStudyInterests(studyId: string): Promise<Interest[]>
- getIndustryUserInterests(industryUserId: string): Promise<Interest[]>
- hasInterest(studyId: string, industryUserId: string): Promise<boolean>
- calculateReadinessScore(study: Study): number
```

#### 3. meeting.service.ts
```typescript
- createMeetingRequest(studyId: string, researcherId: string, industryUserId: string, proposedDate: Date): Promise<Meeting>
- updateMeetingStatus(id: string, status: MeetingStatus): Promise<Meeting>
- scheduleMeeting(id: string, date: Date, meetingLink: string): Promise<Meeting>
- getResearcherMeetings(researcherId: string): Promise<Meeting[]>
- getIndustryUserMeetings(industryUserId: string): Promise<Meeting[]>
- getPendingMeetings(): Promise<Meeting[]>
- approveMeetingRequest(id: string): Promise<Meeting>
```

#### 4. license.service.ts
```typescript
- requestLicense(studyId: string, industryUserId: string, proposedFee?: number): Promise<LicenseRequest>
- updateLicenseStatus(id: string, status: LicenseStatus): Promise<LicenseRequest>
- approveLicense(id: string): Promise<LicenseRequest>
- rejectLicense(id: string, reason: string): Promise<LicenseRequest>
- signLicenseAgreement(id: string): Promise<LicenseRequest>
- getStudyLicenseRequests(studyId: string): Promise<LicenseRequest[]>
- getIndustryUserLicenseRequests(industryUserId: string): Promise<LicenseRequest[]>
- getPendingLicenseRequests(): Promise<LicenseRequest[]>
- generateLicenseAgreement(license: LicenseRequest): Promise<string>
```

#### 5. notification.service.ts
```typescript
- createNotification(notification: Notification): Promise<Notification>
- markAsRead(id: string): Promise<Notification>
- deleteNotification(id: string): Promise<void>
- getUserNotifications(userId: string, limit?: number): Promise<Notification[]>
- getUnreadCount(userId: string): Promise<number>
- markAllAsRead(userId: string): Promise<void>
```

#### 6. analytics.service.ts
```typescript
- getAnalyticsMetrics(): Promise<AnalyticsMetrics>
- getCommercializationFunnel(): Promise<FunnelData>
- getDomainDistribution(): Promise<DomainStats[]>
- getStatusDistribution(): Promise<StatusStats[]>
- getRecentActivity(days?: number): Promise<Activity[]>
- getResearcherStats(researcherId: string): Promise<ResearcherStats>
```

---

## Notifications System

### Notification Types

```typescript
type NotificationType =
  | 'study_submitted'           // Researcher submits study → Admin
  | 'study_approved'            // Admin approves study → Researcher
  | 'study_rejected'            // Admin rejects study → Researcher
  | 'study_published'           // Study published → Researcher
  | 'interest_expressed'        // Industry expresses interest → Researcher
  | 'meeting_requested'         // Industry requests meeting → Researcher
  | 'meeting_approved'          // Researcher approves meeting → Industry
  | 'meeting_scheduled'         // Meeting scheduled → Both
  | 'license_requested'         // Industry requests license → Admin
  | 'license_approved'          // Admin approves license → Industry
  | 'license_signed'            // Industry signs agreement → Researcher
```

### Notification Triggering

```
Event Triggers:
1. Researcher submits study
   └─ NotificationType: 'study_submitted'
   └─ Recipient: All admins
   └─ Title: "New Study Submitted"
   └─ Message: "[Researcher] submitted '[Study Title]'"

2. Admin approves study
   └─ NotificationType: 'study_approved'
   └─ Recipient: Researcher
   └─ Title: "Study Approved"
   └─ Message: "Your study '[Study Title]' was approved"

3. Industry expresses interest
   └─ NotificationType: 'interest_expressed'
   └─ Recipient: Researcher
   └─ Title: "New Interest"
   └─ Message: "[Company] expressed interest in '[Study]'"

4. Meeting scheduled
   └─ NotificationType: 'meeting_scheduled'
   └─ Recipient: Both parties
   └─ Title: "Meeting Scheduled"
   └─ Message: "Meeting scheduled for [date] at [time]"

5. License approved
   └─ NotificationType: 'license_approved'
   └─ Recipient: Industry user
   └─ Title: "License Approved"
   └─ Message: "Your license request for '[Study]' was approved"
```

### Notification UI Display

**Header Badge:**
- Red badge with unread count
- Click to open dropdown
- Shows last 5 notifications

**Notification Dropdown:**
- List of notifications (newest first)
- Unread notifications highlighted
- Click to mark as read
- Click to navigate to related entity

**Notification Page (Future):**
- All notifications paginated
- Filter by type
- Search
- Mark as read/unread
- Delete

---

## Future API Integration

### Backend Endpoint Requirements

#### Authentication
```
POST /api/auth/login
  Body: { email, password }
  Response: { user, token }

POST /api/auth/signup
  Body: { email, password, name, role, organization }
  Response: { user, token }

POST /api/auth/logout
  Headers: { Authorization: "Bearer <token>" }
  Response: { success: true }
```

#### Studies
```
GET /api/studies
  Query: { page?, limit?, status?, domain? }
  Response: { studies: Study[], total, pages }

POST /api/studies
  Headers: { Authorization: "Bearer <token>" }
  Body: { title, abstract, domain, trl, ... }
  Response: { study: Study }

GET /api/studies/:id
  Response: { study: Study }

PATCH /api/studies/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { ...updates }
  Response: { study: Study }

POST /api/studies/:id/submit
  Headers: { Authorization: "Bearer <token>" }
  Response: { study: Study, notification: Notification }

PATCH /api/studies/:id/status
  Headers: { Authorization: "Bearer <token>" }
  Body: { status: StudyStatus }
  Response: { study: Study }

POST /api/studies/:id/approve
  Headers: { Authorization: "Bearer <token>" }
  Response: { study: Study, notification: Notification }

POST /api/studies/:id/reject
  Headers: { Authorization: "Bearer <token>" }
  Body: { reason: string }
  Response: { study: Study, notification: Notification }

POST /api/studies/:id/publish
  Headers: { Authorization: "Bearer <token>" }
  Response: { study: Study, notification: Notification }
```

#### Marketplace
```
GET /api/marketplace
  Query: { page?, limit?, domain?, minReadiness? }
  Response: { studies: Study[], total }

POST /api/marketplace/:studyId/express-interest
  Headers: { Authorization: "Bearer <token>" }
  Response: { interest: Interest, notification: Notification }

GET /api/interests
  Headers: { Authorization: "Bearer <token>" }
  Response: { interests: Interest[] }
```

#### Meetings
```
POST /api/meetings
  Headers: { Authorization: "Bearer <token>" }
  Body: { studyId, proposedDate, notes }
  Response: { meeting: Meeting, notification: Notification }

GET /api/meetings
  Headers: { Authorization: "Bearer <token>" }
  Response: { meetings: Meeting[] }

PATCH /api/meetings/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { status?, date?, meetingLink? }
  Response: { meeting: Meeting, notification: Notification }
```

#### Licensing
```
POST /api/licenses/request
  Headers: { Authorization: "Bearer <token>" }
  Body: { studyId, proposedFee?, licenseType? }
  Response: { license: LicenseRequest, notification: Notification }

GET /api/licenses
  Headers: { Authorization: "Bearer <token>" }
  Response: { licenses: LicenseRequest[] }

PATCH /api/licenses/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { status?, licenseFee? }
  Response: { license: LicenseRequest }

POST /api/licenses/:id/approve
  Headers: { Authorization: "Bearer <token>" }
  Response: { license: LicenseRequest, agreementTerms: string, notification: Notification }

POST /api/licenses/:id/sign
  Headers: { Authorization: "Bearer <token>" }
  Response: { license: LicenseRequest, notification: Notification }

GET /api/licenses/:id/agreement
  Headers: { Authorization: "Bearer <token>" }
  Response: { agreementTerms: string, pdf?: ArrayBuffer }
```

#### Analytics
```
GET /api/analytics/metrics
  Headers: { Authorization: "Bearer <token>" }
  Response: { 
    totalStudies, approvedStudies, publishedStudies,
    industryInterests, meetingsScheduled, licensesRequested, licensesSigned
  }

GET /api/analytics/funnel
  Headers: { Authorization: "Bearer <token>" }
  Response: { stages: FunnelStage[] }

GET /api/analytics/domain-distribution
  Headers: { Authorization: "Bearer <token>" }
  Response: { domains: DomainStats[] }

GET /api/analytics/recent-activity
  Headers: { Authorization: "Bearer <token>" }
  Query: { days? }
  Response: { activities: Activity[] }
```

---

## Performance Optimization

### Caching Strategies
- Store studies in localStorage with TTL
- Cache marketplace results
- Memoize expensive calculations (readiness scores)

### Query Optimization (Future)
- Pagination on all list endpoints
- Lazy load study details
- Prefetch marketplace data
- Debounce search queries

### Image Optimization
- Use WebP for avatars
- Compress PDFs for upload
- Generate thumbnails

---

## Security Considerations

### Current (MVP)
- localStorage only - no encryption
- Client-side validation only
- No CORS protection
- For demo purposes only

### Production Requirements
- [ ] JWT authentication
- [ ] HTTPS only
- [ ] Backend validation
- [ ] Input sanitization
- [ ] Rate limiting
- [ ] CORS headers
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Audit logging
- [ ] Data encryption
- [ ] Secure password hashing

---

## Summary

This comprehensive documentation covers:
- ✅ Complete user flows for all 3 roles
- ✅ Architecture and data models
- ✅ Service layer design
- ✅ State management patterns
- ✅ Notification system
- ✅ Future API endpoints
- ✅ Security considerations

The application is designed for easy future API integration with the service layer abstraction providing a clear boundary between frontend and backend.
## Stakeholder Demo Flow Matrix

The MVP should be presented as one continuous commercialization system. Each UI action below has a state change, a future backend API, a database effect, and a next workflow state.

| Demo Step | UI Flow | State Flow | Future Backend Flow |
| --- | --- | --- | --- |
| Signup/Login | Public auth pages route users by role. | `AuthContext.user` is set and session persists. | `POST /auth/signup` or `POST /auth/login` creates `users`/`sessions` and returns JWT. |
| Research Upload | Researcher uses `/researcher/upload` wizard. | Study is added to `studies`; status becomes `submitted`. | `POST /studies`, `POST /studies/{id}/analyze`, `PATCH /studies/{id}/submit`; create review and notify admin. |
| Admin Review | Admin opens `/admin/review-queue` and `/admin/review/{id}`. | Study status becomes `under_review`, `approved`, `rejected`, or `published`. | `POST /studies/{id}/approve`, `/reject`, `/publish`; update `study_reviews`, `studies`, `notifications`, `audit_logs`. |
| Marketplace Discovery | Industry searches `/industry/marketplace` and opens technology detail. | Published studies are filtered by title, keywords, domain, researcher, description, TRL, and readiness. | `GET /marketplace/technologies`; read `studies` with text and filter indexes. |
| Express Interest | Industry clicks interest on technology detail or Smart Match. | `interests` gains a record; researcher dashboard and notifications update. | `POST /technologies/{id}/interests`; write `interests`, notify researcher, audit event. |
| Problem Statement | Industry creates a problem in `/industry/problems`. | `problemStatements` updates and Smart Match recalculates. | `POST /problem-statements`; extract keywords, notify admin for high urgency. |
| Smart Match | Industry opens `/industry/smart-match`. | Recommendations are ranked from published studies and industry problems. | `POST /smart-match/recommendations`; read `problem_statements` and `studies`; optionally store match run. |
| Meeting Request | Industry requests meeting after interest. | `meetings` gains `pending`; interest can move toward meeting state. | `POST /meetings`; notify researcher and industry; update dashboards. |
| Meeting Approval/Schedule | Admin or researcher approves and schedules. | Meeting status moves `pending` -> `approved` -> `scheduled` -> `completed`. | `POST /meetings/{id}/approve`, `PATCH /meetings/{id}/schedule`, `POST /meetings/{id}/complete`. |
| License Request | Industry requests license from technology or licensing center. | `licenseRequests` gains `requested`; admin licensing queue updates. | `POST /licenses`; notify admin; update study commercialization status. |
| License Approval/Signature | Admin/researcher review terms, industry signs. | License moves `under_review` -> `approved` -> `signed`; study can become `licensed` or `commercialized`. | `PATCH /licenses/{id}/status`, `POST /licenses/{id}/approve`, `POST /licenses/{id}/sign`. |
| AI Copilot | User asks role/page-specific questions. | `chatSessions` appends user and assistant messages. | `POST /copilot/chat`; collect context from studies, problems, interests, meetings, licenses, and analytics. |
| Analytics | Admin views dashboard and analytics. | KPI cards and funnel reflect collection changes. | `GET /analytics/metrics`, `/funnel`, `/activity`, `/domains`, `/status`. |

The backend-specific version of these flows is maintained in [backend-flow.md](backend-flow.md), and endpoint-level design is maintained in [backend-api-design.md](backend-api-design.md).

## Current Interactive MVP Updates

The following stakeholder-demo behaviors are now connected to application state:

- Authenticated researcher, industry, and admin layouts expose visible Logout actions that clear the persisted session and return users to Login.
- Researcher Dashboard KPI cards read from live `studies`, `interests`, and `meetings` state instead of static values.
- Industry Problem Statements support create, search, urgency filter, edit, and delete. These records feed Smart Match and Admin Problem Statement Review.
- Researcher, Industry, and Admin notification pages read persisted notification state, support mark-read/mark-all-read, and open the related workflow.
- Industry meeting and licensing centers connect action buttons to marketplace/technology detail workflows or state transitions.
