import { LicenseRequest, LicenseStatus, Study, User } from '@/types/index';

export const LICENSE_STATUSES = {
  PENDING: 'pending',
  ADMIN_APPROVED: 'admin_approved',
  RESEARCHER_APPROVAL: 'researcher_approval',
  RESEARCHER_APPROVED: 'researcher_approved',
  AGREEMENT_GENERATED: 'agreement_generated',
  SIGNED_SUBMITTED: 'signed_submitted',
  AGREEMENT_EXECUTED: 'agreement_executed',
  COMMERCIALIZED: 'commercialized',
  REJECTED: 'rejected',
} as const satisfies Record<string, LicenseStatus>;

export const LICENSE_STATUS_ORDER: LicenseStatus[] = [
  LICENSE_STATUSES.PENDING,
  LICENSE_STATUSES.ADMIN_APPROVED,
  LICENSE_STATUSES.RESEARCHER_APPROVAL,
  LICENSE_STATUSES.RESEARCHER_APPROVED,
  LICENSE_STATUSES.AGREEMENT_GENERATED,
  LICENSE_STATUSES.SIGNED_SUBMITTED,
  LICENSE_STATUSES.AGREEMENT_EXECUTED,
  LICENSE_STATUSES.COMMERCIALIZED,
];

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  pending: 'License Requested',
  admin_approved: 'Admin Approved',
  researcher_approval: 'Researcher Review Pending',
  researcher_approved: 'Agreement Generation',
  agreement_generated: 'Agreement Pending Signature',
  signed_submitted: 'Signed Agreement Submitted',
  agreement_executed: 'Agreement Executed',
  commercialized: 'Commercialized',
  rejected: 'Rejected',
};

export const LICENSE_ALLOWED_TRANSITIONS: Record<LicenseStatus, LicenseStatus[]> = {
  pending: ['admin_approved', 'rejected'],
  admin_approved: ['researcher_approval', 'rejected'],
  researcher_approval: ['researcher_approved', 'rejected'],
  researcher_approved: ['agreement_generated', 'rejected'],
  agreement_generated: ['signed_submitted', 'rejected'],
  signed_submitted: ['agreement_executed', 'rejected'],
  agreement_executed: ['commercialized'],
  commercialized: [],
  rejected: [],
};

export function normalizeLicenseStatus(status: string): LicenseStatus {
  if (status === 'requested') return LICENSE_STATUSES.PENDING;
  if (status === 'admin_review') return LICENSE_STATUSES.ADMIN_APPROVED;
  if (status === 'approved') return LICENSE_STATUSES.RESEARCHER_APPROVED;
  if (status === 'signed') return LICENSE_STATUSES.AGREEMENT_EXECUTED;
  if (status in LICENSE_STATUS_LABELS) return status as LicenseStatus;
  return LICENSE_STATUSES.PENDING;
}

export function canTransitionLicense(from: LicenseStatus, to: LicenseStatus): boolean {
  return LICENSE_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextLicenseStatus(status: LicenseStatus): LicenseStatus | undefined {
  return LICENSE_ALLOWED_TRANSITIONS[status]?.find((next) => next !== 'rejected');
}

export function getLicenseStageSummary(status: string) {
  const normalized = normalizeLicenseStatus(status);
  const summaries: Record<LicenseStatus, {
    currentStage: string;
    currentOwner: 'Industry' | 'Admin' | 'Researcher' | 'Completed';
    pendingAction: string;
    nextStep: string;
    progress?: 'In Progress' | 'Pending' | 'Completed';
  }> = {
    pending: {
      currentStage: 'Admin Review Pending',
      currentOwner: 'Admin',
      pendingAction: 'Approve Request',
      nextStep: 'Researcher Approval',
    },
    admin_approved: {
      currentStage: 'Researcher Review Pending',
      currentOwner: 'Researcher',
      pendingAction: 'Researcher Approval',
      nextStep: 'Agreement Generation',
    },
    researcher_approval: {
      currentStage: 'Researcher Review Pending',
      currentOwner: 'Researcher',
      pendingAction: 'Approve Licensing',
      nextStep: 'Agreement Generation',
      progress: 'In Progress',
    },
    researcher_approved: {
      currentStage: 'Agreement Generation',
      currentOwner: 'Admin',
      pendingAction: 'Generate Agreement',
      nextStep: 'Industry Signature',
    },
    agreement_generated: {
      currentStage: 'Agreement Pending Signature',
      currentOwner: 'Industry',
      pendingAction: 'Upload Signed Agreement',
      nextStep: 'Admin Verification',
      progress: 'In Progress',
    },
    signed_submitted: {
      currentStage: 'Signed Agreement Submitted',
      currentOwner: 'Admin',
      pendingAction: 'Approve Signed Agreement',
      nextStep: 'Commercialization',
    },
    agreement_executed: {
      currentStage: 'Commercialization',
      currentOwner: 'Admin',
      pendingAction: 'Commercialize Technology',
      nextStep: 'Licensing Completed',
      progress: 'Pending',
    },
    commercialized: {
      currentStage: 'Commercialized',
      currentOwner: 'Completed',
      pendingAction: 'None',
      nextStep: 'Completed',
      progress: 'Completed',
    },
    rejected: {
      currentStage: 'Rejected',
      currentOwner: 'Completed',
      pendingAction: 'None',
      nextStep: 'Closed',
    },
  };
  return summaries[normalized];
}

export function buildMockAgreement(
  request: LicenseRequest,
  study?: Study,
  industry?: User
): string {
  const licenseFee = request.licenseFee || 250000;
  const premium = Math.round(licenseFee * 0.2);
  const title = study?.title || request.studyId;
  const researcher = study?.researcherName || 'Researcher/Inventor';
  const licensee = industry?.organization || industry?.name || request.industryUserId;
  const effectiveDate = new Date().toLocaleDateString();
  const expirationDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return `TRIPARTITE TECHNOLOGY LICENSING AGREEMENT

This mock agreement records a formal tripartite licensing agreement among NRDC, ${researcher}, and ${licensee}.

1. Technology Details
Technology: ${title}
Domain: ${study?.domain || 'Commercial technology domain'}
TRL: ${study?.trl ? `TRL ${study.trl}` : 'Validated prototype stage'}
Summary: ${study?.abstract || 'Technology summary to be appended from the reviewed research record.'}
IP Status: ${study?.ipStatus || 'IP status under NRDC verification'}

2. Licensor Information
NRDC acts as commercialization facilitator and licensor coordinator for the technology. The researcher/inventor is ${researcher}, representing the originating research institution.

3. Licensee Information
Industry Partner: ${licensee}
Contact Person: ${industry?.name || 'Authorized industry contact'}
Email: ${industry?.email || 'contact@example.com'}
Phone: ${industry?.phone || '+1-555-0200'}

4. Terms Negotiation
NRDC negotiates licensing terms with the prospective receiver including premium, royalty rates, exclusivity rights and commercialization conditions.

5. Royalty Structure
Running royalty is proposed at 4.5% of net sales from products or services using the licensed technology, payable quarterly with audited annual statements.

6. Premium Amount
One-time upfront premium: $${premium.toLocaleString()}
Total indicative license value: $${licenseFee.toLocaleString()}

7. Exclusivity Rights
The license is ${licenseFee > 300000 ? 'exclusive for the agreed application field' : 'non-exclusive with field-of-use restrictions'}. Exclusivity remains conditional on milestone achievement and reporting compliance.

8. Commercialization Rights
The industry partner may develop, manufacture, market, and sell commercial offerings based on the technology within the approved territory and application field.

9. Duration
The agreement remains valid for five years from ${effectiveDate} to ${expirationDate}, with renewal subject to NRDC and inventor review.

10. Termination Clauses
NRDC may terminate for non-payment, breach of confidentiality, non-commercialization, unauthorized sublicensing, or material misuse of intellectual property. Either party may request cure within 30 days of written notice.

11. Signatures
For NRDC: __________________________
For Researcher/Inventor: __________________________
For Industry Partner: __________________________

Generated on ${effectiveDate} for frontend POC review.`;
}

export function buildLicenseTransition(
  request: LicenseRequest,
  nextStatus: LicenseStatus
): LicenseRequest {
  const currentStatus = normalizeLicenseStatus(request.status);

  if (!canTransitionLicense(currentStatus, nextStatus)) {
    throw new Error(`Invalid license transition: ${currentStatus} -> ${nextStatus}`);
  }

  const now = new Date();
  return {
    ...request,
    status: nextStatus,
    reviewedAt: nextStatus === 'admin_approved' ? now : request.reviewedAt,
    researcherApprovedAt:
      nextStatus === 'researcher_approved' ? now : request.researcherApprovedAt,
    approvedAt: nextStatus === 'researcher_approved' ? now : request.approvedAt,
    agreementGeneratedAt:
      nextStatus === 'agreement_generated' ? now : request.agreementGeneratedAt,
    signedAgreementSubmittedAt:
      nextStatus === 'signed_submitted' ? now : request.signedAgreementSubmittedAt,
    agreementExecutedAt:
      nextStatus === 'agreement_executed' ? now : request.agreementExecutedAt,
    commercializedAt:
      nextStatus === 'commercialized' ? now : request.commercializedAt,
    updatedAt: now,
  };
}

export function getLicenseBadgeStatus(status: string) {
  const normalized = normalizeLicenseStatus(status);
  if (normalized === 'rejected') return 'cancelled' as const;
  if (normalized === 'commercialized') return 'commercialized' as const;
  if (normalized === 'agreement_executed') return 'signed' as const;
  if (normalized === 'signed_submitted') return 'signed-submitted' as const;
  if (normalized === 'agreement_generated') return 'agreement-generated' as const;
  if (normalized === 'researcher_approved') return 'approved' as const;
  if (normalized === 'researcher_approval') return 'researcher-approval' as const;
  if (normalized === 'admin_approved') return 'admin-approved' as const;
  return 'pending' as const;
}
