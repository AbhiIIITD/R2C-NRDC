import { FitLevel, Prisma, ProblemProcessingStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { logger } from "./logger.js";
import { problemToQuery, runMatch, persistMatchResult } from "./matchmaking.service.js";
import * as sutra from "./sutra.service.js";

export interface PipelineOptions {
  topN?: number; // papers from matchmaking
  topTech?: number; // technologies to deep-analyze (fit/compliance/commercialization)
  explain?: boolean;
}

const toFitLevel = (value: string): FitLevel => {
  const v = (value || "").toUpperCase();
  if (v.includes("HIGH")) return FitLevel.HIGH;
  if (v.includes("LOW")) return FitLevel.LOW;
  return FitLevel.MEDIUM;
};

const deriveLicenseSignals = (recommendedLicense: string, marketReadiness: string) => {
  const license = (recommendedLicense || "").toLowerCase();
  const ready = /ready|high/i.test(marketReadiness || "");
  const patentBuyout = /\bexclusive\b/.test(license) && !/non[- ]?exclusive|semi/.test(license);
  const quickLicense = /non[- ]?exclusive|semi/.test(license) || ready;
  return { quickLicense, patentBuyout };
};

async function setStatus(problemId: string, status: ProblemProcessingStatus, error?: string | null) {
  await prisma.problemStatement.update({
    where: { id: problemId },
    data: { processingStatus: status, lastPipelineError: error ?? null },
  });
}

/**
 * Full industry-problem pipeline:
 *   problem -> matchmaking papers (independent)
 *           -> SUTRA: extract requirement -> discover tech -> fit + compliance + commercialization
 * Each subsystem is resilient: a failure in one does not discard the other's results.
 */
export async function runProblemPipeline(problemStatementId: string, actorId: string, options: PipelineOptions = {}) {
  const topN = options.topN ?? 10;
  const topTech = options.topTech ?? 3;

  const problem = await prisma.problemStatement.findFirst({
    where: { id: problemStatementId, deletedAt: null },
    include: { company: true },
  });
  if (!problem) throw new Error("Problem statement not found");

  const errors: string[] = [];
  await setStatus(problemStatementId, ProblemProcessingStatus.MATCHING);

  // ---- Block A: Matchmaking (research papers) — only needs the problem text ----
  try {
    const query = problemToQuery(problem);
    const response = await runMatch({
      problemStatement: query,
      topN,
      explain: options.explain ?? false,
      actorId,
      problemStatementId,
    });
    await persistMatchResult(problemStatementId, response, { topN });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error("pipeline", "matchmaking block failed", { problemStatementId, detail });
    errors.push(`matchmaking: ${detail}`);
  }

  // ---- Block B: SUTRA agents (technology analysis) ----
  await setStatus(problemStatementId, ProblemProcessingStatus.ANALYZING);
  try {
    await runSutraBlock(problem, actorId, topTech);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error("pipeline", "sutra block failed", { problemStatementId, detail });
    errors.push(`sutra: ${detail}`);
  }

  const allFailed = errors.length === 2;
  await setStatus(
    problemStatementId,
    allFailed ? ProblemProcessingStatus.FAILED : ProblemProcessingStatus.COMPLETE,
    errors.length ? errors.join(" | ") : null,
  );

  return getProblemReport(problemStatementId);
}

async function runSutraBlock(
  problem: Prisma.ProblemStatementGetPayload<{ include: { company: true } }>,
  actorId: string,
  topTech: number,
) {
  // 1. Resolve / create the SUTRA company id (reuse a previously stored one for this problem).
  const existing = await prisma.industryRequirement.findUnique({ where: { problemStatementId: problem.id } });
  let sutraCompanyId = (existing?.raw as Record<string, unknown> | null)?.sutraCompanyId as number | undefined;
  if (!sutraCompanyId) {
    const company = await sutra.registerCompany(
      {
        companyName: problem.company?.name || problem.industryName,
        sector: problem.company?.sector || problem.industrySector,
        subSector: problem.industrySector,
        location: "India",
        companySize: "Unknown",
        businessObjective: problem.expectedSolution,
        technologyInterest: problem.keywords.join(", "),
        contactDetails: problem.contactPerson,
      },
      actorId,
    );
    sutraCompanyId = company.id;
  }

  // 2. Extract structured requirement.
  const requirementText = [problem.problemDescription, problem.currentChallenges, problem.expectedSolution]
    .filter(Boolean)
    .join("\n");
  const analysis = await sutra.extractRequirements(sutraCompanyId, requirementText, { actorId, relatedId: problem.id });
  const extracted = analysis.extracted_data || {};

  await prisma.industryRequirement.upsert({
    where: { problemStatementId: problem.id },
    create: {
      problemStatementId: problem.id,
      companyId: problem.companyId,
      domain: extracted.domain,
      subDomain: extracted.sub_domain,
      problemStatement: extracted.problem_statement,
      technologyNeeded: extracted.technology_needed,
      keywords: splitKeywords(extracted.keywords),
      requiredTrl: extracted.required_trl,
      deploymentScale: extracted.deployment_scale,
      raw: { sutraCompanyId, sutraRequirementId: analysis.requirement_id, extracted } as Prisma.InputJsonValue,
    },
    update: {
      domain: extracted.domain,
      subDomain: extracted.sub_domain,
      problemStatement: extracted.problem_statement,
      technologyNeeded: extracted.technology_needed,
      keywords: splitKeywords(extracted.keywords),
      requiredTrl: extracted.required_trl,
      deploymentScale: extracted.deployment_scale,
      raw: { sutraCompanyId, sutraRequirementId: analysis.requirement_id, extracted } as Prisma.InputJsonValue,
    },
  });

  // Clean slate for derived rows so re-runs don't accumulate duplicates.
  await prisma.technologyRecommendation.deleteMany({ where: { problemStatementId: problem.id } });
  await prisma.commercializationReport.deleteMany({ where: { problemStatementId: problem.id } });
  await prisma.complianceReport.deleteMany({ where: { problemStatementId: problem.id } });

  // 3. Discover technologies.
  const discovery = await sutra.discoverTechnologies(analysis.requirement_id, { actorId, relatedId: problem.id });
  const matches = discovery.matches || [];

  for (const match of matches) {
    await prisma.technologyRecommendation.create({
      data: {
        problemStatementId: problem.id,
        externalId: String(match.id),
        name: match.technology_name,
        matchScore: match.match_score,
        matchReasons: match.match_reason ? [match.match_reason] : [],
        trl: match.trl_level,
        patentStatus: match.patent_status,
        manufacturingReadiness: match.manufacturing_readiness,
        raw: match as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // 4. Deep-analyze the top technologies.
  const top = matches.slice(0, Math.max(0, topTech));
  for (const match of top) {
    const recommendation = await prisma.technologyRecommendation.findFirst({
      where: { problemStatementId: problem.id, externalId: String(match.id) },
    });
    if (!recommendation) continue;

    // Fit
    try {
      const fit = await sutra.evaluateFit(match.id, analysis.requirement_id, { actorId, relatedId: problem.id });
      await prisma.technologyFitEvaluation.upsert({
        where: { recommendationId: recommendation.id },
        create: {
          recommendationId: recommendation.id,
          fitLevel: toFitLevel(fit.industry_fit),
          score: fit.score,
          strengths: fit.strengths || [],
          risks: fit.risks || [],
          confidence: fit.confidence_score,
          raw: fit as unknown as Prisma.InputJsonValue,
        },
        update: {
          fitLevel: toFitLevel(fit.industry_fit),
          score: fit.score,
          strengths: fit.strengths || [],
          risks: fit.risks || [],
          confidence: fit.confidence_score,
          raw: fit as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.warn("pipeline", "fit eval failed", { tech: match.id, detail: (error as Error).message });
    }

    // Compliance
    try {
      const compliance = await sutra.checkCompliance(match.id, { actorId, relatedId: problem.id });
      await prisma.complianceReport.create({
        data: {
          problemStatementId: problem.id,
          recommendationId: recommendation.id,
          technologyName: match.technology_name,
          requiredCerts: compliance.required_certifications || [],
          missingCerts: compliance.missing_certifications || [],
          approvalStatus: compliance.approval_status,
          recommendations: compliance.recommendations || [],
          regulators: deriveRegulators(compliance),
          raw: compliance as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.warn("pipeline", "compliance failed", { tech: match.id, detail: (error as Error).message });
    }

    // Commercialization
    try {
      const comm = await sutra.analyzeCommercialization(match.id, { actorId, relatedId: problem.id });
      const signals = deriveLicenseSignals(comm.recommended_license, comm.market_readiness);
      await prisma.commercializationReport.create({
        data: {
          problemStatementId: problem.id,
          technologyName: match.technology_name,
          licenseType: comm.recommended_license,
          techTransferTimeline: comm.tech_transfer_timeline ? `${comm.tech_transfer_timeline} months` : undefined,
          marketReadiness: comm.market_readiness,
          roadmap: (comm.deployment_roadmap || []) as Prisma.InputJsonValue,
          quickLicense: signals.quickLicense,
          patentBuyout: signals.patentBuyout,
          raw: comm as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.warn("pipeline", "commercialization failed", { tech: match.id, detail: (error as Error).message });
    }
  }
}

const splitKeywords = (value?: string): string[] =>
  (value || "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

const deriveRegulators = (compliance: sutra.SutraComplianceResponse): string[] => {
  const text = (compliance.required_certifications || []).join(" ");
  const known = ["BIS", "MNRE", "CEA", "CPCB", "IGBC", "GRIHA", "NBC"];
  return known.filter((body) => text.includes(body));
};

/** Aggregate everything the Smart-Match dashboard needs for a problem. */
export async function getProblemReport(problemStatementId: string) {
  const problem = await prisma.problemStatement.findFirst({
    where: { id: problemStatementId, deletedAt: null },
    include: {
      company: true,
      requirement: true,
      matchResults: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { matches: { include: { paper: true }, orderBy: { rank: "asc" } } },
      },
      recommendations: {
        where: { deletedAt: null },
        orderBy: { matchScore: "desc" },
        include: { fitEvaluation: true, complianceReports: true },
      },
      complianceReports: { where: { deletedAt: null } },
      commercializationReports: { where: { deletedAt: null } },
    },
  });
  if (!problem) throw new Error("Problem statement not found");
  return problem;
}
