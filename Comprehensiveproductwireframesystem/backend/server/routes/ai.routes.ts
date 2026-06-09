import type { Router } from "express";
import { z } from "zod";
import { ConversationRole, Prisma, StudyStatus, UserRole, VerificationStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { ApiError, asyncRoute, audit, requireRole } from "../lib.js";
import { runMatch, persistMatchResult, problemToQuery } from "../services/matchmaking.service.js";
import * as sutra from "../services/sutra.service.js";
import { runProblemPipeline, getProblemReport } from "../services/pipeline.service.js";
import { streamChat, type CopilotMessage, type CopilotSource } from "../services/copilot.service.js";

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", result.error.issues[0]?.message || "Invalid request");
  return result.data;
};

const requireCompany = (companyId?: string | null) => {
  if (!companyId) throw new ApiError(403, "COMPANY_REQUIRED", "Industry user is not linked to a company");
  return companyId;
};

/** Ensure the requester may read this problem's AI data (admin: all; industry: own company). */
async function loadOwnedProblem(req: { auth: { userId: string; role: UserRole; companyId?: string | null } }, id: string) {
  const problem = await prisma.problemStatement.findFirst({ where: { id, deletedAt: null } });
  if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem statement not found");
  if (req.auth.role === UserRole.INDUSTRY && problem.companyId !== req.auth.companyId) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this problem");
  }
  return problem;
}

const mapVerificationStatus = (status: string): VerificationStatus => {
  const v = (status || "").toLowerCase();
  if (v.includes("partial")) return VerificationStatus.PARTIALLY_VERIFIED;
  if (v.includes("verified")) return VerificationStatus.VERIFIED;
  return VerificationStatus.UNVERIFIED;
};

export function registerAiRoutes(api: Router) {
  // ==========================================================================
  // SUTRA agent passthroughs
  // ==========================================================================

  api.post(
    "/ai/extract-requirements",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const body = parse(
        z.object({
          requirementText: z.string().min(10),
          sutraCompanyId: z.number().int().positive().optional(),
          companyMeta: z
            .object({
              companyName: z.string(),
              sector: z.string(),
              subSector: z.string(),
              location: z.string().default("India"),
              companySize: z.string().default("Unknown"),
            })
            .optional(),
        }),
        req.body,
      );

      let companyId = body.sutraCompanyId;
      if (!companyId) {
        const meta = body.companyMeta;
        if (!meta) throw new ApiError(400, "COMPANY_META_REQUIRED", "Provide sutraCompanyId or companyMeta to register the company");
        const company = await sutra.registerCompany(meta, req.auth!.userId);
        companyId = company.id;
      }
      const analysis = await sutra.extractRequirements(companyId, body.requirementText, { actorId: req.auth!.userId });
      res.json({ success: true, data: { sutraCompanyId: companyId, ...analysis } });
    }),
  );

  api.post(
    "/ai/discover-technologies",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const body = parse(z.object({ requirementId: z.number().int().positive() }), req.body);
      const result = await sutra.discoverTechnologies(body.requirementId, { actorId: req.auth!.userId });
      res.json({ success: true, data: result });
    }),
  );

  api.post(
    "/ai/industry-fit",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const body = parse(
        z.object({ technologyId: z.number().int().positive(), requirementId: z.number().int().positive() }),
        req.body,
      );
      const result = await sutra.evaluateFit(body.technologyId, body.requirementId, { actorId: req.auth!.userId });
      res.json({ success: true, data: result });
    }),
  );

  api.post(
    "/ai/compliance",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const body = parse(z.object({ technologyId: z.number().int().positive() }), req.body);
      const result = await sutra.checkCompliance(body.technologyId, { actorId: req.auth!.userId });
      res.json({ success: true, data: result });
    }),
  );

  api.post(
    "/ai/commercialization",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const body = parse(z.object({ technologyId: z.number().int().positive() }), req.body);
      const result = await sutra.analyzeCommercialization(body.technologyId, { actorId: req.auth!.userId });
      res.json({ success: true, data: result });
    }),
  );

  api.post(
    "/ai/citation-verification",
    asyncRoute(async (req, res) => {
      const body = parse(
        z.object({
          claim: z.string().min(3),
          domain: z.string().optional().default(""),
          subDomain: z.string().optional().default(""),
          persist: z.boolean().optional().default(false),
          relatedType: z.string().optional(),
          relatedId: z.string().optional(),
        }),
        req.body,
      );
      const result = await sutra.verifyCitation(body.claim, body.domain, body.subDomain, {
        actorId: req.auth!.userId,
        relatedType: body.relatedType,
        relatedId: body.relatedId,
      });
      if (body.persist) {
        await prisma.citationVerification.create({
          data: {
            claim: body.claim,
            verifiedAnswer: result.answer,
            confidence: result.confidence_score,
            status: mapVerificationStatus(result.verification_status),
            domain: body.domain || undefined,
            subDomain: body.subDomain || undefined,
            sources: result.sources as unknown as Prisma.InputJsonValue,
            relatedType: body.relatedType,
            relatedId: body.relatedId,
          },
        });
      }
      res.json({ success: true, data: result });
    }),
  );

  // ==========================================================================
  // Matchmaking engine
  // ==========================================================================

  api.post(
    "/matchmaking/match",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN, UserRole.RESEARCHER),
    asyncRoute(async (req, res) => {
      const body = parse(
        z.object({
          problemStatement: z.string().min(5).optional(),
          problemRef: z.string().optional(),
          topN: z.number().int().min(1).max(50).optional().default(10),
          explain: z.boolean().optional().default(false),
        }),
        req.body,
      );
      if (!body.problemStatement && !body.problemRef) {
        throw new ApiError(400, "VALIDATION_ERROR", "Provide problemStatement or problemRef");
      }
      const result = await runMatch({
        problemStatement: body.problemStatement,
        problemRef: body.problemRef,
        topN: body.topN,
        explain: body.explain,
        actorId: req.auth!.userId,
      });
      res.json({ success: true, data: result });
    }),
  );

  api.post(
    "/matchmaking/problem/:id",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const problem = await loadOwnedProblem(req as never, String(req.params.id));
      const body = parse(
        z.object({ topN: z.number().int().min(1).max(50).optional().default(10), explain: z.boolean().optional().default(false) }),
        req.body ?? {},
      );
      const response = await runMatch({
        problemStatement: problemToQuery(problem),
        topN: body.topN,
        explain: body.explain,
        actorId: req.auth!.userId,
        problemStatementId: problem.id,
      });
      const matchResult = await persistMatchResult(problem.id, response, { topN: body.topN });
      res.status(201).json({ success: true, data: matchResult });
    }),
  );

  // ==========================================================================
  // Full pipeline + reports
  // ==========================================================================

  api.post(
    "/ai/problems/:id/run-pipeline",
    requireRole(UserRole.INDUSTRY, UserRole.ADMIN),
    asyncRoute(async (req, res) => {
      const problem = await loadOwnedProblem(req as never, String(req.params.id));
      const body = parse(
        z.object({
          topN: z.number().int().min(1).max(50).optional(),
          topTech: z.number().int().min(1).max(10).optional(),
          explain: z.boolean().optional(),
        }),
        req.body ?? {},
      );
      const report = await runProblemPipeline(problem.id, req.auth!.userId, body);
      await prisma.$transaction((tx) => audit(tx, req.auth!.userId, "AI_PIPELINE_RUN", "ProblemStatement", problem.id));
      res.json({ success: true, data: report });
    }),
  );

  api.get(
    "/ai/problems/:id/report",
    asyncRoute(async (req, res) => {
      await loadOwnedProblem(req as never, String(req.params.id));
      const report = await getProblemReport(String(req.params.id));
      res.json({ success: true, data: report });
    }),
  );

  // List "matches" = problems with AI analysis, scoped by role.
  api.get(
    "/matches",
    asyncRoute(async (req, res) => {
      const where: Prisma.ProblemStatementWhereInput = { deletedAt: null };
      if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
      else if (req.auth!.role === UserRole.RESEARCHER) {
        // researchers see opportunities via a dedicated endpoint
        res.json({ success: true, data: [] });
        return;
      }
      const problems = await prisma.problemStatement.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          company: { select: { name: true } },
          _count: { select: { recommendations: true, matchResults: true } },
          matchResults: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, include: { _count: { select: { matches: true } } } },
          commercializationReports: { where: { deletedAt: null }, select: { quickLicense: true, patentBuyout: true } },
        },
      });
      const data = problems.map((p) => ({
        id: p.id,
        title: p.title,
        companyName: p.company?.name,
        industrySector: p.industrySector,
        urgency: p.urgency,
        processingStatus: p.processingStatus.toLowerCase(),
        updatedAt: p.updatedAt,
        paperMatches: p.matchResults[0]?._count.matches ?? 0,
        technologyCount: p._count.recommendations,
        quickLicense: p.commercializationReports.some((r) => r.quickLicense),
        patentBuyout: p.commercializationReports.some((r) => r.patentBuyout),
      }));
      res.json({ success: true, data });
    }),
  );

  api.get(
    "/matches/:id",
    asyncRoute(async (req, res) => {
      await loadOwnedProblem(req as never, String(req.params.id));
      const report = await getProblemReport(String(req.params.id));
      res.json({ success: true, data: report });
    }),
  );

  // Researcher opportunity feed: industry problems whose domain/keywords overlap the
  // researcher's studies. Read-only, anonymized to company name + sector.
  api.get(
    "/researcher/match-opportunities",
    requireRole(UserRole.RESEARCHER),
    asyncRoute(async (req, res) => {
      const studies = await prisma.study.findMany({
        where: { researcherId: req.auth!.userId },
        select: { domain: true, keywords: true },
      });
      const domains = new Set(studies.map((s) => s.domain.toLowerCase()).filter(Boolean));
      const keywords = new Set(studies.flatMap((s) => s.keywords).map((k) => k.toLowerCase()));

      const requirements = await prisma.industryRequirement.findMany({
        where: { deletedAt: null },
        include: {
          problem: { select: { id: true, title: true, industrySector: true, urgency: true, company: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const opportunities = requirements
        .map((r) => {
          const reqKeywords = (r.keywords || []).map((k) => k.toLowerCase());
          const domainMatch = r.domain ? domains.has(r.domain.toLowerCase()) : false;
          const keywordOverlap = reqKeywords.filter((k) => keywords.has(k));
          const score = (domainMatch ? 0.5 : 0) + Math.min(0.5, keywordOverlap.length * 0.1);
          return { r, score, keywordOverlap, domainMatch };
        })
        .filter((o) => o.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25)
        .map((o) => ({
          problemId: o.r.problem?.id,
          title: o.r.problem?.title,
          companyName: o.r.problem?.company?.name,
          industrySector: o.r.problem?.industrySector,
          urgency: o.r.problem?.urgency,
          domain: o.r.domain,
          matchScore: Math.round(o.score * 100),
          matchedKeywords: o.keywordOverlap,
        }));
      res.json({ success: true, data: opportunities });
    }),
  );

  // ==========================================================================
  // AI Copilot (streaming, role-scoped, with history + citations)
  // ==========================================================================

  api.get(
    "/copilot/sessions",
    asyncRoute(async (req, res) => {
      const sessions = await prisma.copilotSession.findMany({
        where: { userId: req.auth!.userId, deletedAt: null },
        orderBy: { lastMessageAt: "desc" },
        select: { id: true, title: true, role: true, lastMessageAt: true, createdAt: true },
      });
      res.json({ success: true, data: sessions });
    }),
  );

  api.get(
    "/copilot/sessions/:id",
    asyncRoute(async (req, res) => {
      const session = await prisma.copilotSession.findFirst({
        where: { id: String(req.params.id), userId: req.auth!.userId, deletedAt: null },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!session) throw new ApiError(404, "NOT_FOUND", "Session not found");
      res.json({ success: true, data: session });
    }),
  );

  api.delete(
    "/copilot/sessions/:id",
    asyncRoute(async (req, res) => {
      const session = await prisma.copilotSession.findFirst({ where: { id: String(req.params.id), userId: req.auth!.userId, deletedAt: null } });
      if (!session) throw new ApiError(404, "NOT_FOUND", "Session not found");
      await prisma.copilotSession.update({ where: { id: session.id }, data: { deletedAt: new Date() } });
      res.json({ success: true, data: null });
    }),
  );

  // Streaming chat via Server-Sent Events.
  api.post(
    "/copilot/chat",
    asyncRoute(async (req, res) => {
      const body = parse(
        z.object({
          message: z.string().min(1),
          sessionId: z.string().optional(),
          problemStatementId: z.string().optional(),
          studyId: z.string().optional(),
        }),
        req.body,
      );
      const role = req.auth!.role;

      // Resolve or create the session.
      let session = body.sessionId
        ? await prisma.copilotSession.findFirst({ where: { id: body.sessionId, userId: req.auth!.userId, deletedAt: null } })
        : null;
      if (!session) {
        session = await prisma.copilotSession.create({
          data: { userId: req.auth!.userId, role, title: body.message.slice(0, 60) },
        });
      }

      const prior = await prisma.conversation.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });
      const history: CopilotMessage[] = prior.map((m) => ({
        role: m.role === ConversationRole.ASSISTANT ? "assistant" : m.role === ConversationRole.SYSTEM ? "system" : "user",
        content: m.content,
      }));
      history.push({ role: "user", content: body.message });

      // Grounding: the exact study in focus (e.g. opened from the marketplace), plus
      // any studies matching the question, plus any problem report.
      const sources = await buildCopilotSources(req.auth!, body.message, body.problemStatementId, body.studyId);

      // Persist the user message immediately.
      await prisma.conversation.create({
        data: { sessionId: session.id, role: ConversationRole.USER, content: body.message },
      });

      // SSE headers.
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.write(`event: session\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`);

      try {
        const { text, sources: usedSources, model } = await streamChat({ role, history, sources }, (delta) => {
          res.write(`event: token\ndata: ${JSON.stringify({ delta })}\n\n`);
        });
        await prisma.$transaction([
          prisma.conversation.create({
            data: {
              sessionId: session.id,
              role: ConversationRole.ASSISTANT,
              content: text,
              citations: usedSources as unknown as Prisma.InputJsonValue,
            },
          }),
          prisma.copilotSession.update({ where: { id: session.id }, data: { lastMessageAt: new Date() } }),
        ]);
        res.write(`event: done\ndata: ${JSON.stringify({ citations: usedSources, model })}\n\n`);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Copilot failed to respond";
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      } finally {
        res.end();
      }
    }),
  );
}

function studySource(s: { title: string; domain: string; trl: number; readinessScore: number | null; ipStatus: string | null; marketSize: string | null; competitors: string | null; researcherName: string; abstract: string; commercialPotential: string | null }): CopilotSource {
  const meta = [
    `domain ${s.domain}`,
    `TRL ${s.trl}`,
    s.readinessScore ? `readiness ${s.readinessScore}/100` : null,
    s.ipStatus ? `IP: ${s.ipStatus}` : null,
    s.marketSize ? `market ${s.marketSize}` : null,
    s.competitors ? `competitors ${s.competitors}` : null,
    s.researcherName ? `by ${s.researcherName}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const commercial = s.commercialPotential ? ` Commercial potential: ${s.commercialPotential}` : "";
  return { label: `Study: ${s.title}`, detail: `${meta}. ${(s.abstract || "").slice(0, 600)}${commercial}` };
}

async function buildCopilotSources(
  auth: { userId: string; role: UserRole; companyId?: string | null },
  message: string,
  problemStatementId?: string,
  studyId?: string,
): Promise<CopilotSource[]> {
  const sources: CopilotSource[] = [];
  const seen = new Set<string>();

  // The exact study the user is focused on (opened from the marketplace / a study
  // page) — grounded FIRST so the copilot knows it without the user describing it.
  if (studyId) {
    const scope: Prisma.StudyWhereInput =
      auth.role === UserRole.INDUSTRY
        ? { status: StudyStatus.PUBLISHED }
        : auth.role === UserRole.RESEARCHER
          ? { OR: [{ researcherId: auth.userId }, { status: StudyStatus.PUBLISHED }] }
          : {};
    const focus = await prisma.study.findFirst({ where: { id: studyId, ...scope } });
    if (focus) {
      const src = studySource(focus);
      sources.push({ label: `Primary study under evaluation — ${focus.title}`, detail: src.detail });
      seen.add(focus.id);
    }
  }

  // Auto-ground from the user's accessible studies that match the question, so
  // asking the copilot about ANY study automatically pulls that study's real data
  // (and the copilot can cite it). Role-scoped: researchers see their own studies,
  // industry sees published technologies, admins see everything.
  const terms = Array.from(
    new Set((message || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 4)),
  ).slice(0, 8);
  // Skip the broad keyword search when the user has an explicit study in focus —
  // otherwise loosely-related matches make the analyst ask "which study?".
  if (terms.length && seen.size === 0) {
    const scope: Prisma.StudyWhereInput =
      auth.role === UserRole.RESEARCHER
        ? { researcherId: auth.userId }
        : auth.role === UserRole.INDUSTRY
          ? { status: StudyStatus.PUBLISHED }
          : {};
    const studies = await prisma.study.findMany({
      where: {
        ...scope,
        OR: terms.flatMap((t) => [
          { title: { contains: t, mode: "insensitive" as const } },
          { abstract: { contains: t, mode: "insensitive" as const } },
          { domain: { contains: t, mode: "insensitive" as const } },
          { keywords: { has: t } },
        ]),
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    });
    for (const s of studies) {
      if (seen.has(s.id)) continue;
      sources.push(studySource(s));
      seen.add(s.id);
      if (seen.size >= 4) break;
    }
  }

  // Optional grounding from a problem's AI report.
  if (problemStatementId) {
    const problem = await prisma.problemStatement.findFirst({ where: { id: problemStatementId, deletedAt: null } });
    if (problem && !(auth.role === UserRole.INDUSTRY && problem.companyId !== auth.companyId)) {
      const report = await getProblemReport(problemStatementId);
      const latest = report.matchResults[0];
      for (const m of latest?.matches.slice(0, 5) || []) {
        sources.push({ label: `Paper ${m.paper.seedRef}`, detail: `${m.paper.title} (cosine ${m.cosine.toFixed(3)})` });
      }
      for (const rec of report.recommendations.slice(0, 3)) {
        const fit = rec.fitEvaluation ? `, fit ${rec.fitEvaluation.fitLevel} (${rec.fitEvaluation.score})` : "";
        sources.push({ label: `Technology ${rec.name}`, detail: `score ${rec.matchScore ?? "n/a"}, TRL ${rec.trl ?? "n/a"}${fit}` });
      }
      for (const comm of report.commercializationReports.slice(0, 2)) {
        sources.push({
          label: `Commercialization ${comm.technologyName ?? ""}`.trim(),
          detail: `${comm.licenseType ?? ""} ${comm.quickLicense ? "[quick-license]" : ""} ${comm.patentBuyout ? "[patent-buyout]" : ""}`.trim(),
        });
      }
    }
  }

  return sources;
}
