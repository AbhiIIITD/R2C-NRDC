import { AIAgentType, AIExecutionStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { logger } from "./logger.js";

/** Truncate large payloads so the telemetry table stays lean. */
function clip(value: unknown, max = 8000): Prisma.InputJsonValue {
  if (value === undefined || value === null) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  try {
    const json = JSON.stringify(value);
    if (json.length <= max) return JSON.parse(json);
    return { _truncated: true, preview: json.slice(0, max) };
  } catch {
    return { _unserializable: String(value).slice(0, max) };
  }
}

export interface TelemetryContext {
  agent: AIAgentType;
  provider?: string;
  model?: string;
  actorId?: string | null;
  relatedType?: string;
  relatedId?: string;
  input?: unknown;
}

/**
 * Wrap an AI/agent/matchmaking call: time it, persist an AIAgentExecution row on success
 * or failure, and re-throw on error so callers keep normal control flow.
 */
export async function withTelemetry<T>(
  ctx: TelemetryContext,
  fn: () => Promise<{ value: T; cached?: boolean; tokensIn?: number; tokensOut?: number }>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await record(ctx, AIExecutionStatus.SUCCESS, {
      output: result.value,
      cached: result.cached,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs: Date.now() - startedAt,
    });
    return result.value;
  } catch (error) {
    await record(ctx, AIExecutionStatus.FAILED, {
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }
}

async function record(
  ctx: TelemetryContext,
  status: AIExecutionStatus,
  extra: { output?: unknown; error?: string; cached?: boolean; tokensIn?: number; tokensOut?: number; latencyMs: number },
) {
  try {
    await prisma.aIAgentExecution.create({
      data: {
        agent: ctx.agent,
        provider: ctx.provider,
        model: ctx.model,
        status,
        actorId: ctx.actorId ?? undefined,
        relatedType: ctx.relatedType,
        relatedId: ctx.relatedId,
        input: clip(ctx.input),
        output: extra.output === undefined ? undefined : clip(extra.output),
        error: extra.error,
        cached: extra.cached ?? false,
        tokensIn: extra.tokensIn,
        tokensOut: extra.tokensOut,
        latencyMs: extra.latencyMs,
      },
    });
  } catch (error) {
    // Telemetry must never break the request path.
    logger.error("aiTelemetry", "failed to persist execution", {
      agent: ctx.agent,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
