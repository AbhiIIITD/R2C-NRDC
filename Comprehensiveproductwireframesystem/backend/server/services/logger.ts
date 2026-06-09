/** Minimal structured JSON logger for the AI integration layer. */

type Level = "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) => emit("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) => emit("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) => emit("error", scope, message, meta),
};
