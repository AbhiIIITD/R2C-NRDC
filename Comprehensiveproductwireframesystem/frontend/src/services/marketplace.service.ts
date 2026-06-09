import { Interest, InterestStatus } from '@/types/index';

/**
 * Marketplace Service
 * Handles marketplace operations and industry interests
 */

// ============================================================================
// Express Interest
// ============================================================================

export async function expressInterest(
  studyId: string,
  industryUserId: string,
  industryName: string
): Promise<Interest> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/marketplace/:studyId/express-interest

  const interest: Interest = {
    id: `interest_${Date.now()}`,
    studyId,
    industryUserId,
    industryName,
    status: 'interested',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in localStorage
  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  interests.push(interest);
  localStorage.setItem('app_interests', JSON.stringify(interests));

  return interest;
}

// ============================================================================
// Update Interest Status
// ============================================================================

export async function updateInterestStatus(
  interestId: string,
  status: InterestStatus
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: PATCH /api/interests/:id/status

  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  const index = interests.findIndex((i: Interest) => i.id === interestId);
  if (index !== -1) {
    interests[index].status = status;
    interests[index].updatedAt = new Date();
    localStorage.setItem('app_interests', JSON.stringify(interests));
  }
}

// ============================================================================
// Get Study Interests
// ============================================================================

export async function getStudyInterests(studyId: string): Promise<Interest[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/studies/:id/interests

  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  return interests.filter((i: Interest) => i.studyId === studyId);
}

// ============================================================================
// Get Industry User Interests
// ============================================================================

export async function getIndustryUserInterests(
  industryUserId: string
): Promise<Interest[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/industry-users/:id/interests

  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  return interests.filter((i: Interest) => i.industryUserId === industryUserId);
}

// ============================================================================
// Check if Interest Exists
// ============================================================================

export async function hasInterest(
  studyId: string,
  industryUserId: string
): Promise<boolean> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: GET /api/interests/check?studyId=:id&industryUserId=:id

  const interests = JSON.parse(localStorage.getItem('app_interests') || '[]');
  return interests.some(
    (i: Interest) =>
      i.studyId === studyId && i.industryUserId === industryUserId
  );
}

// ============================================================================
// Get Readiness Score for Study
// ============================================================================

export async function calculateReadinessScore(studyId: string): Promise<number> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/studies/:id/readiness-score

  // Get the study
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const study = studies.find((s: any) => s.id === studyId);

  if (!study) {
    return 0;
  }

  return study.readinessScore || 50;
}
