import { AIAgentType } from "@prisma/client";
import { aiConfig } from "./aiConfig.js";
import { http } from "./httpClient.js";
import { withCache } from "./aiCache.js";
import { withTelemetry } from "./aiTelemetry.js";

/**
 * Client for the SUTRA AI Agents service (FastAPI). SUTRA is stateful and keyed by its own
 * integer ids: company_id -> requirement_id -> technology_id. Callers thread those ids.
 */

const base = () => aiConfig.sutra.url;
const key = () => aiConfig.sutra.key || undefined;

// ---- Exact response shapes (mirror app/schemas/__init__.py in the SUTRA service) ----

export interface SutraCompanyResponse {
  id: number;
  company_name: string;
  sector: string;
  sub_sector: string;
  location: string;
  company_size: string;
  created_at: string;
}

export interface SutraExtractedData {
  problem_statement?: string;
  technology_needed?: string;
  domain?: string;
  sub_domain?: string;
  keywords?: string;
  required_trl?: number;
  deployment_scale?: string;
  [key: string]: unknown;
}
export interface SutraAnalyzeResponse {
  requirement_id: number;
  extracted_data: SutraExtractedData;
}

export interface SutraTechnologyMatch {
  id: number;
  technology_name: string;
  match_score: number;
  trl_level: number;
  patent_status: string;
  manufacturing_readiness: string;
  match_reason?: string;
}
export interface SutraMatchResponse {
  matches: SutraTechnologyMatch[];
}

export interface SutraFitResponse {
  industry_fit: string; // HIGH | MEDIUM | LOW
  score: number;
  strengths: string[];
  risks: string[];
  reasons: string[];
  confidence_score: number;
}

export interface SutraComplianceResponse {
  domain: string;
  sub_domain: string;
  required_certifications: string[];
  available_certifications: string[];
  missing_certifications: string[];
  approval_status: string;
  recommendations: string[];
}

export interface SutraCommercializationResponse {
  recommended_license: string;
  reason: string;
  technology_transfer_possible: boolean;
  tech_transfer_timeline: number;
  market_readiness: string;
  deployment_roadmap: string[];
}

export interface SutraCitationSource {
  source: string;
  url: string;
  evidence: string;
}
export interface SutraCitationResponse {
  answer: string;
  confidence_score: number;
  sources: SutraCitationSource[];
  verification_status: string;
}

export interface RegisterCompanyInput {
  companyName: string;
  sector: string;
  subSector: string;
  location: string;
  companySize: string;
  businessObjective?: string;
  technologyInterest?: string;
  contactDetails?: string;
}

// ---- Agent calls ----

export function registerCompany(input: RegisterCompanyInput, actorId?: string | null) {
  return withTelemetry(
    { agent: AIAgentType.REQUIREMENT_EXTRACTOR, provider: "sutra", actorId, input },
    async () => ({
      value: await http.post<SutraCompanyResponse>(base(), "/company/register", {
        company_name: input.companyName,
        sector: input.sector,
        sub_sector: input.subSector,
        location: input.location,
        company_size: input.companySize,
        business_objective: input.businessObjective,
        technology_interest: input.technologyInterest,
        contact_details: input.contactDetails,
      }, { apiKey: key(), label: "sutra:/company/register" }),
    }),
  );
}

/** Industry Requirement Extractor — natural language -> structured requirement (creates a SUTRA requirement). */
export function extractRequirements(
  companyId: number,
  requirementText: string,
  ctx: { actorId?: string | null; relatedId?: string } = {},
) {
  return withTelemetry(
    {
      agent: AIAgentType.REQUIREMENT_EXTRACTOR,
      provider: "sutra",
      actorId: ctx.actorId,
      relatedType: ctx.relatedId ? "ProblemStatement" : undefined,
      relatedId: ctx.relatedId,
      input: { companyId, requirementText },
    },
    async () => {
      const { value, cached } = await withCache(["sutra:analyze", companyId, requirementText], () =>
        http.post<SutraAnalyzeResponse>(base(), "/company/analyze", {
          company_id: companyId,
          requirement_text: requirementText,
        }, { apiKey: key(), label: "sutra:/company/analyze" }),
      );
      return { value, cached };
    },
  );
}

/** Technology Discovery Agent — rank technologies for a SUTRA requirement id. */
export function discoverTechnologies(requirementId: number, ctx: { actorId?: string | null; relatedId?: string } = {}) {
  return withTelemetry(
    { agent: AIAgentType.TECHNOLOGY_DISCOVERY, provider: "sutra", actorId: ctx.actorId, relatedType: "ProblemStatement", relatedId: ctx.relatedId, input: { requirementId } },
    async () => {
      const { value, cached } = await withCache(["sutra:match", requirementId], () =>
        // SUTRA's /technology/match takes requirement_id as a QUERY param (bare int
        // arg in FastAPI), not a JSON body — sending a body returns 422.
        http.post<SutraMatchResponse>(base(), "/technology/match", undefined, {
          apiKey: key(),
          query: { requirement_id: requirementId },
          label: "sutra:/technology/match",
        }),
      );
      return { value, cached };
    },
  );
}

/** Industry Fit Evaluator. */
export function evaluateFit(technologyId: number, requirementId: number, ctx: { actorId?: string | null; relatedId?: string } = {}) {
  return withTelemetry(
    { agent: AIAgentType.INDUSTRY_FIT, provider: "sutra", actorId: ctx.actorId, relatedType: "ProblemStatement", relatedId: ctx.relatedId, input: { technologyId, requirementId } },
    async () => {
      const { value, cached } = await withCache(["sutra:fit", technologyId, requirementId], () =>
        http.post<SutraFitResponse>(base(), "/technology/industry-fit", {
          technology_id: technologyId,
          requirement_id: requirementId,
        }, { apiKey: key(), label: "sutra:/technology/industry-fit" }),
      );
      return { value, cached };
    },
  );
}

/** Compliance Advisor (Indian regulatory). */
export function checkCompliance(technologyId: number, ctx: { actorId?: string | null; relatedId?: string } = {}) {
  return withTelemetry(
    { agent: AIAgentType.COMPLIANCE_ADVISOR, provider: "sutra", actorId: ctx.actorId, relatedType: "ProblemStatement", relatedId: ctx.relatedId, input: { technologyId } },
    async () => {
      const { value, cached } = await withCache(["sutra:compliance", technologyId], () =>
        http.post<SutraComplianceResponse>(base(), "/technology/compliance", { technology_id: technologyId }, {
          apiKey: key(),
          label: "sutra:/technology/compliance",
        }),
      );
      return { value, cached };
    },
  );
}

/** Commercialization Advisor (licensing / tech transfer / market readiness). */
export function analyzeCommercialization(technologyId: number, ctx: { actorId?: string | null; relatedId?: string } = {}) {
  return withTelemetry(
    { agent: AIAgentType.COMMERCIALIZATION_ADVISOR, provider: "sutra", actorId: ctx.actorId, relatedType: "ProblemStatement", relatedId: ctx.relatedId, input: { technologyId } },
    async () => {
      const { value, cached } = await withCache(["sutra:license", technologyId], () =>
        http.post<SutraCommercializationResponse>(base(), "/technology/license", { technology_id: technologyId }, {
          apiKey: key(),
          label: "sutra:/technology/license",
        }),
      );
      return { value, cached };
    },
  );
}

/** Citation Verifier — NOTE: SUTRA exposes claim/domain/sub_domain as query params, not a JSON body. */
export function verifyCitation(
  claim: string,
  domain = "",
  subDomain = "",
  ctx: { actorId?: string | null; relatedType?: string; relatedId?: string } = {},
) {
  return withTelemetry(
    { agent: AIAgentType.CITATION_VERIFIER, provider: "sutra", actorId: ctx.actorId, relatedType: ctx.relatedType, relatedId: ctx.relatedId, input: { claim, domain, subDomain } },
    async () => {
      const { value, cached } = await withCache(["sutra:verify", claim, domain, subDomain], () =>
        http.post<SutraCitationResponse>(base(), "/evidence/verify", undefined, {
          apiKey: key(),
          query: { claim, domain, sub_domain: subDomain },
          label: "sutra:/evidence/verify",
        }),
      );
      return { value, cached };
    },
  );
}
