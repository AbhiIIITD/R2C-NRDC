# Matchmaking Integration Guide

There are two layers:

1. Supabase RPC returns cosine-similarity candidates from pgvector.
2. The FastAPI service wraps those candidates with a second scoring layer and optional OpenAI suggestions.

## Option A - Supabase RPC

Use this when the platform only needs raw candidates for a saved problem.

`POST {SUPABASE_URL}/rest/v1/rpc/match_papers_by_problem`

Headers: `apikey`, `Authorization: Bearer <anon-key>`, `Content-Type: application/json`

```json
{ "p_problem_ref": "PROB-NT-02", "p_top_n": 10 }
```

Response:

```json
[
  {
    "seed_ref": "RE-09",
    "title": "Modeling Membrane Degradation...",
    "sub_domain": "green_hydrogen_electrolysers",
    "cosine": 0.68,
    "citation_count": 0
  }
]
```

For free-text matching through RPC, call `match_papers_by_vector` with a 768-dim vector. The caller must create the embedding first.

## Option B - FastAPI Matchmaking Service

Use this for free-text problems, reranking, confidence scoring, score matrices, and user-facing suggestions.

Run:

```bash
uvicorn service.main:app --host 0.0.0.0 --port 8004
```

Routes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | check service, model, OpenAI config |
| GET | `/problems` | list registered problems |
| GET | `/companies` | list companies |
| POST | `/match` | rank papers for a problem |

### Request

Saved problem:

```json
{ "problem_ref": "PROB-NT-02", "top_n": 5, "explain": true }
```

Free text:

```json
{
  "problem_statement": "reduce silver paste cost in solar cells",
  "target_sub_domain": "solar_pv",
  "top_n": 5,
  "candidate_pool": 20,
  "explain": true
}
```

Rules:

- Send only one of `problem_ref` or `problem_statement`.
- `candidate_pool` controls how many cosine candidates are fetched before reranking.
- `target_sub_domain` is optional for free text; saved problems already have a sub-domain.
- `explain: true` uses OpenAI if `OPENAI_API_KEY` is configured.

### Response Shape

```json
{
  "problem": "reduce silver paste cost ...",
  "target_sub_domain": "solar_pv",
  "count": 5,
  "candidate_pool": 20,
  "scoring": {
    "version": "scoring-v2.0",
    "weights": {
      "semantic": 0.55,
      "subdomain": 0.2,
      "citation": 0.1,
      "recency": 0.1,
      "indian_source": 0.05
    },
    "llm_provider": "openai",
    "llm_model": "gpt-5.5",
    "llm_requested": true,
    "llm_applied": true
  },
  "suggestion": "Start with RE-08 because it directly targets silver paste reduction...",
  "matches": [
    {
      "rank": 1,
      "seed_ref": "RE-08",
      "title": "Conductive Paste and Method for Producing TOPCon Solar Cell",
      "sub_domain": "solar_pv",
      "cosine": 0.806,
      "final_score": 0.79,
      "confidence_band": "high",
      "rank_reason": "strong semantic fit, same sub-domain, published 2015",
      "score_matrix": {
        "metrics": {
          "semantic": 0.806,
          "subdomain": 1.0,
          "citation": 0.5,
          "recency": 0.0,
          "indian_source": 0.0
        }
      },
      "llm": {
        "llm_confidence": 0.84,
        "relevance_score": 0.85,
        "novelty_score": 0.70,
        "feasibility_score": 0.90,
        "why": "The paper maps directly to front-contact paste reduction.",
        "risk": "Patent/method details may need legal review.",
        "next_step": "Ask NRDC to verify ownership and licensing availability."
      },
      "score_matrix": {
        "llm_metrics": {
          "relevance": 0.85,
          "novelty": 0.70,
          "feasibility": 0.90,
          "composite": 0.82
        }
      }
    }
  ]
}
```

## Environment

```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
```

`OPENAI_MODEL` is optional. If not set, the service uses `gpt-5.5`, OpenAI's current frontier model for complex professional work.

## Typical Platform Flow

1. Company logs in.
2. Company registers a problem.
3. Platform calls `/match`.
4. UI shows ranked papers, confidence band, score matrix, LLM reason, risk, and next step.
5. Company shortlists papers and moves to NDA/deal workflow.
