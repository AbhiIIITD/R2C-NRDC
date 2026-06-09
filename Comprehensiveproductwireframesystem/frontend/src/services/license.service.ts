import { LicenseRequest, LicenseStatus } from '@/types/index';
import {
  buildLicenseTransition,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';

/**
 * License Service
 * Handles licensing requests and management
 */

// ============================================================================
// Request License
// ============================================================================

export async function requestLicense(
  studyId: string,
  industryUserId: string,
  licenseFee?: number
): Promise<LicenseRequest> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/licenses/request

  const licenseRequest: LicenseRequest = {
    id: `license_${Date.now()}`,
    studyId,
    industryUserId,
    status: 'pending',
    requestedAt: new Date(),
    licenseFee,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in localStorage
  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  licenseRequests.push(licenseRequest);
  localStorage.setItem('app_license_requests', JSON.stringify(licenseRequests));

  return licenseRequest;
}

// ============================================================================
// Update License Status
// ============================================================================

export async function updateLicenseStatus(
  licenseId: string,
  status: LicenseStatus
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: PATCH /api/licenses/:id/status

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  const index = licenseRequests.findIndex(
    (l: LicenseRequest) => l.id === licenseId
  );
  if (index !== -1) {
    const request = {
      ...licenseRequests[index],
      status: normalizeLicenseStatus(licenseRequests[index].status),
    };
    licenseRequests[index] =
      request.status === status ? { ...request, updatedAt: new Date() } : buildLicenseTransition(request, status);
    localStorage.setItem('app_license_requests', JSON.stringify(licenseRequests));
  }
}

// ============================================================================
// Approve License
// ============================================================================

export async function approveLicense(
  licenseId: string,
  agreementTerms?: string
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/licenses/:id/approve

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  const index = licenseRequests.findIndex(
    (l: LicenseRequest) => l.id === licenseId
  );
  if (index !== -1) {
    const normalized = {
      ...licenseRequests[index],
      status: normalizeLicenseStatus(licenseRequests[index].status),
    };
    const next =
      normalized.status === 'pending'
        ? buildLicenseTransition(normalized, 'admin_approved')
        : normalized;
    const researcherReview =
      next.status === 'admin_approved'
        ? buildLicenseTransition(next, 'researcher_approval')
        : next;
    licenseRequests[index] =
      researcherReview.status === 'researcher_approval'
        ? buildLicenseTransition(researcherReview, 'researcher_approved')
        : researcherReview;
    if (agreementTerms) {
      licenseRequests[index].agreementTerms = agreementTerms;
    }
    licenseRequests[index].updatedAt = new Date();
    localStorage.setItem('app_license_requests', JSON.stringify(licenseRequests));
  }
}

// ============================================================================
// Reject License
// ============================================================================

export async function rejectLicense(licenseId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: POST /api/licenses/:id/reject

  await updateLicenseStatus(licenseId, 'rejected');
}

// ============================================================================
// Sign License Agreement
// ============================================================================

export async function signLicenseAgreement(licenseId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/licenses/:id/sign

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  const index = licenseRequests.findIndex(
    (l: LicenseRequest) => l.id === licenseId
  );
  if (index !== -1) {
    licenseRequests[index] = buildLicenseTransition(
      { ...licenseRequests[index], status: normalizeLicenseStatus(licenseRequests[index].status) },
      'agreement_executed'
    );
    localStorage.setItem('app_license_requests', JSON.stringify(licenseRequests));
  }
}

// ============================================================================
// Get License Requests for Study
// ============================================================================

export async function getStudyLicenseRequests(
  studyId: string
): Promise<LicenseRequest[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/licenses?studyId=:id

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  return licenseRequests.filter((l: LicenseRequest) => l.studyId === studyId);
}

// ============================================================================
// Get License Requests for Industry User
// ============================================================================

export async function getIndustryUserLicenseRequests(
  industryUserId: string
): Promise<LicenseRequest[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/licenses?industryUserId=:id

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  return licenseRequests.filter(
    (l: LicenseRequest) => l.industryUserId === industryUserId
  );
}

// ============================================================================
// Get Pending License Requests
// ============================================================================

export async function getPendingLicenseRequests(): Promise<LicenseRequest[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/licenses?status=pending,admin_approved,researcher_approval

  const licenseRequests = JSON.parse(
    localStorage.getItem('app_license_requests') || '[]'
  );
  return licenseRequests.filter(
    (l: LicenseRequest) =>
      ['pending', 'admin_approved', 'researcher_approval'].includes(normalizeLicenseStatus(l.status))
  );
}

// ============================================================================
// Generate License Agreement
// ============================================================================

export async function generateLicenseAgreement(
  studyId: string,
  industryUserId: string,
  licenseFee: number
): Promise<string> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In future: POST /api/licenses/generate-agreement

  // Get study details
  const studies = JSON.parse(localStorage.getItem('app_studies') || '[]');
  const study = studies.find((s: any) => s.id === studyId);

  if (!study) {
    throw new Error('Study not found');
  }

  // Generate mock agreement
  const agreement = `
TRIPARTITE TECHNOLOGY LICENSING AGREEMENT

Technology: ${study.title}
Study ID: ${studyId}
License Fee: $${licenseFee.toLocaleString()}

TRIPARTITE AGREEMENT:
A formal tripartite licensing agreement among NRDC, Researcher/Inventor, and Industry Partner.

TERMS AND CONDITIONS:
1. NRDC negotiates licensing terms with the prospective receiver including premium, royalty rates, exclusivity rights and commercialization conditions.
2. The licensee is granted negotiated rights to use the technology for commercial purposes.
3. License period: 5 years from the date of signature.
4. License fee: $${licenseFee.toLocaleString()} with premium and royalty schedule.
5. Licensee shall maintain confidentiality of proprietary information.
6. Licensee shall provide quarterly reports on commercialization progress.
7. Either party may terminate with 30 days written notice.
8. Intellectual property rights remain with the research institution.
9. Licensee shall indemnify the research institution against third-party claims.

RESTRICTIONS:
- License is non-transferable without written consent.
- Sublicensing only with prior approval.
- Commercial use limited to ${study.domain} sector.

EFFECTIVE DATE: ${new Date().toLocaleDateString()}
EXPIRATION DATE: ${new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}

This is a legally binding agreement. Both parties agree to the terms and conditions outlined above.
`;

  return agreement;
}
