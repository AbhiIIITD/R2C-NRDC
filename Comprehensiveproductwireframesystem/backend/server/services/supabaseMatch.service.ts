import { aiConfig } from "./aiConfig.js";
import { http } from "./httpClient.js";
import type { MatchmakingResponse } from "./matchmaking.service.js";

/**
 * Direct Supabase (PostgREST) matchmaking — calls the auto-exposed pgvector RPCs
 * with the publishable key, no database password required. Used as a resilient
 * fallback for registered problems when the Python matchmaking service is down.
 */

export function supabaseConfigured(): boolean {
  return Boolean(aiConfig.supabase.url && aiConfig.supabase.key);
}

interface SupaMatchRow {
  seed_ref: string;
  title: string;
  sub_domain?: string | null;
  cosine: number | string; // PostgREST may serialize numeric as a string
  citation_count?: number | null;
}

function supaHeaders(): Record<string, string> {
  return { apikey: aiConfig.supabase.key, Authorization: `Bearer ${aiConfig.supabase.key}` };
}

function adapt(problemText: string, rows: SupaMatchRow[]): MatchmakingResponse {
  const matches = rows.map((r) => ({
    seed_ref: r.seed_ref,
    title: r.title,
    sub_domain: r.sub_domain ?? null,
    cosine: typeof r.cosine === "string" ? Number(r.cosine) : r.cosine,
    citation_count: r.citation_count ?? null,
  }));
  return { problem: problemText, count: matches.length, matches };
}

/** Registered problem -> match_papers_by_problem (uses the pre-stored embedding). */
export async function matchByProblemRef(problemRef: string, topN: number): Promise<MatchmakingResponse> {
  const rows = await http.post<SupaMatchRow[]>(
    aiConfig.supabase.url,
    "/rest/v1/rpc/match_papers_by_problem",
    { p_problem_ref: problemRef, p_top_n: topN },
    { headers: supaHeaders(), label: "supabase:rpc/match_papers_by_problem" },
  );
  return adapt(problemRef, rows);
}

/** Pre-computed 768-dim query vector -> match_papers_by_vector. */
export async function matchByVector(problemText: string, vec: number[], topN: number): Promise<MatchmakingResponse> {
  const rows = await http.post<SupaMatchRow[]>(
    aiConfig.supabase.url,
    "/rest/v1/rpc/match_papers_by_vector",
    { p_vec: vec, p_top_n: topN },
    { headers: supaHeaders(), label: "supabase:rpc/match_papers_by_vector" },
  );
  return adapt(problemText, rows);
}
