# NRDC R2C Platform - Complete Wireframe System

## 🎯 Project Overview

**Product**: NRDC Research to Commercialization (R2C) Platform  
**Purpose**: Product Planning & Workflow Wireframing  
**Approach**: Grayscale wireframes focused on information architecture  
**Total Pages**: 27 comprehensive wireframes

---

## 📊 Complete Page Inventory

### PUBLIC PORTAL (4 pages)

| Route | Page | Key Elements |
|-------|------|--------------|
| `/` | **Landing Page** | Hero section, How It Works, User type selection, Stats, CTA |
| `/login` | **Login** | Email/password, Demo access buttons, Forgot password link |
| `/signup` | **Signup** | User type selection (Researcher/Industry), Conditional forms |
| `/forgot-password` | **Password Reset** | Email input, Success/error states |

### RESEARCHER PORTAL (7 pages)

| Route | Page | Key Elements |
|-------|------|--------------|
| `/researcher` | **Dashboard** | Stats cards (12 studies, 8 published, 15 interests), Recent studies, Pending actions, Upcoming meetings |
| `/researcher/upload` | **Upload Research Wizard** | 4-step wizard: Upload → Info → AI Analysis → Review, Progress indicator, AI commercial score (8.5/10) |
| `/researcher/studies` | **My Studies** | Filterable table, Search, Status badges, Pagination, Bulk actions |
| `/researcher/studies/:id` | **Study Details** | Metrics (234 views, 12 interests), Industry interest table, Meeting history, AI insights, Documents |
| `/researcher/copilot` | **AI Copilot** | Chat interface, Suggested prompts, Research context, Commercial insights |
| `/researcher/notifications` | **Notifications** | Filter tabs, Unread indicators, Action buttons, Meeting requests, Admin feedback |
| `/researcher/profile` | **Profile** | Personal info, Professional info, Research areas, Verification status |

### INDUSTRY PORTAL (9 pages)

| Route | Page | Key Elements |
|-------|------|--------------|
| `/industry` | **Dashboard** | Stats (23 saved, 8 interests, 5 meetings), Smart matches (95% score), Recent activity |
| `/industry/marketplace` | **Marketplace** | Grid/list view toggle, Advanced filters (category, score, date), Technology cards, Save functionality |
| `/industry/technology/:id` | **Technology Detail** | Overview, Commercial assessment (8.5/10), Market analysis, Researcher profile, IP status, Documents |
| `/industry/smart-match` | **Smart Match** | AI-powered recommendations, Match scores (95%, 92%, 88%), Match reasons, Company profile settings |
| `/industry/meetings` | **Meeting Center** | Calendar view, Upcoming meetings, Pending requests, Accept/reschedule actions |
| `/industry/licensing` | **Licensing Center** | Flexible workflow (Simplified vs Full), Active licenses, Process guide with 2-path explanation |
| `/industry/copilot` | **AI Copilot** | Technology discovery chat, Market analysis, Licensing guidance, Competitive intelligence |
| `/industry/notifications` | **Notifications** | Smart match alerts, Meeting confirmations, License updates, Filter tabs |
| `/industry/profile` | **Company Profile** | Company info, Technology interests, Focus areas, Budget range, Match preferences |

### ADMIN PORTAL (7 pages)

| Route | Page | Key Elements |
|-------|------|--------------|
| `/admin` | **Admin Dashboard** | Platform stats (1,247 users, 347 studies), Pending reviews (12), Activity chart, Quick actions |
| `/admin/review-queue` | **Review Queue** | Filterable table, Priority indicators, Status filters, Search, Average review time (3.2 days) |
| `/admin/review/:id` | **Study Review Detail** | Study info, AI assessment, Review checklist, Documents, Approval actions, Review notes |
| `/admin/meetings` | **Meeting Management** | All meetings table, Status filters, Analytics (completion rate 87%), Recent activity |
| `/admin/licensing` | **Licensing Management** | License pipeline, Workflow automation rules, Stats (34% simplified, 66% full), Revenue by category |
| `/admin/audit-logs` | **Audit Logs** | Complete event log, Event type filters, User activity, IP tracking, Export functionality |
| `/admin/analytics` | **Analytics Dashboard** | Commercialization funnel (18.5% conversion), Growth trends, Category breakdown, Success metrics |

---

## 🔄 Complete Workflow Visualizations

### 1. Research Upload Workflow
```
┌─────────┐    ┌───────────┐    ┌──────────────┐    ┌──────────┐    ┌───────────┐
│  Draft  │ -> │ Submitted │ -> │ Under Review │ -> │ Approved │ -> │ Published │
└─────────┘    └───────────┘    └──────────────┘    └──────────┘    └───────────┘
                                                           │
                                                           v
                                                      ┌──────────┐
                                                      │ Rejected │
                                                      └──────────┘
```

### 2. Industry Interest Workflow
```
┌────────────────────┐    ┌──────────┐
│ Interest Submitted │ -> │ Accepted │ -> Meeting Scheduled
└────────────────────┘    └──────────┘
         │
         v
    ┌──────────┐
    │ Rejected │
    └──────────┘
```

### 3. Meeting Workflow
```
┌───────────┐    ┌───────────┐    ┌───────────┐
│ Requested │ -> │ Scheduled │ -> │ Completed │
└───────────┘    └───────────┘    └───────────┘
      │
      v
┌───────────┐
│ Cancelled │
└───────────┘
```

### 4. Licensing Workflow (⭐ NEW: Flexible Two-Path System)

**Simplified Process** (2-5 days) - 34% of licenses:
```
┌───────────┐    ┌────────────────────┐    ┌────────┐
│ Requested │ -> │ Auto-Gen Agreement │ -> │ Signed │
└───────────┘    └────────────────────┘    └────────┘
```

**Full Review Process** (15-45 days) - 66% of licenses:
```
┌───────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐    ┌────────┐
│ Requested │ -> │ Under Review │ -> │ Legal Review │ -> │ Custom Agreement   │ -> │ Signed │
└───────────┘    └──────────────┘    └──────────────┘    └────────────────────┘    └────────┘
```

**Automatic Routing Criteria**:
- License type (Exclusive → Always Full | Non-Exclusive → Evaluate)
- Value (< $50K → Simplified | ≥ $50K → Full Review)
- Terms complexity, Partner history, Custom requirements

📄 **See `FLEXIBLE_LICENSING.md` for complete documentation**

### 5. Commercialization Funnel (Full Platform)
```
Studies Uploaded: 487
        ↓ 71%
Approved: 347
        ↓ 68%
Industry Interest: 234
        ↓ 45%
Meetings: 156
        ↓ 19%
Licenses: 67

Overall Conversion: 18.5% (Upload → License)
```

---

## 🎨 Design System Elements

### Wireframe Components Created

**Navigation**
- Sidebar navigation (Researcher, Industry, Admin)
- Top bar with notifications and user menu
- Breadcrumbs
- Footer (Public pages)

**Page Elements**
- WireframeBox - Container with optional labels
- WireframeButton - Primary, Secondary, Ghost variants
- WireframeInput - Text, Email, Password, Search
- WireframeCard - Cards with titles and actions
- WireframeTable - Data tables with headers and rows
- StatusBadge - Draft, Submitted, Under Review, Approved, Published, etc.
- WorkflowDiagram - Vertical workflow visualization
- FlexibleWorkflow - ⭐ NEW: Two-path workflow with skip indicators

**Status Colors (Grayscale)**
- Draft: `bg-neutral-200`
- Submitted: `bg-neutral-300`
- Under Review: `bg-neutral-400`
- Approved: `bg-neutral-500`
- Published: `bg-neutral-700`
- Active: `bg-neutral-800`
- Rejected: `bg-neutral-600`
- Pending: `bg-neutral-300`
- Scheduled: `bg-neutral-400`
- Completed: `bg-neutral-600`
- Cancelled: `bg-neutral-500`

---

## 📋 Page Features Matrix

### Every Page Includes:

✅ **Navigation Structure**
- Sidebar or header navigation
- User context (avatar, name, role)
- Notification indicators

✅ **Page Title & Context**
- Clear page title
- Descriptive subtitle
- Breadcrumb trail (where applicable)

✅ **Primary Actions**
- Main CTAs prominently placed
- Action hierarchy (Primary → Secondary → Ghost)

✅ **Filters & Search**
- Search bars for data discovery
- Category, status, date filters
- Advanced filter options

✅ **Data Display**
- Tables with sortable columns
- Card grids for visual browsing
- Statistics cards with metrics

✅ **Status Indicators**
- Visual workflow state badges
- Progress bars for scores
- Timeline indicators

✅ **Multiple States**
- Empty states ("No data yet")
- Success states (Data loaded)
- Error states (Validation, failures)
- Loading states (Placeholders)

✅ **User Actions**
- Interactive buttons
- Form inputs
- Dropdown menus
- Checkboxes and toggles

---

## 🎯 Special Wireframe Features

### AI Copilot Interface (2 implementations)

**Researcher AI Copilot** (`/researcher/copilot`)
- Commercial potential analysis
- Target industry recommendations
- Meeting preparation assistance
- Licensing process guidance

**Industry AI Copilot** (`/industry/copilot`)
- Technology discovery assistance
- Market analysis
- Competitive intelligence
- ROI projections

**Common Elements:**
- Chat message history
- Suggested prompts
- Active context display
- Typing indicators
- Export chat functionality

### Upload Wizard (4-step process)

**Step 1: Upload Document**
- Drag & drop area
- DOI input option
- File format validation

**Step 2: Basic Information**
- Title, abstract, category
- Keywords, authors
- Publication details

**Step 3: AI Extraction**
- Commercial readiness score (8.5/10)
- Key innovations detected
- Suggested industry sectors
- Market potential analysis

**Step 4: Review & Submit**
- Complete review
- Confirmation checkbox
- Submit or save draft

### Smart Match System

**Match Profile Configuration**
- Industry focus
- Technology areas
- Development stage preferences
- Budget range

**Match Results Display**
- Match score (95%, 92%, 88%)
- Reasons for match (3-4 bullet points)
- Commercial score
- Quick actions (View, Interest, Meeting, Save)

### Analytics Dashboard

**Commercialization Funnel Visualization**
- Studies Uploaded: 487
- Approved: 347 (71%)
- Industry Interest: 234 (68%)
- Meetings: 156 (45%)
- Licenses: 67 (19%)

**Platform Metrics**
- Total users (1,247)
- Published studies (347)
- Active collaborations (156)
- License value ($12.5M YTD)

**Category Breakdown**
- Biotechnology (37%)
- AI/ML (26%)
- Materials Science (19%)
- Environmental Science (18%)

---

## 🔗 Navigation Paths

### Cross-Portal Journeys

**Researcher → Industry (via published study)**
1. Researcher publishes study
2. Study appears in Industry Marketplace
3. Industry expresses interest
4. Researcher receives notification
5. Both users coordinate meeting
6. Licensing process begins

**Industry → Admin → Researcher (via licensing)**
1. Industry requests license
2. Admin reviews request
3. Admin coordinates with researcher
4. Agreement drafted
5. All parties sign
6. License activated

**Admin → All Users (via review/approval)**
1. Admin reviews submitted content
2. Admin approves or requests changes
3. Notifications sent to users
4. Content published or revised
5. Activity logged in audit trail

---

## 📊 Data Relationships Visualized

### Core Entities

**Study (Research)**
- ID, Title, Abstract
- Category, Technology Area
- Status (Draft → Published)
- Commercial Score
- Documents

**Researcher**
- Profile, Institution
- Studies (1:Many)
- Meetings
- Notifications

**Industry Partner**
- Company Profile
- Focus Areas
- Saved Technologies
- Interests Expressed
- Active Licenses

**Meeting**
- Researcher + Industry
- Technology Reference
- Date/Time
- Status
- Notes

**License**
- Technology Reference
- Licensee
- Type (Exclusive/Non-Exclusive)
- Territory, Duration
- Value
- Status Workflow

### Relationships Shown

- Researcher HAS MANY Studies
- Study RECEIVES MANY Interests
- Interest LEADS TO Meeting
- Meeting MAY LEAD TO License
- License BELONGS TO Study + Industry
- Admin REVIEWS Studies
- Admin MANAGES Meetings
- Admin APPROVES Licenses

---

## 🎓 Learning from the Wireframes

### For Product Managers
- Complete feature set visualization
- User journey understanding
- Priority and scope clarity
- Integration points identified

### For Developers
- Data model requirements
- API endpoint needs
- State management complexity
- User interaction patterns

### For Stakeholders
- Platform value proposition
- User experience flow
- Feature completeness
- Commercialization process clarity

### For Designers
- Information hierarchy
- Layout patterns
- Component requirements
- Responsive considerations

---

## ✅ Completeness Checklist

**All User Types Covered**
- ✅ Public/Anonymous users
- ✅ Researchers
- ✅ Industry partners
- ✅ NRDC administrators

**All Core Workflows**
- ✅ Research upload and submission
- ✅ Admin review and approval
- ✅ Marketplace browsing and discovery
- ✅ Smart matching algorithm
- ✅ Interest expression
- ✅ Meeting scheduling
- ✅ **Flexible licensing workflow** (Simplified 2-5 days OR Full Review 15-45 days)
- ✅ Commercialization tracking

**All Page States**
- ✅ Empty states
- ✅ Loading states
- ✅ Success states
- ✅ Error states
- ✅ Approval/rejection states

**All Key Features**
- ✅ AI-powered analysis
- ✅ Commercial readiness scoring
- ✅ Smart technology matching
- ✅ Meeting coordination
- ✅ License management
- ✅ Notification system
- ✅ Audit logging
- ✅ Analytics dashboard

**Design Consistency**
- ✅ Grayscale only (no colors)
- ✅ Consistent components
- ✅ Clear information hierarchy
- ✅ Logical navigation structure
- ✅ Professional wireframe aesthetic

---

## 🚀 Next Steps for Implementation

1. **Stakeholder Review**
   - Present wireframes to stakeholders
   - Gather feedback on workflows
   - Validate feature completeness
   - Prioritize features for MVP

2. **User Testing**
   - Conduct workflow walkthroughs
   - Test navigation patterns
   - Validate information architecture
   - Identify usability issues

3. **Technical Planning**
   - Define data models
   - Plan API architecture
   - Identify third-party integrations
   - Estimate development effort

4. **Design Phase**
   - Apply brand identity
   - Create high-fidelity mockups
   - Design component library
   - Prepare design system

5. **Development**
   - Set up project infrastructure
   - Build component library
   - Implement core workflows
   - Integrate AI services

---

## 📝 Notes

- All data shown is mock data for demonstration
- Focus is on structure and workflow, not visual design
- Wireframes are intentionally grayscale to avoid design bias
- Each page demonstrates complete user journeys
- System is fully navigable and interconnected

---

**Document Version**: 1.0  
**Last Updated**: June 3, 2026  
**Pages**: 27 wireframes  
**Workflows**: 5 major workflows  
**User Types**: 4 (Public, Researcher, Industry, Admin)
