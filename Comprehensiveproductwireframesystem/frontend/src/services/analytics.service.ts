import { AnalyticsMetrics, CommercializationFunnelStage, Study } from '@/types/index';
import { normalizeLicenseStatus } from '@/app/config/licenseStatus';

/**
 * Analytics Service
 * Handles analytics calculations and reporting
 */

// ============================================================================
// Get Metrics
// ============================================================================

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In future: GET /api/analytics/metrics

  // Get studies
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );

  // Calculate metrics
  const totalStudies = studies.length;
  const approvedStudies = studies.filter(
    (s: Study) => s.status === 'approved'
  ).length;
  const publishedStudies = studies.filter(
    (s: Study) => s.status === 'published'
  ).length;
  const industryInterests = interests.length;
  const meetingsScheduled = meetings.filter(
    (m: any) => m.status === 'scheduled'
  ).length;
  const licensesRequested = licenseRequests.filter(
    (l: any) => normalizeLicenseStatus(l.status) === 'pending'
  ).length;
  const licensesSigned = licenseRequests.filter(
    (l: any) => ['signed_submitted', 'agreement_executed', 'commercialized'].includes(normalizeLicenseStatus(l.status))
  ).length;

  return {
    totalStudies,
    approvedStudies,
    publishedStudies,
    industryInterests,
    meetingsScheduled,
    licensesRequested,
    licensesSigned,
  };
}

// ============================================================================
// Get Commercialization Funnel
// ============================================================================

export async function getCommercializationFunnel(): Promise<
  CommercializationFunnelStage[]
> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: GET /api/analytics/funnel

  // Get studies
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );

  const totalStudies = studies.length;
  const submittedStudies = studies.filter(
    (s: Study) => s.status !== 'draft'
  ).length;
  const approvedStudies = studies.filter(
    (s: Study) => s.status === 'approved'
  ).length;
  const publishedStudies = studies.filter(
    (s: Study) => s.status === 'published'
  ).length;
  const studiesWithInterest = studies.filter((s: Study) =>
    interests.some((i: any) => i.studyId === s.id)
  ).length;
  const studiesWithMeetings = studies.filter((s: Study) =>
    meetings.some((m: any) => m.studyId === s.id)
  ).length;
  const studiesWithLicense = studies.filter((s: Study) =>
    licenseRequests.some((l: any) => l.studyId === s.id)
  ).length;

  const funnel: CommercializationFunnelStage[] = [
    {
      stage: 'Total Studies',
      count: totalStudies,
      percentage: 100,
    },
    {
      stage: 'Submitted',
      count: submittedStudies,
      percentage: totalStudies > 0 ? (submittedStudies / totalStudies) * 100 : 0,
    },
    {
      stage: 'Approved',
      count: approvedStudies,
      percentage:
        totalStudies > 0 ? (approvedStudies / totalStudies) * 100 : 0,
    },
    {
      stage: 'Published',
      count: publishedStudies,
      percentage:
        totalStudies > 0 ? (publishedStudies / totalStudies) * 100 : 0,
    },
    {
      stage: 'Industry Interest',
      count: studiesWithInterest,
      percentage:
        totalStudies > 0
          ? (studiesWithInterest / totalStudies) * 100
          : 0,
    },
    {
      stage: 'Meetings',
      count: studiesWithMeetings,
      percentage:
        totalStudies > 0
          ? (studiesWithMeetings / totalStudies) * 100
          : 0,
    },
    {
      stage: 'Licensing',
      count: studiesWithLicense,
      percentage:
        totalStudies > 0 ? (studiesWithLicense / totalStudies) * 100 : 0,
    },
  ];

  return funnel;
}

// ============================================================================
// Get Domain Distribution
// ============================================================================

export async function getDomainDistribution(): Promise<
  Record<string, number>
> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/analytics/domains

  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');

  const distribution: Record<string, number> = {};
  studies.forEach((study: Study) => {
    distribution[study.domain] = (distribution[study.domain] || 0) + 1;
  });

  return distribution;
}

// ============================================================================
// Get Status Distribution
// ============================================================================

export async function getStatusDistribution(): Promise<Record<string, number>> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/analytics/status

  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');

  const distribution: Record<string, number> = {};
  studies.forEach((study: Study) => {
    distribution[study.status] = (distribution[study.status] || 0) + 1;
  });

  return distribution;
}

// ============================================================================
// Get Recent Activity
// ============================================================================

export async function getRecentActivity(
  days: number = 30
): Promise<
  Array<{
    date: string;
    studiesSubmitted: number;
    interestsReceived: number;
    meetingsScheduled: number;
  }>
> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: GET /api/analytics/activity?days=:days

  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Group by date
  const activity: Record<
    string,
    { studiesSubmitted: number; interestsReceived: number; meetingsScheduled: number }
  > = {};

  // Count studies
  studies.forEach((study: Study) => {
    if (new Date(study.createdAt) >= cutoffDate) {
      const dateStr = new Date(study.createdAt).toISOString().split('T')[0];
      if (!activity[dateStr]) {
        activity[dateStr] = {
          studiesSubmitted: 0,
          interestsReceived: 0,
          meetingsScheduled: 0,
        };
      }
      activity[dateStr].studiesSubmitted++;
    }
  });

  // Count interests
  interests.forEach((interest: any) => {
    if (new Date(interest.createdAt) >= cutoffDate) {
      const dateStr = new Date(interest.createdAt).toISOString().split('T')[0];
      if (!activity[dateStr]) {
        activity[dateStr] = {
          studiesSubmitted: 0,
          interestsReceived: 0,
          meetingsScheduled: 0,
        };
      }
      activity[dateStr].interestsReceived++;
    }
  });

  // Count meetings
  meetings.forEach((meeting: any) => {
    if (new Date(meeting.createdAt) >= cutoffDate) {
      const dateStr = new Date(meeting.createdAt).toISOString().split('T')[0];
      if (!activity[dateStr]) {
        activity[dateStr] = {
          studiesSubmitted: 0,
          interestsReceived: 0,
          meetingsScheduled: 0,
        };
      }
      if (meeting.status === 'scheduled') {
        activity[dateStr].meetingsScheduled++;
      }
    }
  });

  // Convert to array and sort
  return Object.entries(activity)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ============================================================================
// Get Researcher Stats
// ============================================================================

export async function getResearcherStats(researcherId: string): Promise<{
  totalStudies: number;
  submittedStudies: number;
  approvedStudies: number;
  publishedStudies: number;
  interestsReceived: number;
  meetingsScheduled: number;
}> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/analytics/researcher/:id

  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');

  const researcherStudies = studies.filter(
    (s: Study) => s.researcherId === researcherId
  );

  const totalStudies = researcherStudies.length;
  const submittedStudies = researcherStudies.filter(
    (s: Study) => s.status !== 'draft'
  ).length;
  const approvedStudies = researcherStudies.filter(
    (s: Study) => s.status === 'approved'
  ).length;
  const publishedStudies = researcherStudies.filter(
    (s: Study) => s.status === 'published'
  ).length;

  const studyIds = researcherStudies.map((s: Study) => s.id);
  const interestsReceived = interests.filter((i: any) =>
    studyIds.includes(i.studyId)
  ).length;
  const meetingsScheduled = meetings.filter(
    (m: any) =>
      studyIds.includes(m.studyId) && m.status === 'scheduled'
  ).length;

  return {
    totalStudies,
    submittedStudies,
    approvedStudies,
    publishedStudies,
    interestsReceived,
    meetingsScheduled,
  };
}
