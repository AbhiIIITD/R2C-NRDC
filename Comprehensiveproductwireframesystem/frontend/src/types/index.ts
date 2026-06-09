// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'researcher' | 'industry' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization?: string;
  isListedCompany?: boolean;
  verificationStatus?: 'verified' | 'pending' | 'additional_verification';
  phone?: string;
  createdAt: Date;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Study & Research Types
// ============================================================================

export type StudyStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'published'
  | 'interested'
  | 'meeting_scheduled'
  | 'license_requested'
  | 'licensed'
  | 'commercialized'
  | 'rejected';

export type TRLLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ResearchDomain = 
  | 'Artificial Intelligence'
  | 'Renewable Energy'
  | 'Healthcare'
  | 'Biotechnology'
  | 'Agriculture'
  | 'Manufacturing'
  | 'Robotics'
  | 'Materials Science'
  | 'Sustainability'
  | 'Electronics'
  | 'Agro & Food Tech'
  | 'Healthcare & Pharma'
  | 'Chemicals & Life Sciences'
  | 'Engineering & Eco Materials'
  | 'Aerospace & Deep Tech'
  | 'CleanTech & Energy'
  | 'IoT & Electronics';

export interface Study {
  id: string;
  title: string;
  abstract: string;
  domain: ResearchDomain;
  status: StudyStatus;
  trl: TRLLevel;
  createdAt: Date;
  updatedAt: Date;
  researcherId: string;
  researcherName: string;
  pdfUrl?: string;
  keywords?: string[];
  commercialPotential?: string;
  marketSize?: string;
  competitors?: string;
  ipStatus?: string;
  readinessScore?: number;
  approvedBy?: string;
  approvedAt?: Date;
  publishedAt?: Date;
  rejectionReason?: string;
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  author: string;
  comment: string;
  createdAt: Date;
  type: 'comment' | 'request_change' | 'approval' | 'rejection';
}

export interface StudyReview {
  id: string;
  studyId: string;
  assignedTo: string;
  status: 'pending' | 'in_review' | 'completed';
  comments: ReviewComment[];
  decision?: 'approved' | 'rejected' | 'request_changes';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Interest & Engagement Types
// ============================================================================

export type InterestStatus =
  | 'interested'
  | 'meeting_scheduled'
  | 'discussion_approved'
  | 'license_requested'
  | 'licensed';

export interface Interest {
  id: string;
  studyId: string;
  industryUserId: string;
  industryName: string;
  status: InterestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type MeetingStatus = 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  interestId: string;
  studyId: string;
  researcherId: string;
  industryUserId: string;
  status: MeetingStatus;
  proposedDate?: Date;
  scheduledDate?: Date;
  meetingLink?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LicenseStatus =
  | 'pending'
  | 'admin_approved'
  | 'researcher_approval'
  | 'researcher_approved'
  | 'agreement_generated'
  | 'signed_submitted'
  | 'agreement_executed'
  | 'commercialized'
  | 'rejected';

export interface LicenseRequest {
  id: string;
  studyId: string;
  industryUserId: string;
  status: LicenseStatus;
  requestedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  researcherApprovedAt?: Date;
  agreementGeneratedAt?: Date;
  signedAgreementSubmittedAt?: Date;
  agreementExecutedAt?: Date;
  commercializedAt?: Date;
  agreementTerms?: string;
  signedAgreementFileName?: string;
  signedAgreementContent?: string;
  licenseFee?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Smart Match & Marketplace Types
// ============================================================================

export interface SmartMatchRecommendation {
  id: string;
  studyId: string;
  matchPercentage: number;
  reasoning: string;
  recommendedIndustries: string[];
  potentialApplications: string[];
  marketSize: string;
}

export interface MarketplaceFilters {
  search?: string;
  domains?: ResearchDomain[];
  statuses?: StudyStatus[];
  minReadinessScore?: number;
  maxReadinessScore?: number;
  trlLevels?: TRLLevel[];
  sortBy?: 'relevance' | 'recent' | 'readiness' | 'interest';
}

export type ProblemUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface ProblemStatement {
  id: string;
  industryUserId: string;
  industryName: string;
  title: string;
  industrySector: string;
  problemDescription: string;
  currentChallenges: string;
  expectedSolution: string;
  budgetRange: string;
  urgency: ProblemUrgency;
  contactPerson: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Chat & Copilot Types
// ============================================================================

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
  contextStudyId?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  contextStudyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CopilotSuggestedPrompt {
  id: string;
  text: string;
  category: 'commercial' | 'technical' | 'market' | 'licensing' | 'trl';
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 
  | 'study_submitted'
  | 'study_approved'
  | 'study_published'
  | 'study_rejected'
  | 'interest_received'
  | 'meeting_requested'
  | 'meeting_scheduled'
  | 'meeting_approved'
  | 'license_requested'
  | 'license_approved'
  | 'researcher_license_approved'
  | 'agreement_generated'
  | 'signed_agreement_uploaded'
  | 'commercialization_completed'
  | 'review_assigned'
  | 'comment_added';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  read: boolean;
  createdAt: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsMetrics {
  totalStudies: number;
  approvedStudies: number;
  publishedStudies: number;
  industryInterests: number;
  meetingsScheduled: number;
  licensesRequested: number;
  licensesSigned: number;
}

export interface CommercializationFunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
