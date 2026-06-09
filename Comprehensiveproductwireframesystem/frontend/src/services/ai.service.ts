// AI service client — connects the frontend to the backend AI surface:
//   • Copilot   -> POST /copilot/chat            (Server-Sent Events stream, OpenAI)
//   • 6 agents  -> POST /ai/problems/:id/run-pipeline  +  GET /ai/problems/:id/report
//   • Matchmaking -> POST /matchmaking/match     (research papers, cosine similarity)
//
// Every call has a graceful mock fallback so the demo never breaks when the backend
// or the Python AI services (SUTRA :8000 / Matchmaking :8004) are offline.

import { api, setAccessToken, API_URL } from '@/services/api';

// ============================================================================
// Types — mirror the backend report shape (pipeline.service.ts -> getProblemReport)
// ============================================================================

export interface CopilotSource {
  label: string;
  detail: string;
}

export interface ResearchPaperMatch {
  seedRef: string;
  title: string;
  subDomain?: string | null;
  cosine: number; // 0..1
  citationCount?: number | null;
  whyItFits?: string | null;
}

export interface AgentRequirement {
  domain?: string | null;
  subDomain?: string | null;
  problemStatement?: string | null;
  technologyNeeded?: string | null;
  keywords: string[];
  requiredTrl?: number | null;
  deploymentScale?: string | null;
}

export interface AgentFitEvaluation {
  fitLevel: string; // HIGH | MEDIUM | LOW
  score: number;
  strengths: string[];
  risks: string[];
  confidence?: number | null;
}

export interface AgentTechRecommendation {
  id: string;
  name: string;
  matchScore?: number | null;
  matchReasons: string[];
  trl?: number | null;
  patentStatus?: string | null;
  manufacturingReadiness?: string | null;
  fitEvaluation?: AgentFitEvaluation | null;
}

export interface AgentComplianceReport {
  technologyName?: string | null;
  requiredCerts: string[];
  missingCerts: string[];
  approvalStatus?: string | null;
  recommendations: string[];
  regulators: string[];
}

export interface AgentCommercializationReport {
  technologyName?: string | null;
  licenseType?: string | null;
  techTransferTimeline?: string | null;
  marketReadiness?: string | null;
  roadmap: string[];
  quickLicense: boolean;
  patentBuyout: boolean;
}

export interface ProblemReport {
  id: string;
  title: string;
  processingStatus?: string;
  requirement?: AgentRequirement | null;
  paperMatches: ResearchPaperMatch[];
  recommendations: AgentTechRecommendation[];
  complianceReports: AgentComplianceReport[];
  commercializationReports: AgentCommercializationReport[];
  isMock?: boolean;
}

// Raw backend report (relations as returned by getProblemReport). Loosely typed; we flatten it.
interface RawReport {
  id: string;
  title: string;
  processingStatus?: string;
  requirement?: AgentRequirement | null;
  matchResults?: Array<{
    matches?: Array<{
      cosine: number;
      rank: number;
      whyItFits?: string | null;
      paper?: { seedRef: string; title: string; subDomain?: string | null; citationCount?: number | null };
    }>;
  }>;
  recommendations?: Array<AgentTechRecommendation & { fitEvaluation?: AgentFitEvaluation | null }>;
  complianceReports?: AgentComplianceReport[];
  commercializationReports?: AgentCommercializationReport[];
}

export interface MatchmakingMatch {
  seed_ref: string;
  title: string;
  sub_domain?: string | null;
  cosine: number;
  citation_count?: number | null;
}
export interface MatchmakingResult {
  problem: string;
  count: number;
  matches: MatchmakingMatch[];
  explanations?: Array<{ seed_ref: string; why?: string }>;
  isMock?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/** Local-only problem statements use a `problem_<ts>` id; real backend records are UUIDs. */
export function isBackendProblemId(id: string): boolean {
  return !!id && !id.startsWith('problem_');
}

function flattenReport(raw: RawReport): ProblemReport {
  const latest = raw.matchResults?.[0];
  return {
    id: raw.id,
    title: raw.title,
    processingStatus: raw.processingStatus,
    requirement: raw.requirement ?? null,
    paperMatches: (latest?.matches ?? []).map((m) => ({
      seedRef: m.paper?.seedRef ?? '',
      title: m.paper?.title ?? 'Untitled paper',
      subDomain: m.paper?.subDomain,
      cosine: m.cosine,
      citationCount: m.paper?.citationCount,
      whyItFits: m.whyItFits,
    })),
    recommendations: (raw.recommendations ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      matchScore: r.matchScore,
      matchReasons: r.matchReasons ?? [],
      trl: r.trl,
      patentStatus: r.patentStatus,
      manufacturingReadiness: r.manufacturingReadiness,
      fitEvaluation: r.fitEvaluation ?? null,
    })),
    complianceReports: raw.complianceReports ?? [],
    commercializationReports: raw.commercializationReports ?? [],
  };
}

// ============================================================================
// Copilot — live SSE streaming
// ============================================================================

export interface StreamResult {
  sessionId?: string;
  text: string;
  citations: CopilotSource[];
  model?: string;
}

/**
 * Stream an assistant reply token-by-token from the backend copilot (OpenAI SSE).
 * Calls `onToken` for each delta. Rejects on transport/auth/AI failure so the
 * caller can fall back to a canned response.
 */
export async function streamCopilot(
  payload: { message: string; sessionId?: string; problemStatementId?: string; studyId?: string },
  onToken: (delta: string) => void,
): Promise<StreamResult> {
  const doFetch = (token: string | null) => {
    const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_URL}/copilot/chat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  };

  let response = await doFetch(localStorage.getItem('access_token'));

  // One refresh attempt on 401, mirroring services/api.ts.
  if (response.status === 401) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const body = await refreshed.json().catch(() => null);
      const next = body?.data?.accessToken ?? null;
      setAccessToken(next);
      response = await doFetch(next);
    }
  }

  if (!response.ok || !response.body) {
    throw new Error(`Copilot stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const result: StreamResult = { text: '', citations: [] };
  let buffer = '';
  let streamError: string | null = null;

  const handleEvent = (rawEvent: string) => {
    let event = 'message';
    let data = '';
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === 'session') result.sessionId = parsed.sessionId;
    else if (event === 'token' && typeof parsed.delta === 'string') {
      result.text += parsed.delta;
      onToken(parsed.delta);
    } else if (event === 'done') {
      result.citations = parsed.citations ?? [];
      result.model = parsed.model;
    } else if (event === 'error') {
      streamError = parsed.message || 'Copilot failed to respond';
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (rawEvent.trim()) handleEvent(rawEvent);
    }
  }
  if (buffer.trim()) handleEvent(buffer);

  if (streamError) throw new Error(streamError);
  if (!result.text) throw new Error('Copilot returned an empty response');
  return result;
}

// ============================================================================
// 6-agent pipeline + report
// ============================================================================

export async function runProblemPipeline(
  problemId: string,
  opts: { topN?: number; topTech?: number; explain?: boolean } = {},
): Promise<ProblemReport> {
  const raw = await api.post<RawReport>(`/ai/problems/${problemId}/run-pipeline`, opts);
  return flattenReport(raw);
}

export async function getProblemReport(problemId: string): Promise<ProblemReport> {
  const raw = await api.get<RawReport>(`/ai/problems/${problemId}/report`);
  return flattenReport(raw);
}

// ============================================================================
// Matchmaking engine (research papers)
// ============================================================================

export async function runMatchmaking(input: {
  problemStatement: string;
  topN?: number;
  explain?: boolean;
}): Promise<MatchmakingResult> {
  return api.post<MatchmakingResult>('/matchmaking/match', {
    problemStatement: input.problemStatement,
    topN: input.topN ?? 8,
    explain: input.explain ?? true,
  });
}

// ============================================================================
// Mock fallbacks (used when the live AI services are unreachable)
// ============================================================================

const REGULATORS_BY_SECTOR: Record<string, string[]> = {
  'CleanTech & Energy': ['MNRE', 'CEA', 'BIS'],
  'Engineering & Eco Materials': ['BIS', 'IGBC', 'GRIHA'],
  'Chemicals & Life Sciences': ['CPCB', 'BIS'],
  'Healthcare & Pharma': ['CDSCO', 'BIS'],
};

export function mockReport(problem: {
  id: string;
  title: string;
  industrySector: string;
  problemDescription: string;
  expectedSolution?: string;
  keywords: string[];
}): ProblemReport {
  const regulators = REGULATORS_BY_SECTOR[problem.industrySector] || ['BIS'];
  const kw = problem.keywords.slice(0, 6);
  return {
    id: problem.id,
    title: problem.title,
    processingStatus: 'complete',
    isMock: true,
    requirement: {
      domain: problem.industrySector,
      subDomain: kw[0] || 'general',
      problemStatement: problem.problemDescription,
      technologyNeeded: problem.expectedSolution || 'Applied technology matching the stated problem',
      keywords: kw,
      requiredTrl: 6,
      deploymentScale: 'Pilot → Commercial',
    },
    paperMatches: [
      {
        seedRef: 'DEMO-01',
        title: `Advances relevant to ${problem.title}`,
        subDomain: kw[0] || problem.industrySector,
        cosine: 0.82,
        citationCount: 47,
        whyItFits: 'Strong semantic overlap with the problem statement keywords and domain.',
      },
      {
        seedRef: 'DEMO-02',
        title: `Applied methods for ${kw[1] || problem.industrySector}`,
        subDomain: kw[1] || problem.industrySector,
        cosine: 0.74,
        citationCount: 23,
        whyItFits: 'Covers the expected solution approach at a comparable readiness level.',
      },
    ],
    recommendations: [
      {
        id: 'demo-tech-1',
        name: `${problem.industrySector} Solution Platform`,
        matchScore: 86,
        matchReasons: ['Domain and sub-domain align', 'Patent granted', 'Manufacturing-ready'],
        trl: 8,
        patentStatus: 'Granted',
        manufacturingReadiness: 'Ready',
        fitEvaluation: {
          fitLevel: 'HIGH',
          score: 84,
          strengths: ['High TRL', 'Clear IP position', 'Domain match'],
          risks: ['Certification timeline', 'Scale-up validation needed'],
          confidence: 0.78,
        },
      },
      {
        id: 'demo-tech-2',
        name: `Modular ${kw[0] || 'process'} system`,
        matchScore: 71,
        matchReasons: ['Keyword overlap', 'Deployable at pilot scale'],
        trl: 6,
        patentStatus: 'Pending',
        manufacturingReadiness: 'Near-ready',
        fitEvaluation: {
          fitLevel: 'MEDIUM',
          score: 66,
          strengths: ['Flexible deployment', 'Cost-efficient'],
          risks: ['IP not yet granted', 'Lower TRL'],
          confidence: 0.62,
        },
      },
    ],
    complianceReports: [
      {
        technologyName: `${problem.industrySector} Solution Platform`,
        requiredCerts: regulators.map((r) => `${r} certification`),
        missingCerts: regulators.slice(1).map((r) => `${r} certification`),
        approvalStatus: 'Partially compliant',
        recommendations: [
          `Initiate ${regulators[0]} certification early — it is the critical-path approval.`,
          'Prepare test reports and IPR documentation for the regulator submission.',
        ],
        regulators,
      },
    ],
    commercializationReports: [
      {
        technologyName: `${problem.industrySector} Solution Platform`,
        licenseType: 'Semi-Exclusive',
        techTransferTimeline: '6 months',
        marketReadiness: 'Near market-ready (6–12 months)',
        roadmap: [
          'Phase 1 — IPR diligence and certification kickoff',
          'Phase 2 — Pilot deployment and performance validation',
          'Phase 3 — Manufacturing scale-up and commercial rollout',
        ],
        quickLicense: true,
        patentBuyout: false,
      },
    ],
  };
}

export function mockMatchmaking(query: string): MatchmakingResult {
  return {
    problem: query,
    count: 3,
    isMock: true,
    matches: [
      { seed_ref: 'DEMO-01', title: 'Highly relevant research paper (demo)', sub_domain: 'general', cosine: 0.81, citation_count: 52 },
      { seed_ref: 'DEMO-02', title: 'Closely related approach (demo)', sub_domain: 'applied', cosine: 0.73, citation_count: 31 },
      { seed_ref: 'DEMO-03', title: 'Adjacent technique worth scanning (demo)', sub_domain: 'methods', cosine: 0.66, citation_count: 18 },
    ],
    explanations: [
      { seed_ref: 'DEMO-01', why: 'Demo mode: live matchmaking engine is offline. Strong keyword + domain overlap.' },
      { seed_ref: 'DEMO-02', why: 'Demo mode: comparable solution approach and readiness level.' },
    ],
  };
}
