// Mock data generator and sample data for development
import {
  User,
  Study,
  Interest,
  Meeting,
  LicenseRequest,
  ChatSession,
  Notification,
  ProblemStatement,
  SmartMatchRecommendation,
  ResearchDomain,
  TRLLevel,
  StudyStatus,
} from '@/types/index';

// ============================================================================
// Mock Users
// ============================================================================

export const MOCK_USERS: Record<string, User> = {
  researcher1: {
    id: 'researcher1',
    email: 'dr.smith@university.edu',
    name: 'Dr. Sarah Smith',
    role: 'researcher',
    organization: 'MIT',
    phone: '+1-555-0101',
    createdAt: new Date('2024-01-15'),
    avatar: '👩‍🔬',
  },
  researcher2: {
    id: 'researcher2',
    email: 'prof.johnson@stanford.edu',
    name: 'Prof. John Johnson',
    role: 'researcher',
    organization: 'Stanford University',
    phone: '+1-555-0102',
    createdAt: new Date('2024-02-10'),
    avatar: '👨‍🔬',
  },
  industry1: {
    id: 'industry1',
    email: 'mark.wilson@pharmatech.com',
    name: 'Mark Wilson',
    role: 'industry',
    organization: 'PharmaTech Inc',
    isListedCompany: true,
    verificationStatus: 'verified',
    phone: '+1-555-0201',
    createdAt: new Date('2024-01-20'),
    avatar: '👨‍💼',
  },
  industry2: {
    id: 'industry2',
    email: 'lisa.chen@cleantech.com',
    name: 'Lisa Chen',
    role: 'industry',
    organization: 'CleanTech Solutions',
    isListedCompany: false,
    verificationStatus: 'additional_verification',
    phone: '+1-555-0202',
    createdAt: new Date('2024-02-05'),
    avatar: '👩‍💼',
  },
  admin1: {
    id: 'admin1',
    email: 'admin@nrdc.org',
    name: 'Admin User',
    role: 'admin',
    organization: 'NRDC',
    createdAt: new Date('2023-12-01'),
    avatar: '🔧',
  },
};

// ============================================================================
// Mock Studies
// ============================================================================

export const MOCK_STUDIES: Study[] = [
  {
    id: 'study1',
    title: 'Advanced Biodegradable Polymer Development',
    abstract:
      'Novel approach to creating fully biodegradable polymers using algae-derived compounds. This research demonstrates a 95% degradation rate within 6 months.',
    domain: 'Engineering & Eco Materials',
    status: 'published',
    trl: 6,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-03-15'),
    researcherId: 'researcher1',
    researcherName: 'Dr. Sarah Smith',
    keywords: [
      'biodegradable',
      'polymer',
      'sustainability',
      'algae',
      'materials',
    ],
    commercialPotential: 'High - Packaging industry interest',
    marketSize: '$250B by 2030',
    competitors: 'BASF BioFlex, Evonik Ecoflex',
    ipStatus: 'Patent pending',
    readinessScore: 78,
    approvedBy: 'admin1',
    approvedAt: new Date('2024-03-10'),
    publishedAt: new Date('2024-03-15'),
  },
  {
    id: 'study2',
    title: 'AI-Powered Diagnostic Imaging System',
    abstract:
      'Deep learning model for early cancer detection from medical imaging. Achieves 94% accuracy on standard datasets.',
    domain: 'Healthcare & Pharma',
    status: 'published',
    trl: 7,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-04-01'),
    researcherId: 'researcher2',
    researcherName: 'Prof. John Johnson',
    keywords: ['AI', 'medical imaging', 'cancer detection', 'diagnostics'],
    commercialPotential: 'Very High - FDA approval pending',
    marketSize: '$50B in diagnostic market',
    competitors: 'IBM Watson, Google DeepMind',
    ipStatus: 'Patent issued',
    readinessScore: 85,
    approvedBy: 'admin1',
    approvedAt: new Date('2024-03-28'),
    publishedAt: new Date('2024-04-01'),
  },
  {
    id: 'study3',
    title: 'Precision Agriculture IoT Platform',
    abstract:
      'Real-time crop monitoring system using IoT sensors and machine learning for optimal yield prediction.',
    domain: 'Agro & Food Tech',
    status: 'published',
    trl: 5,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-30'),
    researcherId: 'researcher1',
    researcherName: 'Dr. Sarah Smith',
    keywords: ['IoT', 'agriculture', 'machine learning', 'sensors'],
    commercialPotential: 'Medium-High - Agritech integration opportunity',
    marketSize: '$15B by 2028',
    competitors: 'John Deere Connected Farm, Climate FieldView',
    ipStatus: 'Provisional patent filed',
    readinessScore: 72,
    approvedBy: 'admin1',
    approvedAt: new Date('2024-03-25'),
    publishedAt: new Date('2024-03-30'),
  },
  {
    id: 'study4',
    title: 'Renewable Energy Storage Solution',
    abstract:
      'Novel lithium-free battery technology using sodium-ion cells with superior thermal stability.',
    domain: 'CleanTech & Energy',
    status: 'submitted',
    trl: 4,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
    researcherId: 'researcher2',
    researcherName: 'Prof. John Johnson',
    keywords: ['battery', 'energy storage', 'renewable', 'sodium-ion'],
    commercialPotential: 'Very High - Strategic applications',
    marketSize: '$100B+ global opportunity',
    ipStatus: 'Under review',
    readinessScore: 65,
  },
  {
    id: 'study5',
    title: 'Quantum Computing Algorithm Framework',
    abstract:
      'New algorithmic approach for quantum circuit optimization reducing error rates by 40%.',
    domain: 'Aerospace & Deep Tech',
    status: 'under_review',
    trl: 3,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-04-05'),
    researcherId: 'researcher1',
    researcherName: 'Dr. Sarah Smith',
    keywords: ['quantum', 'computing', 'algorithms', 'optimization'],
    commercialPotential: 'High - Strategic tech companies interested',
    marketSize: '$50B+ emerging market',
    ipStatus: 'Patent application pending',
    readinessScore: 58,
  },
  {
    id: 'study6',
    title: 'Sustainable Textile Manufacturing',
    abstract:
      'Eco-friendly fabric production method using plant-based dyes and reduced water consumption.',
    domain: 'Engineering & Eco Materials',
    status: 'draft',
    trl: 2,
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-15'),
    researcherId: 'researcher2',
    researcherName: 'Prof. John Johnson',
    keywords: ['textiles', 'sustainability', 'eco-friendly', 'manufacturing'],
    readinessScore: 45,
  },
];

// ============================================================================
// Mock Interests
// ============================================================================

export const MOCK_INTERESTS: Interest[] = [
  {
    id: 'interest1',
    studyId: 'study1',
    industryUserId: 'industry1',
    industryName: 'PharmaTech Inc',
    status: 'interested',
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: 'interest2',
    studyId: 'study1',
    industryUserId: 'industry2',
    industryName: 'CleanTech Solutions',
    status: 'meeting_scheduled',
    createdAt: new Date('2024-03-18'),
    updatedAt: new Date('2024-03-25'),
  },
  {
    id: 'interest3',
    studyId: 'study2',
    industryUserId: 'industry1',
    industryName: 'PharmaTech Inc',
    status: 'license_requested',
    createdAt: new Date('2024-03-25'),
    updatedAt: new Date('2024-04-01'),
  },
  {
    id: 'interest4',
    studyId: 'study3',
    industryUserId: 'industry2',
    industryName: 'CleanTech Solutions',
    status: 'interested',
    createdAt: new Date('2024-04-02'),
    updatedAt: new Date('2024-04-02'),
  },
];

// ============================================================================
// Mock Meetings
// ============================================================================

export const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'meeting1',
    interestId: 'interest2',
    studyId: 'study1',
    researcherId: 'researcher1',
    industryUserId: 'industry2',
    status: 'scheduled',
    proposedDate: new Date('2024-04-20'),
    scheduledDate: new Date('2024-04-20T14:00:00'),
    meetingLink: 'https://meet.example.com/study1-industry2',
    notes: 'Discussion on packaging applications and market strategy',
    createdAt: new Date('2024-03-25'),
    updatedAt: new Date('2024-04-05'),
  },
  {
    id: 'meeting2',
    interestId: 'interest3',
    studyId: 'study2',
    researcherId: 'researcher2',
    industryUserId: 'industry1',
    status: 'pending',
    proposedDate: new Date('2024-04-25'),
    notes: 'Initial discussion on AI diagnostic system integration',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
];

// ============================================================================
// Mock License Requests
// ============================================================================

export const MOCK_LICENSE_REQUESTS: LicenseRequest[] = [
  {
    id: 'license1',
    studyId: 'study2',
    industryUserId: 'industry1',
    status: 'pending',
    requestedAt: new Date('2024-04-01'),
    licenseFee: 500000,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-08'),
  },
  {
    id: 'license2',
    studyId: 'study1',
    industryUserId: 'industry2',
    status: 'agreement_generated',
    requestedAt: new Date('2024-03-28'),
    approvedAt: new Date('2024-04-10'),
    agreementGeneratedAt: new Date('2024-04-11'),
    agreementTerms: 'TRIPARTITE TECHNOLOGY LICENSING AGREEMENT\n\nA formal tripartite licensing agreement among NRDC, Researcher/Inventor, and Industry Partner.\n\nTerms Negotiation: NRDC negotiates licensing terms with the prospective receiver including premium, royalty rates, exclusivity rights and commercialization conditions.\n\nSignatures: NRDC __________________ Researcher/Inventor __________________ Industry Partner __________________',
    licenseFee: 250000,
    createdAt: new Date('2024-03-28'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'license3',
    studyId: 'study3',
    industryUserId: 'industry2',
    status: 'signed_submitted',
    requestedAt: new Date('2024-04-08'),
    approvedAt: new Date('2024-04-15'),
    researcherApprovedAt: new Date('2024-04-16'),
    agreementGeneratedAt: new Date('2024-04-17'),
    signedAgreementSubmittedAt: new Date('2024-04-19'),
    agreementTerms: 'TRIPARTITE TECHNOLOGY LICENSING AGREEMENT\n\nAgreement generated for Precision Agriculture IoT Platform among NRDC, Researcher/Inventor, and CleanTech Solutions.',
    signedAgreementFileName: 'precision-agriculture-signed-agreement.txt',
    signedAgreementContent: 'SIGNED TRIPARTITE TECHNOLOGY LICENSING AGREEMENT\n\nTechnology: Precision Agriculture IoT Platform\nIndustry Partner: CleanTech Solutions\nStatus: Signed by Industry Partner\n\nAdmin verification required before Agreement Executed status.',
    licenseFee: 180000,
    createdAt: new Date('2024-04-08'),
    updatedAt: new Date('2024-04-19'),
  },
];

// ============================================================================
// Mock Industry Problem Statements
// ============================================================================

export const MOCK_PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: 'problem1',
    industryUserId: 'industry1',
    industryName: 'PharmaTech Inc',
    title: 'Need AI-supported early cancer diagnosis',
    industrySector: 'Healthcare & Pharma',
    problemDescription:
      'Our diagnostic division needs technologies that improve early oncology detection from imaging workflows.',
    currentChallenges:
      'Current triage is specialist-heavy, slow for regional hospitals, and inconsistent across modalities.',
    expectedSolution:
      'A validated AI model or decision-support platform that integrates with existing imaging systems.',
    budgetRange: '$1M - $5M',
    urgency: 'high',
    contactPerson: 'Mark Wilson',
    keywords: ['AI', 'diagnostics', 'cancer', 'medical imaging', 'oncology'],
    createdAt: new Date('2024-04-12'),
    updatedAt: new Date('2024-04-12'),
  },
  {
    id: 'problem2',
    industryUserId: 'industry2',
    industryName: 'CleanTech Solutions',
    title: 'Need biodegradable packaging alternatives',
    industrySector: 'Engineering & Eco Materials',
    problemDescription:
      'We need commercially feasible packaging materials that can replace petroleum-derived films.',
    currentChallenges:
      'Existing biodegradable materials fail durability, shelf-life, or cost requirements at scale.',
    expectedSolution:
      'A polymer, coating, or manufacturing process with credible degradation and performance data.',
    budgetRange: '$500K - $2M',
    urgency: 'medium',
    contactPerson: 'Lisa Chen',
    keywords: ['biodegradable', 'packaging', 'polymer', 'materials', 'sustainability'],
    createdAt: new Date('2024-04-14'),
    updatedAt: new Date('2024-04-14'),
  },
];

// ============================================================================
// Mock Smart Match Recommendations
// ============================================================================

export const MOCK_RECOMMENDATIONS: SmartMatchRecommendation[] = [
  {
    id: 'rec1',
    studyId: 'study1',
    matchPercentage: 92,
    reasoning:
      'Strong alignment with sustainable packaging solutions. Your recent investments in eco-materials align perfectly.',
    recommendedIndustries: [
      'Packaging',
      'Consumer Goods',
      'Food & Beverage',
    ],
    potentialApplications: [
      'Biodegradable shopping bags',
      'Compostable food containers',
      'Protective packaging for electronics',
    ],
    marketSize: '$250B opportunity',
  },
  {
    id: 'rec2',
    studyId: 'study2',
    matchPercentage: 87,
    reasoning:
      'Diagnostic imaging aligns with your healthcare portfolio expansion strategy.',
    recommendedIndustries: [
      'Healthcare',
      'Medical Devices',
      'Pharmaceuticals',
    ],
    potentialApplications: [
      'Hospital imaging systems',
      'Diagnostic centers',
      'Telehealth platforms',
    ],
    marketSize: '$50B market opportunity',
  },
  {
    id: 'rec3',
    studyId: 'study3',
    matchPercentage: 78,
    reasoning:
      'IoT agriculture platform offers cross-industry applications including supply chain optimization.',
    recommendedIndustries: [
      'Agriculture',
      'Food Tech',
      'Supply Chain',
    ],
    potentialApplications: [
      'Precision farming',
      'Crop yield optimization',
      'Supply chain visibility',
    ],
    marketSize: '$15B agricultural IoT market',
  },
];

// ============================================================================
// Mock Chat Sessions
// ============================================================================

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'chat1',
    userId: 'industry1',
    title: 'AI Diagnostic System Licensing',
    messages: [
      {
        id: 'msg1',
        role: 'user',
        content:
          'What are the commercial applications for the AI diagnostic imaging system?',
        createdAt: new Date('2024-04-05'),
      },
      {
        id: 'msg2',
        role: 'assistant',
        content: `The AI diagnostic imaging system has multiple commercial pathways:

1. **Hospital Integration** - Direct licensing to healthcare systems for diagnostic centers
2. **Medical Device OEMs** - Integration into existing medical imaging equipment
3. **Telehealth Platforms** - Remote diagnostic support services
4. **Research Institutions** - Commercial research applications

The estimated market opportunity is $50B+ with a 5-7 year commercialization timeline. Based on comparable diagnostic AI systems, licensing fees typically range from $250K-$2M annually depending on deployment scope.

Would you like more details on any specific application pathway?`,
        createdAt: new Date('2024-04-05'),
      },
      {
        id: 'msg3',
        role: 'user',
        content:
          'What about regulatory requirements for FDA approval?',
        createdAt: new Date('2024-04-05'),
      },
      {
        id: 'msg4',
        role: 'assistant',
        content: `For FDA approval of the diagnostic AI system:

**Current Status**: Patent issued, Technology Readiness Level 7

**FDA Pathway**: 510(k) - Substantially Equivalent Classification

**Timeline**: 6-12 months for FDA review

**Requirements**:
- Clinical validation data (already available)
- Software documentation
- Cybersecurity assessment
- Clinical workflow integration studies

**Key Considerations**:
- The research shows 94% accuracy - exceeds FDA benchmarks
- Comparable systems (IBM Watson, Butterfly Network AI) took 8-10 months
- Budget allocation: $200K-$400K for FDA submission

The team recommends starting the FDA process immediately given the technology maturity. Would you like information on potential FDA consultants or comparable approval timelines?`,
        createdAt: new Date('2024-04-05'),
      },
    ],
    contextStudyId: 'study2',
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-04-05'),
  },
];

// ============================================================================
// Mock Notifications
// ============================================================================

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif1',
    userId: 'researcher1',
    type: 'study_approved',
    title: 'Study Approved',
    message:
      'Your study "Advanced Biodegradable Polymer Development" has been approved!',
    relatedId: 'study1',
    read: true,
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'notif2',
    userId: 'researcher1',
    type: 'interest_received',
    title: 'New Industry Interest',
    message:
      'CleanTech Solutions has expressed interest in your biodegradable polymer study.',
    relatedId: 'study1',
    read: false,
    createdAt: new Date('2024-03-18'),
  },
  {
    id: 'notif3',
    userId: 'researcher1',
    type: 'meeting_scheduled',
    title: 'Meeting Scheduled',
    message:
      'Meeting scheduled with CleanTech Solutions on April 20 at 2:00 PM',
    relatedId: 'meeting1',
    read: false,
    createdAt: new Date('2024-04-05'),
  },
  {
    id: 'notif4',
    userId: 'industry1',
    type: 'study_submitted',
    title: 'New Study Available',
    message: 'Prof. Johnson has submitted a new study: "Renewable Energy Storage Solution"',
    relatedId: 'study4',
    read: false,
    createdAt: new Date('2024-04-10'),
  },
];

// ============================================================================
// Suggested Prompts for Copilot
// ============================================================================

export const SUGGESTED_PROMPTS = [
  {
    id: 'prompt1',
    text: 'What are the commercial applications for this technology?',
    category: 'commercial' as const,
  },
  {
    id: 'prompt2',
    text: 'What is the market size and growth potential?',
    category: 'market' as const,
  },
  {
    id: 'prompt3',
    text: 'What are the key technical challenges and solutions?',
    category: 'technical' as const,
  },
  {
    id: 'prompt4',
    text: 'What is the licensing strategy recommendation?',
    category: 'licensing' as const,
  },
  {
    id: 'prompt5',
    text: 'How is the Technology Readiness Level assessed?',
    category: 'trl' as const,
  },
  {
    id: 'prompt6',
    text: 'Who are the potential industry partners?',
    category: 'market' as const,
  },
];

// ============================================================================
// Domains and Constants
// ============================================================================

export const RESEARCH_DOMAINS: ResearchDomain[] = [
  'Agro & Food Tech',
  'Healthcare & Pharma',
  'Chemicals',
  'Engineering & Eco Materials',
  'Aerospace & Deep Tech',
  'CleanTech & Energy',
  'IoT & Electronics',
];

export const TRL_LEVELS: TRLLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const STUDY_STATUSES: StudyStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'published',
  'rejected',
];
