import { ApiError } from "../lib.js";
import { aiConfig } from "./aiConfig.js";
import { logger } from "./logger.js";

export interface HttpOptions {
  /** Bearer token sent as `Authorization: Bearer <apiKey>` when present. */
  apiKey?: string;
  /** Query string params (used by SUTRA's /evidence/verify which takes scalar query params). */
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Human label for logs/errors, e.g. "matchmaking:/match". */
  label?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(baseUrl: string, path: string, query?: HttpOptions["query"]) {
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Should we retry this failure? Network errors, 429 and 5xx are transient. */
function isRetryable(status: number | null) {
  return status === null || status === 429 || (status >= 500 && status <= 599);
}

async function execute<T>(
  method: "GET" | "POST",
  baseUrl: string,
  path: string,
  body: unknown,
  opts: HttpOptions,
): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(503, "AI_SERVICE_UNCONFIGURED", `${opts.label || path}: upstream URL is not configured`);
  }
  const url = buildUrl(baseUrl, path, opts.query);
  const retries = opts.retries ?? aiConfig.http.retries;
  const timeoutMs = opts.timeoutMs ?? aiConfig.http.timeoutMs;
  const label = opts.label || `${method} ${path}`;

  let lastStatus: number | null = null;
  let lastDetail = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers || {}) };
      if (body !== undefined && method === "POST") headers["Content-Type"] = "application/json";
      if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined && method === "POST" ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      lastStatus = response.status;
      const text = await response.text();
      const payload = text ? safeJson(text) : null;

      if (!response.ok) {
        lastDetail = typeof payload === "object" && payload && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : text.slice(0, 300);
        logger.warn("httpClient", `${label} failed`, { status: response.status, attempt, detail: lastDetail });
        if (isRetryable(response.status) && attempt < retries) {
          await sleep(aiConfig.http.retryBaseMs * 2 ** attempt);
          continue;
        }
        throw new ApiError(502, "AI_UPSTREAM_ERROR", `${label}: upstream returned ${response.status} — ${lastDetail}`);
      }

      logger.info("httpClient", `${label} ok`, { status: response.status, ms: Date.now() - startedAt, attempt });
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const aborted = error instanceof Error && error.name === "AbortError";
      lastDetail = aborted ? `timeout after ${timeoutMs}ms` : (error as Error).message;
      lastStatus = null;
      logger.warn("httpClient", `${label} network error`, { attempt, detail: lastDetail });
      if (attempt < retries) {
        await sleep(aiConfig.http.retryBaseMs * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ApiError(502, "AI_UPSTREAM_UNREACHABLE", `${label}: unreachable after ${retries + 1} attempts — ${lastDetail}`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const http = {
  get: <T>(baseUrl: string, path: string, opts: HttpOptions = {}) => execute<T>("GET", baseUrl, path, undefined, opts),
  post: <T>(baseUrl: string, path: string, body: unknown, opts: HttpOptions = {}) =>
    execute<T>("POST", baseUrl, path, body, opts),
};
