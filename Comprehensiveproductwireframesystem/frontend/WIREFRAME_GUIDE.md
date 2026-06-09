# NRDC R2C Wireframe System

## Overview

This is a comprehensive product wireframe system for the **NRDC Research to Commercialization (R2C) Platform**. This is NOT a UI design exercise—it's a product planning and workflow wireframing tool built with grayscale wireframes to focus on information architecture, user journeys, and system workflows.

## Design Philosophy

- **Grayscale Only**: No colors, branding, or high-fidelity UI elements
- **Information Architecture First**: Focus on layout, navigation, and data flow
- **Product Management Perspective**: Think like a PM and Solution Architect
- **Workflow Visualization**: Clear representation of all user journeys and system states

## User Types

1. **Researcher** - Uploads and commercializes research
2. **Industry User** - Discovers and licenses technologies
3. **Admin (NRDC)** - Reviews, approves, and manages the platform

## End-to-End Journey

```
Research Upload
   ↓
AI Extraction & Analysis
   ↓
Admin Review & Approval
   ↓
Marketplace Publication
   ↓
Industry Discovery
   ↓
Industry Interest Expression
   ↓
Meeting Scheduling
   ↓
Licensing Request
   ↓
NRDC Approval Workflow
   ↓
License Agreement & Signing
   ↓
Commercialization Tracking
```

## Pages Implemented

### PUBLIC PAGES (4)
- `/` - Landing Page
- `/login` - Login Page
- `/signup` - Signup Page (with user type selection)
- `/forgot-password` - Password Reset

### RESEARCHER PORTAL (7)
- `/researcher` - Dashboard with stats and recent activity
- `/researcher/upload` - Multi-step Upload Research Wizard
- `/researcher/studies` - My Studies (filterable table view)
- `/researcher/studies/:id` - Study Details with metrics
- `/researcher/copilot` - AI Copilot Chat Interface
- `/researcher/notifications` - Notification Center
- `/researcher/profile` - Profile Settings

### INDUSTRY PORTAL (9)
- `/industry` - Dashboard with smart matches
- `/industry/marketplace` - Technology Marketplace (grid view with filters)
- `/industry/technology/:id` - Technology Detail View
- `/industry/smart-match` - AI-Powered Technology Matching
- `/industry/meetings` - Meeting Center
- `/industry/licensing` - Licensing Center with workflow
- `/industry/copilot` - AI Copilot for Discovery
- `/industry/notifications` - Notification Center
- `/industry/profile` - Company Profile

### ADMIN PORTAL (7)
- `/admin` - Admin Dashboard with platform stats
- `/admin/review-queue` - Study Review Queue
- `/admin/review/:id` - Study Review Detail with checklist
- `/admin/meetings` - Meeting Management
- `/admin/licensing` - Licensing Management
- `/admin/audit-logs` - Complete Audit Trail
- `/admin/analytics` - Analytics Dashboard with funnel

## Key Workflows Visualized

### 1. Research Upload Flow
```
Draft → Submitted → Under Review → Approved → Published
```

### 2. Industry Interest Flow
```
Interest Submitted → Accepted/Rejected
```

### 3. Meeting Flow
```
Requested → Scheduled → Completed → Cancelled
```

### 4. Licensing Flow
```
Requested → Under Review → Approved → Agreement Generated → Signed
```

## Special Features

### Commercialization Funnel
Visual representation showing:
- Studies Uploaded
- Studies Approved  
- Industry Interest
- Meetings Scheduled
- Licenses Signed

### Technology Transfer Timeline
Shows complete journey from upload to licensing with status indicators.

### AI Copilot
- Research context awareness
- Commercial potential analysis
- Market insights
- Licensing recommendations
- Meeting preparation

## Wireframe Components

All wireframes show:

### Navigation
- Sidebar navigation for authenticated users
- Top bar with user menu and notifications
- Breadcrumbs for context

### Page Elements
- Page Title and Description
- Primary Action Buttons
- Secondary Actions
- Search and Filters
- Data Tables
- Cards for grouped information
- Status Badges
- Empty States
- Success/Error States
- Approval Workflows

### Data Visualization
- Workflow Diagrams (vertical flow with arrows)
- Progress Bars
- Statistics Cards
- Funnel Charts (placeholders)
- Line Charts (placeholders)
- Bar Charts (placeholders)

## State Management

Each page demonstrates multiple states:

- **Loading** - Data fetching states
- **Empty** - No data available
- **Success** - Normal operation
- **Error** - Error handling
- **Pending** - Awaiting action

## Navigation Structure

```
Public
├── Landing
├── Login
├── Signup
└── Forgot Password

Researcher
├── Dashboard
├── Upload Research (Wizard: 4 steps)
├── My Studies
│   └── Study Details
├── AI Copilot
├── Notifications
└── Profile

Industry
├── Dashboard
├── Marketplace
│   └── Technology Detail
├── Smart Match
├── Meeting Center
├── Licensing Center
├── AI Copilot
├── Notifications
└── Profile

Admin
├── Dashboard
├── Review Queue
│   └── Study Review Detail
├── Meeting Management
├── Licensing Management
├── Audit Logs
└── Analytics Dashboard
```

## Technology Stack

- **React** with TypeScript
- **React Router** for navigation
- **Tailwind CSS v4** for styling
- **Lucide React** for icons
- **Grayscale Design System** for consistency

## Wireframe Conventions

### Typography
- Page Titles: 24px (text-2xl)
- Card Titles: 16px (text-base)
- Body Text: 14px (text-sm)
- Helper Text: 12px (text-xs)

### Spacing
- Consistent padding and margins using Tailwind scale
- Grid layouts for responsive design
- Gap utilities for consistent spacing

### Borders
- Solid: `border-2 border-neutral-400` for main elements
- Dashed: `border-2 border-dashed border-neutral-400` for placeholders

### Status Colors (Grayscale)
- Draft: `bg-neutral-200`
- Submitted: `bg-neutral-300`
- Under Review: `bg-neutral-400`
- Approved: `bg-neutral-500`
- Published: `bg-neutral-700`
- Active: `bg-neutral-800`

## Usage

This wireframe system is designed for:

1. **Product Planning** - Understanding feature requirements
2. **Stakeholder Alignment** - Communicating workflows to non-technical stakeholders
3. **Development Planning** - Blueprint for implementation
4. **User Testing** - Low-fidelity prototype for user feedback
5. **Documentation** - Reference for the complete system flow

## Viewing the Wireframes

The application runs as a standard React app. Navigate between different user portals using the routes listed above. Each page demonstrates the complete information architecture without visual design distractions.

## Key Insights

This wireframe system demonstrates:

- **Complete user journeys** from research upload to licensing
- **Role-based access** with distinct portals for each user type
- **AI integration points** throughout the platform
- **Approval workflows** with multi-step processes
- **Data relationships** between researchers, technologies, and industry partners
- **Notification systems** for keeping users informed
- **Analytics and reporting** for platform administrators
- **Document management** for research papers and licenses
- **Meeting coordination** between researchers and industry
- **Commercial assessment** using AI-powered scoring

---

**Note**: This is a wireframe/prototype system. All data is mock data for demonstration purposes. The focus is on workflow, information architecture, and user experience patterns, not visual design or implementation details.
