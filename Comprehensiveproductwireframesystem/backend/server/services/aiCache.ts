import crypto from "node:crypto";
import { aiConfig } from "./aiConfig.js";

/**
 * Small in-process TTL cache with bounded size (LRU-ish eviction by insertion order).
 * Used to deduplicate expensive AI / embedding calls within a process. Durable caching
 * of results is handled separately by persisting MatchResult / *Report rows.
 */

interface Entry {
  value: unknown;
  expires: number;
}

const store = new Map<string, Entry>();

export function cacheKey(parts: unknown[]): string {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  // refresh recency
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function setCached(key: string, value: unknown, ttlMs = aiConfig.cache.ttlMs): void {
  if (store.size >= aiConfig.cache.maxEntries) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** Run `fn` with caching. Returns the value plus whether it was a cache hit. */
export async function withCache<T>(
  parts: unknown[],
  fn: () => Promise<T>,
  ttlMs = aiConfig.cache.ttlMs,
): Promise<{ value: T; cached: boolean }> {
  const key = cacheKey(parts);
  const hit = getCached<T>(key);
  if (hit !== undefined) return { value: hit, cached: true };
  const value = await fn();
  setCached(key, value, ttlMs);
  return { value, cached: false };
}
