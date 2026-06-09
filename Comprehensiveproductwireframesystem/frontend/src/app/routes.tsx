import { createBrowserRouter } from "react-router";
import { ProtectedRoute, RoleRedirect, UnauthorizedPage } from "@/components/ProtectedRoute";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/public/LoginPage";
import { SignupPage } from "./pages/public/SignupPage";
import { ForgotPasswordPage } from "./pages/public/ForgotPasswordPage";

// Researcher Pages
import { ResearcherDashboard } from "./pages/researcher/ResearcherDashboard";
import { UploadResearchWizard } from "./pages/researcher/UploadResearchWizard";
import { MyStudies } from "./pages/researcher/MyStudies";
import { StudyDetails } from "./pages/researcher/StudyDetails";
import { ResearcherAICopilot } from "./pages/researcher/ResearcherAICopilot";
import { ResearcherNotifications } from "./pages/researcher/ResearcherNotifications";
import { ResearcherProfile } from "./pages/researcher/ResearcherProfile";
import { ResearcherLicenseRequests } from "./pages/researcher/ResearcherLicenseRequests";

// Industry Pages
import { IndustryDashboard } from "./pages/industry/IndustryDashboard";
import { Marketplace } from "./pages/industry/Marketplace";
import { TechnologyDetail } from "./pages/industry/TechnologyDetail";
import { ProblemStatements } from "./pages/industry/ProblemStatements";
import { SmartMatch } from "./pages/industry/SmartMatch";
import { MeetingCenter } from "./pages/industry/MeetingCenter";
import { LicensingCenter } from "./pages/industry/LicensingCenter";
import { IndustryAICopilot } from "./pages/industry/IndustryAICopilot";
import { IndustryNotifications } from "./pages/industry/IndustryNotifications";
import { IndustryProfile } from "./pages/industry/IndustryProfile";
import { LicenseRequestDetail } from "./pages/industry/LicenseRequestDetail";
import { MeetingRequestForm } from "./pages/industry/MeetingRequestForm";
import { MeetingSummary } from "./pages/industry/MeetingSummary";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ReviewQueue } from "./pages/admin/ReviewQueue";
import { StudyReviewDetail } from "./pages/admin/StudyReviewDetail";
import { MeetingManagement } from "./pages/admin/MeetingManagement";
import { LicensingManagement } from "./pages/admin/LicensingManagement";
import { InterestsExpressed } from "./pages/admin/InterestsExpressed";
import { InterestDetail } from "./pages/admin/InterestDetail";
import { ProblemStatementReview } from "./pages/admin/ProblemStatementReview";
import { AdminAICopilot } from "./pages/admin/AdminAICopilot";
import { AuditLogs } from "./pages/admin/AuditLogs";
import { AnalyticsDashboard } from "./pages/admin/AnalyticsDashboard";
import { AdminProfile } from "./pages/admin/AdminProfile";
import { AdminNotifications } from "./pages/admin/AdminNotifications";
import { AdminLicenseDetailView } from "./pages/admin/AdminLicenseDetailView";
import { MeetingDetail } from "./pages/admin/MeetingDetail";

// Layouts
import { PublicLayout } from "./layouts/PublicLayout";
import { ResearcherLayout } from "./layouts/ResearcherLayout";
import { IndustryLayout } from "./layouts/IndustryLayout";
import { AdminLayout } from "./layouts/AdminLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PublicLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
    ],
  },
  {
    path: "/unauthorized",
    Component: UnauthorizedPage,
  },
  {
    path: "/researcher",
    Component: ResearcherLayout,
    children: [
      {
        index: true,
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "upload",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <UploadResearchWizard />
          </ProtectedRoute>
        ),
      },
      {
        path: "studies",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <MyStudies />
          </ProtectedRoute>
        ),
      },
      {
        path: "studies/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <StudyDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: "license-requests",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherLicenseRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: "license-requests/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherLicenseRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: "copilot",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherAICopilot />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherNotifications />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        Component: () => (
          <ProtectedRoute requiredRoles={["researcher"]}>
            <ResearcherProfile />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/industry",
    Component: IndustryLayout,
    children: [
      {
        index: true,
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <IndustryDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "marketplace",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <Marketplace />
          </ProtectedRoute>
        ),
      },
      {
        path: "problems",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <ProblemStatements />
          </ProtectedRoute>
        ),
      },
      {
        path: "technology/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <TechnologyDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "smart-match",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <SmartMatch />
          </ProtectedRoute>
        ),
      },
      {
        path: "meetings",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <MeetingCenter />
          </ProtectedRoute>
        ),
      },
      {
        path: "meetings/new",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <MeetingRequestForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "meetings/:id/summary",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <MeetingSummary />
          </ProtectedRoute>
        ),
      },
      {
        path: "licensing",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <LicensingCenter />
          </ProtectedRoute>
        ),
      },
      {
        path: "licensing/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <LicenseRequestDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "copilot",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <IndustryAICopilot />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <IndustryNotifications />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        Component: () => (
          <ProtectedRoute requiredRoles={["industry"]}>
            <IndustryProfile />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      {
        index: true,
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "review-queue",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <ReviewQueue />
          </ProtectedRoute>
        ),
      },
      {
        path: "review/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <StudyReviewDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "meetings",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <MeetingManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "meetings/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <MeetingDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "interests",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <InterestsExpressed />
          </ProtectedRoute>
        ),
      },
      {
        path: "interests/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <InterestDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "licensing",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <LicensingManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "licensing/:id",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AdminLicenseDetailView />
          </ProtectedRoute>
        ),
      },
      {
        path: "problems",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <ProblemStatementReview />
          </ProtectedRoute>
        ),
      },
      {
        path: "copilot",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AdminAICopilot />
          </ProtectedRoute>
        ),
      },
      {
        path: "audit-logs",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AuditLogs />
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AdminProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        Component: () => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <AdminNotifications />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
