import { AIAgentType, MatchEngine, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { aiConfig } from "./aiConfig.js";
import { http } from "./httpClient.js";
import { withCache } from "./aiCache.js";
import { withTelemetry } from "./aiTelemetry.js";
import { logger } from "./logger.js";
import { supabaseConfigured, matchByProblemRef } from "./supabaseMatch.service.js";

const MODEL = "BAAI/bge-base-en-v1.5";

/** Shape returned by the Matchmaking FastAPI service (POST /match). */
export interface MatchmakingMatch {
  seed_ref: string;
  title: string;
  sub_domain?: string | null;
  cosine: number;
  citation_count?: number | null;
}
export interface MatchmakingExplanation {
  seed_ref: string;
  why?: string;
  error?: string;
}
export interface MatchmakingResponse {
  problem: string;
  count: number;
  matches: MatchmakingMatch[];
  explanations?: MatchmakingExplanation[];
}

export interface MatchByTextInput {
  problemStatement?: string;
  problemRef?: string;
  topN?: number;
  explain?: boolean;
  actorId?: string | null;
  problemStatementId?: string;
}

/** Call the Matchmaking engine. Caches identical (text, topN, explain) calls in-process. */
export async function runMatch(input: MatchByTextInput): Promise<MatchmakingResponse> {
  const topN = input.topN ?? 10;
  const explain = input.explain ?? false;
  const body: Record<string, unknown> = { top_n: topN, explain };
  if (input.problemRef) body.problem_ref = input.problemRef;
  if (input.problemStatement) body.problem_statement = input.problemStatement;

  return withTelemetry(
    {
      agent: AIAgentType.MATCHMAKING,
      provider: "matchmaking",
      model: MODEL,
      actorId: input.actorId,
      relatedType: input.problemStatementId ? "ProblemStatement" : undefined,
      relatedId: input.problemStatementId,
      input: body,
    },
    async () => {
      const { value, cached } = await withCache([
        "matchmaking",
        input.problemRef ?? input.problemStatement,
        topN,
        explain,
      ], async () => {
        try {
          return await http.post<MatchmakingResponse>(aiConfig.matchmaking.url, "/match", body, {
            apiKey: aiConfig.matchmaking.key || undefined,
            label: "matchmaking:/match",
          });
        } catch (error) {
          // Resilient fallback: when the Python matchmaking service is unreachable,
          // a registered problem can still be matched directly via Supabase REST
          // (pgvector RPC, publishable key — no DB password). Free text needs the
          // service for embeddings, so it re-throws.
          if (input.problemRef && supabaseConfigured()) {
            logger.warn("matchmaking", "service unavailable — falling back to Supabase REST", {
              problemRef: input.problemRef,
              detail: error instanceof Error ? error.message : String(error),
            });
            return matchByProblemRef(input.problemRef, topN);
          }
          throw error;
        }
      });
      return { value, cached };
    },
  );
}

/**
 * Persist a Matchmaking response for a platform problem: upsert papers, create a MatchResult
 * and its ranked ResearchMatch rows. Returns the MatchResult with matches + papers included.
 */
export async function persistMatchResult(
  problemStatementId: string,
  response: MatchmakingResponse,
  opts: { engine?: MatchEngine; topN: number } = { topN: 10 },
) {
  const explanationByRef = new Map<string, string>();
  for (const ex of response.explanations || []) {
    if (ex.seed_ref && ex.why) explanationByRef.set(ex.seed_ref, ex.why);
  }

  return prisma.$transaction(async (tx) => {
    const matchResult = await tx.matchResult.create({
      data: {
        problemStatementId,
        engine: opts.engine ?? MatchEngine.MATCHMAKING,
        topN: opts.topN,
        model: MODEL,
        problemText: response.problem,
        summary: { count: response.count } as Prisma.InputJsonValue,
      },
    });

    let rank = 0;
    for (const match of response.matches) {
      rank += 1;
      const paper = await tx.researchPaper.upsert({
        where: { seedRef: match.seed_ref },
        create: {
          seedRef: match.seed_ref,
          title: match.title,
          subDomain: match.sub_domain ?? undefined,
          citationCount: match.citation_count ?? undefined,
          externalSource: "matchmaking",
        },
        update: {
          title: match.title,
          subDomain: match.sub_domain ?? undefined,
          citationCount: match.citation_count ?? undefined,
        },
      });
      await tx.researchMatch.create({
        data: {
          matchResultId: matchResult.id,
          researchPaperId: paper.id,
          cosine: match.cosine,
          rank,
          whyItFits: explanationByRef.get(match.seed_ref),
        },
      });
    }

    return tx.matchResult.findUniqueOrThrow({
      where: { id: matchResult.id },
      include: { matches: { include: { paper: true }, orderBy: { rank: "asc" } } },
    });
  });
}

/** Build a single query string from a platform ProblemStatement for ad-hoc matching. */
export function problemToQuery(problem: {
  title: string;
  problemDescription: string;
  expectedSolution?: string | null;
  keywords?: string[];
}): string {
  return [
    problem.title,
    problem.problemDescription,
    problem.expectedSolution || "",
    (problem.keywords || []).join(", "),
  ]
    .filter(Boolean)
    .join(". ")
    .slice(0, 4000);
}
