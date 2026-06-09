#!/usr/bin/env bash
# =====================================================================
# NRDC R2C — healthcheck for all 6 services. Prints PASS/FAIL per service
# and an OVERALL verdict (exit 0 = all pass, 1 = any fail).
# Usage:  bash scripts/healthcheck.sh
# =====================================================================
set -u
cd "$(dirname "$0")/.." || exit 1

# Defaults (overridden by ./.env if present)
FRONTEND_PORT=5174; BACKEND_PORT=4001; MATCHMAKING_PORT=8004
AI_AGENTS_PORT=8000; POSTGRES_PORT=55433; REDIS_PORT=6380
if [ -f .env ]; then set -a; . ./.env; set +a; fi

pass=0; fail=0
report() { # $1=name $2=0/1
  if [ "$2" -eq 0 ]; then printf "  [PASS] %s\n" "$1"; pass=$((pass+1));
  else printf "  [FAIL] %s\n" "$1"; fail=$((fail+1)); fi
}
ok() { eval "$1" >/dev/null 2>&1; }

cid() { docker compose ps -q "$1" 2>/dev/null; }

echo "================ NRDC R2C health ================"

ok "curl -fsS --max-time 5 http://localhost:${FRONTEND_PORT}/"; report "frontend     http://localhost:${FRONTEND_PORT}" $?
ok "curl -fsS --max-time 5 http://localhost:${BACKEND_PORT}/api/v1/health | grep -q ok"; report "backend      http://localhost:${BACKEND_PORT}/api/v1/health" $?
ok "curl -fsS --max-time 8 http://localhost:${MATCHMAKING_PORT}/health"; report "matchmaking  http://localhost:${MATCHMAKING_PORT}/health" $?
ok "curl -fsS --max-time 8 http://localhost:${AI_AGENTS_PORT}/health/"; report "ai-agents    http://localhost:${AI_AGENTS_PORT}/health/" $?

PG=$(cid postgres); if [ -n "$PG" ]; then ok "docker exec $PG pg_isready -U postgres"; report "postgres     (container pg_isready)" $?; else report "postgres     (container not found)" 1; fi
RD=$(cid redis); if [ -n "$RD" ]; then ok "docker exec $RD redis-cli ping"; report "redis        (container redis-cli ping)" $?; else report "redis        (container not found)" 1; fi

echo "-------------------------------------------------"
echo "PASS=$pass  FAIL=$fail"
if [ "$fail" -eq 0 ]; then echo "OVERALL: PASS"; exit 0; else echo "OVERALL: FAIL"; exit 1; fi
