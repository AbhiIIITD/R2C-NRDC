# NRDC R2C Platform - Complete Navigation Map

## 🗺️ Complete Site Architecture

```
NRDC R2C PLATFORM
│
├── PUBLIC PORTAL
│   ├── / (Landing Page)
│   │   ├── → /signup (Primary CTA)
│   │   ├── → /login (Secondary CTA)
│   │   └── Features: Hero, How It Works, User Types, Stats, Testimonials
│   │
│   ├── /login
│   │   ├── → /researcher (Demo: Researcher)
│   │   ├── → /industry (Demo: Industry)
│   │   ├── → /admin (Demo: Admin)
│   │   ├── → /signup (No account link)
│   │   └── → /forgot-password (Forgot password link)
│   │
│   ├── /signup
│   │   ├── User Type Selection: Researcher | Industry
│   │   ├── Conditional Forms based on type
│   │   ├── → /login (Already have account)
│   │   └── → /researcher or /industry (After signup)
│   │
│   └── /forgot-password
│       ├── Email submission
│       ├── Success/Error states
│       └── → /login (Back to login)
│
├── RESEARCHER PORTAL
│   ├── /researcher (Dashboard)
│   │   ├── Stats Overview
│   │   │   ├── Total Studies: 12
│   │   │   ├── Published: 8
│   │   │   ├── Industry Interests: 15
│   │   │   └── Upcoming Meetings: 3
│   │   │
│   │   ├── Recent Studies (4 cards)
│   │   │   └── → /researcher/studies/:id
│   │   │
│   │   ├── Pending Actions (3 items)
│   │   │   ├── Review meeting request → Meeting scheduling
│   │   │   ├── Complete study revision → /researcher/studies/:id
│   │   │   └── Upload missing documents → /researcher/studies/:id
│   │   │
│   │   ├── Upcoming Meetings (2 cards)
│   │   │   └── Details: Date, Time, Company
│   │   │
│   │   └── Quick Actions
│   │       ├── → /researcher/upload
│   │       └── → /researcher/copilot
│   │
│   ├── /researcher/upload (Upload Research Wizard)
│   │   ├── Step 1: Upload Document
│   │   │   ├── Drag & drop file upload
│   │   │   ├── DOI input option
│   │   │   └── → Step 2
│   │   │
│   │   ├── Step 2: Basic Information
│   │   │   ├── Title, Abstract
│   │   │   ├── Category, Technology Area
│   │   │   ├── Keywords, Authors
│   │   │   ├── Save Draft option
│   │   │   └── → Step 3
│   │   │
│   │   ├── Step 3: AI Extraction
│   │   │   ├── Commercial Readiness Score: 8.5/10
│   │   │   ├── Key Innovations Detected
│   │   │   ├── Suggested Industry Sectors
│   │   │   ├── Market Potential Analysis
│   │   │   ├── Re-analyze option
│   │   │   └── → Step 4
│   │   │
│   │   └── Step 4: Review & Submit
│   │       ├── Complete summary
│   │       ├── Confirmation checkbox
│   │       ├── Save Draft option
│   │       └── Submit → /researcher/studies
│   │
│   ├── /researcher/studies (My Studies)
│   │   ├── Search & Filters
│   │   │   ├── Search by title
│   │   │   ├── Filter by Status
│   │   │   ├── Filter by Category
│   │   │   └── Advanced Filters
│   │   │
│   │   ├── Studies Table (6 rows visible)
│   │   │   ├── Columns: Title, Category, Status, Date, Views, Interests, Actions
│   │   │   ├── Each row → /researcher/studies/:id
│   │   │   ├── Edit button
│   │   │   └── Status badges
│   │   │
│   │   ├── Pagination (1-6 of 12)
│   │   ├── Bulk Actions (when selected)
│   │   ├── Empty State (hidden)
│   │   └── Primary Action: → /researcher/upload
│   │
│   ├── /researcher/studies/:id (Study Details)
│   │   ├── Header
│   │   │   ├── Title + Status Badge
│   │   │   ├── Study ID, Published Date
│   │   │   └── Actions: Edit, Share, Download
│   │   │
│   │   ├── Key Metrics (4 cards)
│   │   │   ├── Total Views: 234
│   │   │   ├── Industry Interests: 12
│   │   │   ├── Meetings Scheduled: 5
│   │   │   └── Commercial Score: 8.5/10
│   │   │
│   │   ├── Main Content (Left Column)
│   │   │   ├── Study Information (Abstract, Category, Keywords)
│   │   │   ├── Industry Interest Table (12 companies)
│   │   │   │   └── Each row: Company, Date, Status, Actions
│   │   │   └── Meeting History (5 meetings)
│   │   │       └── Each: Date, Company, Status, Notes
│   │   │
│   │   └── Sidebar (Right Column)
│   │       ├── Commercialization Journey (7-step workflow diagram)
│   │       ├── AI Insights
│   │       │   ├── Commercial Readiness: 8.5/10
│   │       │   ├── Key Strengths (3 items)
│   │       │   └── Target Industries (3 tags)
│   │       ├── Documents (3 files with download)
│   │       └── Quick Actions
│   │           ├── Contact NRDC Admin
│   │           ├── Request Analytics Report
│   │           └── → /researcher/copilot
│   │
│   ├── /researcher/copilot (AI Copilot)
│   │   ├── Chat Interface
│   │   │   ├── AI greeting message
│   │   │   ├── User message
│   │   │   ├── AI response with analysis
│   │   │   ├── Typing indicator (when active)
│   │   │   └── Message input + Send button
│   │   │
│   │   └── Sidebar
│   │       ├── Suggested Questions (4 prompts)
│   │       ├── Active Context (Referenced studies)
│   │       ├── What I Can Do (6 capabilities)
│   │       └── Chat Actions (New, Export)
│   │
│   ├── /researcher/notifications (Notifications)
│   │   ├── Filter Tabs
│   │   │   ├── All (12)
│   │   │   ├── Unread (5)
│   │   │   ├── Industry Interest (3)
│   │   │   ├── Meetings (2)
│   │   │   └── System (4)
│   │   │
│   │   ├── Notification List
│   │   │   ├── Unread (with action bar on left)
│   │   │   │   ├── Meeting requests (Accept/Decline)
│   │   │   │   ├── Industry interest (View/Respond)
│   │   │   │   └── Admin feedback (View/Upload)
│   │   │   └── Read (opacity reduced)
│   │   │
│   │   ├── Load More
│   │   └── Empty State (hidden)
│   │
│   └── /researcher/profile (Profile Settings)
│       ├── Tabs: Profile | Security | Notifications | Documents
│       ├── Main Form (Left Column)
│       │   ├── Personal Information
│       │   ├── Professional Information
│       │   │   └── Research Areas (editable tags)
│       │   ├── Public Profile Settings
│       │   │   ├── Visibility toggle
│       │   │   ├── ORCID iD
│       │   │   ├── LinkedIn
│       │   │   └── Personal Website
│       │   └── Actions: Cancel | Save Changes
│       │
│       └── Sidebar (Right Column)
│           ├── Profile Photo Upload
│           ├── Account Activity Stats
│           ├── Verification Status
│           └── Account Actions (Export, Deactivate)
│
├── INDUSTRY PORTAL
│   ├── /industry (Dashboard)
│   │   ├── Primary Actions
│   │   │   ├── → /industry/marketplace (Browse Marketplace)
│   │   │   └── → /industry/smart-match (View Smart Matches)
│   │   │
│   │   ├── Stats Overview (4 cards)
│   │   │   ├── Saved Technologies: 23
│   │   │   ├── Active Interests: 8
│   │   │   ├── Scheduled Meetings: 5
│   │   │   └── Active Licenses: 2
│   │   │
│   │   ├── Smart Matches for You (3 cards)
│   │   │   ├── Each shows: Title, Category, Researcher, Match %
│   │   │   ├── → /industry/technology/:id (View Details)
│   │   │   └── Express Interest button
│   │   │
│   │   ├── Recent Activity (3 items)
│   │   │   └── Meeting confirmed, New match, License sent
│   │   │
│   │   └── Sidebar
│   │       ├── Upcoming Meetings (2 cards)
│   │       │   └── → /industry/meetings
│   │       ├── Active Interests (3 items)
│   │       └── Quick Actions
│   │           ├── → /industry/marketplace
│   │           ├── → /industry/smart-match
│   │           └── → /industry/copilot
│   │
│   ├── /industry/marketplace (Marketplace)
│   │   ├── Search & Advanced Filters
│   │   │   ├── Search box
│   │   │   ├── Category filter
│   │   │   ├── Industry filter
│   │   │   ├── Commercial Score filter
│   │   │   ├── Institution filter
│   │   │   ├── Date Added filter
│   │   │   └── Clear filters
│   │   │
│   │   ├── View Options
│   │   │   ├── Sort by: Relevance | Score | Date
│   │   │   └── Grid | List toggle
│   │   │
│   │   ├── Technology Grid (6 cards, 2 columns)
│   │   │   ├── Each card shows:
│   │   │   │   ├── Title (clickable → /industry/technology/:id)
│   │   │   │   ├── Category, Researcher, Institution
│   │   │   │   ├── Commercial Score (8.5/10) with bar
│   │   │   │   ├── Views, Date posted
│   │   │   │   ├── Save/Unsave star icon
│   │   │   │   └── Actions: View Details | Express Interest
│   │   │   └── Pagination
│   │   │
│   │   └── Empty State (hidden)
│   │
│   ├── /industry/technology/:id (Technology Detail)
│   │   ├── Header
│   │   │   ├── Title
│   │   │   ├── Technology ID
│   │   │   └── Actions: Save | Share | Express Interest
│   │   │
│   │   ├── Main Content (Left Column)
│   │   │   ├── Overview
│   │   │   │   ├── Abstract
│   │   │   │   └── Category, Tech Area, Publication Date
│   │   │   ├── Commercial Assessment
│   │   │   │   ├── Readiness Score: 8.5/10
│   │   │   │   ├── Key Strengths (5 bullets)
│   │   │   │   └── Target Industries (4 tags)
│   │   │   └── Market Analysis
│   │   │       ├── Market Size
│   │   │       ├── Growth Trajectory
│   │   │       └── Competitive Landscape
│   │   │
│   │   └── Sidebar (Right Column)
│   │       ├── Researcher Profile Card
│   │       │   ├── Photo, Name, Title, Institution
│   │       │   └── View Profile button
│   │       ├── Quick Stats (Views, Interest, Date)
│   │       ├── IP Status (Patent Pending)
│   │       ├── Documents (2 files with download)
│   │       └── Actions
│   │           ├── Express Interest
│   │           ├── Request Meeting
│   │           └── Contact Researcher
│   │
│   ├── /industry/smart-match (Smart Match)
│   │   ├── Match Profile Card
│   │   │   ├── Industry Focus
│   │   │   ├── Technology Areas
│   │   │   ├── Development Stage
│   │   │   ├── Budget Range
│   │   │   └── Edit Preferences button
│   │   │
│   │   ├── Top Matches (3 large cards)
│   │   │   ├── Each shows:
│   │   │   │   ├── Match Score (95%, 92%, 88%)
│   │   │   │   ├── Technology Title → /industry/technology/:id
│   │   │   │   ├── Category, Researcher, Institution
│   │   │   │   ├── Why This Matches (3 reasons)
│   │   │   │   ├── Commercial Score: 9.0/10
│   │   │   │   └── Actions: View | Interest | Meeting | Save
│   │   │   └── Export List button
│   │   │
│   │   └── CTA Section
│   │       ├── Looking for more matches?
│   │       ├── Edit Preferences button
│   │       └── → /industry/marketplace
│   │
│   ├── /industry/meetings (Meeting Center)
│   │   ├── Stats Overview (4 cards)
│   │   │   ├── Upcoming: 5
│   │   │   ├── Completed: 12
│   │   │   ├── Pending: 3
│   │   │   └── This Week: 2
│   │   │
│   │   ├── Filter Tabs
│   │   │   ├── Upcoming (5)
│   │   │   ├── Pending (3)
│   │   │   ├── Completed (12)
│   │   │   └── Cancelled (1)
│   │   │
│   │   ├── Upcoming Meetings (2 large cards)
│   │   │   ├── Each shows:
│   │   │   │   ├── Date display (Calendar icon)
│   │   │   │   ├── Title, Researcher, Institution
│   │   │   │   ├── Date, Time, Format (Video)
│   │   │   │   ├── Description
│   │   │   │   └── Actions: Join | Calendar | Reschedule | Cancel
│   │   │   └── Primary Action: Request New Meeting
│   │   │
│   │   └── Pending Requests Table (3 rows)
│   │       └── Each row: Researcher, Technology, Date, Time, Accept/Propose
│   │
│   ├── /industry/licensing (Licensing Center)
│   │   ├── Stats Overview (4 cards)
│   │   │   ├── In Progress: 5
│   │   │   ├── Active Licenses: 2
│   │   │   ├── Completed: 8
│   │   │   └── Pending Review: 1
│   │   │
│   │   ├── Filter Tabs
│   │   │   ├── Active (7)
│   │   │   ├── Completed (8)
│   │   │   └── All (15)
│   │   │
│   │   ├── License Cards (2 shown)
│   │   │   ├── Under Review License
│   │   │   │   ├── Technology title, Researcher
│   │   │   │   ├── License ID, Status badge
│   │   │   │   ├── 7-Step Workflow Diagram
│   │   │   │   ├── Details: Date, Type, Territory, Duration
│   │   │   │   └── Actions: View | Upload | Contact
│   │   │   └── Active License
│   │   │       ├── Technology, Researcher, Status
│   │   │       ├── Details: Signed, Type, Territory, Expires
│   │   │       └── Actions: View Agreement | Download | Report
│   │   │
│   │   ├── Licensing Process Guide
│   │   │   └── 6 steps with descriptions
│   │   │
│   │   └── Primary Action: Initiate License Request
│   │
│   ├── /industry/copilot (AI Copilot)
│   │   ├── Chat Interface (Same structure as Researcher)
│   │   │   ├── AI greeting (Technology Discovery Assistant)
│   │   │   ├── User query about cancer treatments
│   │   │   ├── AI response with technology cards
│   │   │   └── Message input
│   │   │
│   │   └── Sidebar
│   │       ├── Suggested Questions (4 prompts)
│   │       └── What I Can Do (6 capabilities)
│   │
│   ├── /industry/notifications (Notifications)
│   │   ├── Filter Tabs: All (8) | Unread (3) | Smart Matches (2) | Meetings (2)
│   │   ├── Notification List
│   │   │   ├── New smart match (95% compatibility)
│   │   │   ├── Meeting confirmed
│   │   │   └── License agreement ready
│   │   └── Mark All as Read
│   │
│   └── /industry/profile (Company Profile)
│       ├── Main Form (Left Column)
│       │   ├── Company Information
│       │   │   ├── Name, Industry, Size, Website
│       │   │   └── Company Description
│       │   ├── Technology Interests
│       │   │   ├── Focus Areas (editable tags)
│       │   │   ├── Preferred Development Stage
│       │   │   └── Budget Range
│       │   └── Actions: Cancel | Save Changes
│       │
│       └── Sidebar (Right Column)
│           ├── Company Logo Upload
│           └── Account Stats (Member since, Views, Licenses)
│
└── ADMIN PORTAL
    ├── /admin (Admin Dashboard)
    │   ├── Stats Overview (4 cards)
    │   │   ├── Pending Reviews: 12
    │   │   ├── Published Studies: 347
    │   │   ├── Active Meetings: 45
    │   │   └── Active Licenses: 23
    │   │
    │   ├── Main Content (Left Column)
    │   │   ├── Pending Review Queue Table
    │   │   │   ├── 3 rows: Title, Researcher, Date, Status, Review button
    │   │   │   └── → /admin/review-queue (View All)
    │   │   └── Platform Activity Chart (30 days)
    │   │       └── Studies, Interests, Meetings, Licenses trend
    │   │
    │   └── Sidebar (Right Column)
    │       ├── Platform Stats
    │       │   ├── Total Users: 1,247 (+23)
    │       │   ├── User Breakdown (Researchers, Industry, Admins)
    │       │   └── Commercialization Rate: 18.5%
    │       ├── Recent Activity (3 items)
    │       └── Quick Actions
    │           ├── → /admin/review-queue
    │           ├── → /admin/analytics
    │           └── Export Report
    │
    ├── /admin/review-queue (Review Queue)
    │   ├── Stats Overview (4 cards)
    │   │   ├── Pending Review: 12
    │   │   ├── Under Review: 5
    │   │   ├── Approved (All Time): 234
    │   │   └── Avg Review Days: 3.2
    │   │
    │   ├── Search & Filters
    │   │   ├── Search box
    │   │   ├── Status filter
    │   │   └── Category filter
    │   │
    │   ├── Filter Tabs
    │   │   ├── Pending (12)
    │   │   ├── In Review (5)
    │   │   ├── Approved (234)
    │   │   └── Rejected (18)
    │   │
    │   ├── Review Table (4 rows)
    │   │   ├── Columns: Title, Researcher, Institution, Category, Date, Status, Priority
    │   │   ├── Each row → /admin/review/:id
    │   │   └── Review/Continue button
    │   │
    │   └── Pagination
    │
    ├── /admin/review/:id (Study Review Detail)
    │   ├── Header
    │   │   ├── Title + Status Badge
    │   │   ├── Study ID, Submitted Date
    │   │   └── Actions: Approve | Request Changes | Reject
    │   │
    │   ├── Main Content (Left Column)
    │   │   ├── Study Information (Abstract, Category, Keywords)
    │   │   ├── AI Commercial Assessment
    │   │   │   ├── Score: 8.1/10
    │   │   │   ├── Key Strengths (4 bullets)
    │   │   │   └── Target Industries (3 tags)
    │   │   ├── Documents (2 files: View, Download)
    │   │   └── Review Checklist (4 items)
    │   │       ├── ☑ Methodology sound
    │   │       ├── ☑ Commercial potential evident
    │   │       ├── ☐ IP status acceptable
    │   │       └── ☑ Documentation complete
    │   │
    │   ├── Sidebar (Right Column)
    │   │   ├── Researcher Profile
    │   │   │   ├── Photo, Name, Title, Institution
    │   │   │   └── Stats: Previous studies, Approved, Avg Score
    │   │   ├── Review Notes (Textarea + Save)
    │   │   ├── Decision Actions
    │   │   │   ├── Approve & Publish
    │   │   │   ├── Request Changes
    │   │   │   └── Reject Study
    │   │   └── Review History (2 events)
    │   │
    │   └── Approval Modal (hidden)
    │       └── Confirmation dialog
    │
    ├── /admin/meetings (Meeting Management)
    │   ├── Stats Overview (4 cards)
    │   │   ├── Active Meetings: 45
    │   │   ├── Completed: 123
    │   │   ├── This Week: 12
    │   │   └── Completion Rate: 87%
    │   │
    │   ├── Search & Filters
    │   │   ├── Search box
    │   │   ├── Status filter
    │   │   └── Date Range filter
    │   │
    │   ├── Filter Tabs
    │   │   ├── Upcoming (45)
    │   │   ├── Completed (123)
    │   │   └── Cancelled (8)
    │   │
    │   ├── Meetings Table (4 rows)
    │   │   └── Columns: Researcher, Industry, Technology, Date, Time, Status, Actions
    │   │
    │   └── Meeting Analytics (2 cards)
    │       ├── Avg Meetings per Technology: 2.3
    │       ├── Meetings → License Rate: 34%
    │       └── Most Active Category: Biotechnology
    │
    ├── /admin/licensing (Licensing Management)
    │   ├── Stats Overview (4 cards)
    │   │   ├── Pending Review: 15
    │   │   ├── Active Licenses: 23
    │   │   ├── Total Signed: 67
    │   │   └── Total Value (YTD): $12.5M
    │   │
    │   ├── Search & Filters
    │   │   ├── Search box
    │   │   ├── Status filter
    │   │   └── License Type filter
    │   │
    │   ├── Filter Tabs
    │   │   ├── Pending (15)
    │   │   ├── Active (23)
    │   │   ├── Completed (29)
    │   │   └── All (67)
    │   │
    │   ├── License Table (4 rows)
    │   │   └── Columns: Technology, Researcher, Licensee, Type, Value, Status, Date, Actions
    │   │
    │   └── Analytics (2 cards)
    │       ├── Licensing Pipeline (Funnel chart placeholder)
    │       └── Revenue by Category (Bar chart)
    │           ├── Biotechnology: $6.2M (50%)
    │           ├── AI/ML: $3.8M (30%)
    │           └── Materials Science: $2.5M (20%)
    │
    ├── /admin/audit-logs (Audit Logs)
    │   ├── Search & Filters
    │   │   ├── Search box
    │   │   ├── Event Type filter
    │   │   ├── User Type filter
    │   │   └── Date Range filter (Last 7 Days)
    │   │
    │   ├── Filter Tabs
    │   │   ├── All Events
    │   │   ├── User Actions
    │   │   ├── Admin Actions
    │   │   └── System Events
    │   │
    │   ├── Audit Log Table (8 rows)
    │   │   └── Columns: Timestamp, Event Type, User, Action, Details, IP Address
    │   │
    │   ├── Pagination (1-8 of 1,247)
    │   ├── Export Logs button
    │   │
    │   └── Analytics (3 cards)
    │       ├── Event Distribution (Today)
    │       │   ├── User Logins: 234
    │       │   ├── Study Actions: 45
    │       │   ├── Meeting Events: 23
    │       │   └── License Events: 8
    │       ├── Most Active Users (Top 3)
    │       └── Security Alerts (None)
    │
    └── /admin/analytics (Analytics Dashboard)
        ├── Date Range Selector (Last 30 Days) + Export Report
        ├── High-Level Stats (4 cards)
        │   ├── Total Users: 1,247 (+12%)
        │   ├── Published Studies: 347 (+8%)
        │   ├── Active Collaborations: 156 (+15%)
        │   └── License Value (YTD): $12.5M (+22%)
        │
        ├── Main Visualizations (2 large cards)
        │   ├── Commercialization Funnel
        │   │   ├── Studies Uploaded: 487
        │   │   ├── Approved: 347 (71%)
        │   │   ├── Industry Interest: 234 (68%)
        │   │   ├── Meetings: 156 (45%)
        │   │   ├── Licenses: 67 (19%)
        │   │   └── Overall Conversion: 18.5%
        │   └── Growth Trends Chart (placeholder)
        │       └── Studies, Users, Licenses over time
        │
        ├── Category Breakdowns (2 cards)
        │   ├── Studies by Category
        │   │   ├── Biotechnology: 127 (37%)
        │   │   ├── AI/ML: 89 (26%)
        │   │   ├── Materials Science: 67 (19%)
        │   │   └── Environmental: 64 (18%)
        │   └── Industry Partner Activity
        │       ├── Pharmaceuticals: 145 interests
        │       ├── Technology: 98 interests
        │       └── Energy: 67 interests
        │
        └── Performance Metrics (3 cards)
            ├── Top Performing Technologies (3 items)
            ├── Platform Engagement
            │   ├── Daily Active Users: 423
            │   ├── Avg Session: 12m 34s
            │   ├── Technologies/User: 3.2
            │   └── Return Rate: 67%
            └── Success Metrics
                ├── Avg Time to License: 45 days
                ├── Meeting → License: 34%
                ├── User Satisfaction: 4.2/5
                └── Platform Uptime: 99.8%
```

## 🔗 Cross-Portal Interactions

### Journey 1: Research to License (Full Flow)
```
RESEARCHER                    ADMIN                      INDUSTRY
    │                           │                           │
    ├─ Upload Study            │                           │
    ├─ Submit for Review ────► │                           │
    │                           ├─ Review Study            │
    │                           ├─ Approve & Publish ────► │
    │                           │                           ├─ Browse Marketplace
    │                           │                           ├─ View Technology
    │                           │                           ├─ Express Interest ──►│
    ├─ Receive Notification ◄──┤                           │
    ├─ Accept Interest          │                           │
    ├─ Schedule Meeting ◄───────┼───────────────────────── ├─ Request Meeting
    ├─ Complete Meeting ────────┼──────────────────────► ─┤
    │                           │                           ├─ Request License ───►│
    │                           │ ◄─────────────────────────┤
    │                           ├─ Review License          │
    │                           ├─ Generate Agreement ────►│
    │                           │                           ├─ Sign Agreement
    ├─ Receive License Copy ◄── ├─ Finalize License ◄───── ┤
    │                           │                           │
```

## 📊 Data Flow Diagram

```
┌─────────────┐
│  RESEARCHER │
└──────┬──────┘
       │
       ├─ Creates ──► ┌───────┐
       │              │ STUDY │ ◄─── Reviews ──┐
       │              └───┬───┘                │
       │                  │                    │
       │                  ├─ Appears in ──► ┌──────────────┐
       │                  │                 │ MARKETPLACE  │
       │                  │                 └──────┬───────┘
       │                  │                        │
       │                  │                        ├─ Browsed by ──┐
       │                  │                        │               │
       ├─ Participates ──►├─ Generated ──► ┌───────────┐          │
       │                  │                │  MEETING  │ ◄────────┤
       │                  │                └─────┬─────┘          │
       │                  │                      │                │
       │                  └─ Licensed via ──► ┌──────────┐        │
       │                                      │ LICENSE  │ ◄──────┤
       │                                      └────┬─────┘        │
       │                                           │              │
       │                                      ┌────▼─────┐  ┌─────▼──────┐
       │                                      │  ADMIN   │  │  INDUSTRY  │
       │                                      └──────────┘  └────────────┘
       │                                           │              │
       └───── Approved by / Coordinated by ───────┘              │
                                                                  │
              All interactions logged in ──► ┌──────────────┐    │
                                             │  AUDIT LOG   │    │
                                             └──────────────┘    │
                                                                  │
              Platform metrics tracked in ──► ┌──────────────┐   │
                                              │  ANALYTICS   │   │
                                              └──────────────┘   │
                                                                  │
              AI insights generated for ─────► ┌──────────────┐  │
                                               │  AI COPILOT  │ ◄┘
                                               └──────────────┘
```

---

**Total Wireframes**: 27  
**Total Workflows**: 5 major, 15+ sub-workflows  
**Navigation Depth**: Up to 4 levels  
**Interconnected Journeys**: 12+ cross-portal flows
