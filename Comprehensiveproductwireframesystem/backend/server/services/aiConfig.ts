/**
 * Central configuration for all AI integrations (Matchmaking engine, SUTRA agents,
 * OpenAI/Gemini copilot, Supabase). All values are env-driven with safe local defaults
 * so the platform boots even before the Python services are deployed.
 */

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const aiConfig = {
  matchmaking: {
    url: (process.env.MATCHMAKING_API_URL || "http://localhost:8004").replace(/\/$/, ""),
    key: process.env.MATCHMAKING_API_KEY || "",
  },
  sutra: {
    url: (process.env.SUTRA_AI_API_URL || "http://localhost:8000").replace(/\/$/, ""),
    key: process.env.SUTRA_AI_API_KEY || "",
  },
  supabase: {
    url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_KEY || "",
  },
  openai: {
    key: process.env.OPENAI_API_KEY || "",
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.COPILOT_MODEL || "gpt-5.5",
  },
  gemini: {
    key: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
  },
  copilot: {
    provider: (process.env.COPILOT_PROVIDER || "openai") as "openai" | "gemini",
    maxHistory: num(process.env.COPILOT_MAX_HISTORY, 20),
    temperature: num(process.env.COPILOT_TEMPERATURE, 0.4),
  },
  http: {
    timeoutMs: num(process.env.AI_HTTP_TIMEOUT_MS, 45000),
    retries: num(process.env.AI_HTTP_RETRIES, 2),
    retryBaseMs: num(process.env.AI_HTTP_RETRY_BASE_MS, 400),
  },
  cache: {
    ttlMs: num(process.env.AI_CACHE_TTL_MS, 1000 * 60 * 30),
    maxEntries: num(process.env.AI_CACHE_MAX_ENTRIES, 500),
  },
} as const;

/** Throw a clear error when an integration is invoked without its credentials configured. */
export function assertConfigured(service: "matchmaking" | "sutra" | "openai" | "gemini") {
  const checks: Record<typeof service, boolean> = {
    matchmaking: Boolean(aiConfig.matchmaking.url),
    sutra: Boolean(aiConfig.sutra.url),
    openai: Boolean(aiConfig.openai.key),
    gemini: Boolean(aiConfig.gemini.key),
  } as Record<typeof service, boolean>;
  return checks[service];
}
