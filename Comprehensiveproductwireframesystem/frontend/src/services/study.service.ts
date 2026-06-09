import { Study, StudyStatus } from '@/types/index';

/**
 * Study Service
 * Handles all study-related operations
 * 
 * This service is designed to be easily swapped with actual API calls
 * in the future. Currently uses mock data and localStorage.
 */

// ============================================================================
// Create Study
// ============================================================================

export async function createStudy(study: Study): Promise<Study> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In future: POST /api/studies
  return study;
}

// ============================================================================
// Update Study
// ============================================================================

export async function updateStudy(study: Study): Promise<Study> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: PUT /api/studies/:id
  return study;
}

// ============================================================================
// Get Study by ID
// ============================================================================

export async function getStudyById(id: string): Promise<Study | null> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/studies/:id
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  return studies.find((s: Study) => s.id === id) || null;
}

// ============================================================================
// Get Researcher Studies
// ============================================================================

export async function getResearcherStudies(
  researcherId: string
): Promise<Study[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/studies?researcherId=:id
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  return studies.filter((s: Study) => s.researcherId === researcherId);
}

// ============================================================================
// Update Study Status
// ============================================================================

export async function updateStudyStatus(
  id: string,
  status: StudyStatus
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: PATCH /api/studies/:id/status
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const index = studies.findIndex((s: Study) => s.id === id);
  if (index !== -1) {
    studies[index].status = status;
    studies[index].updatedAt = new Date();
    localStorage.setItem('app_studies', JSON.stringify(studies));
  }
}

// ============================================================================
// Publish Study (Admin)
// ============================================================================

export async function publishStudy(
  id: string,
  adminId: string
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/studies/:id/publish
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const index = studies.findIndex((s: Study) => s.id === id);
  if (index !== -1) {
    studies[index].status = 'published';
    studies[index].approvedBy = adminId;
    studies[index].approvedAt = new Date();
    studies[index].publishedAt = new Date();
    studies[index].updatedAt = new Date();
    localStorage.setItem('app_studies', JSON.stringify(studies));
  }
}

// ============================================================================
// Approve Study (Admin)
// ============================================================================

export async function approveStudy(
  id: string,
  adminId: string
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/studies/:id/approve
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const index = studies.findIndex((s: Study) => s.id === id);
  if (index !== -1) {
    studies[index].status = 'approved';
    studies[index].approvedBy = adminId;
    studies[index].approvedAt = new Date();
    studies[index].updatedAt = new Date();
    localStorage.setItem('app_studies', JSON.stringify(studies));
  }
}

// ============================================================================
// Reject Study (Admin)
// ============================================================================

export async function rejectStudy(
  id: string,
  adminId: string,
  reason: string
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/studies/:id/reject
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const index = studies.findIndex((s: Study) => s.id === id);
  if (index !== -1) {
    studies[index].status = 'rejected';
    studies[index].rejectionReason = reason;
    studies[index].updatedAt = new Date();
    localStorage.setItem('app_studies', JSON.stringify(studies));
  }
}

// ============================================================================
// Search Studies
// ============================================================================

export async function searchStudies(
  query: string,
  filters?: { domains?: string[]; statuses?: string[] }
): Promise<Study[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: GET /api/studies/search?q=:query&filters=...
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');

  return studies.filter((s: Study) => {
    // Search query
    const matchesQuery =
      !query ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.abstract.toLowerCase().includes(query.toLowerCase());

    // Domain filter
    const matchesDomain =
      !filters?.domains ||
      filters.domains.length === 0 ||
      filters.domains.includes(s.domain);

    // Status filter
    const matchesStatus =
      !filters?.statuses ||
      filters.statuses.length === 0 ||
      filters.statuses.includes(s.status);

    return matchesQuery && matchesDomain && matchesStatus;
  });
}
