# NRDC R2C — Matchmaking

Match a company's **problem statement** to the most relevant **research papers**, to automate
research-to-commercialisation (Quick License + Patent Buyout).

The service is a small FastAPI app. A request flows through three layers:

```
problem text
  └─(1) bge-base-en-v1.5 embedding ─→ pgvector cosine over the corpus (Supabase)
        └─(2) deterministic scoring  : calibrated semantic + soft sub-domain  (always runs)
              └─(3) LLM "why it fits" : grounded relevance judge (OpenAI, explain=true; default ON)
```

- **Layer 2 is the source of truth.** Cosine is min-max **calibrated** within the candidate pool
  (so near-tied similarities get real separation), sub-domain is a **soft** graded signal, and the
  rank is driven by **relevance only**.
- **Layer 3 is grounded, never generative.** The LLM judges each paper from real text we already
  have — the abstract, or (for lightweight entries) the curated `problem_statement` — must cite an
  evidence span, and may **abstain** (`insufficient_evidence`) rather than invent. novelty /
  feasibility are returned as decision-support fields and **do not affect the ranking**.

## What's here
```
service/main.py     Matchmaking API (FastAPI) — the thing you run/test
supabase/           schema.sql, rpc.sql, loaders (build the DB)
scripts/            comparison harnesses (compare_v2_v3*.py), local match.py
data/               source JSON (papers, companies, problems, embeddings, users)
docs/               FINAL_SCHEMA.md · INTEGRATION.md · TEST_CASES.md
```

## Run locally
The service runs on your machine and reads data/embeddings from Supabase (cloud).

```bash
pip install -r requirements.txt
cp .env.example .env     # paste your Supabase Session-pooler URL + OpenAI key
uvicorn service.main:app --port 8004
```

`.env`:
```ini
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-...-pooler.supabase.com:5432/postgres
OPENAI_API_KEY=sk-...      # required for the "why it fits" layer (explain=true is default)
OPENAI_MODEL=gpt-5.5       # optional override; gpt-5.5 is the default
```

Interactive docs: **http://localhost:8004/docs**

> Without `OPENAI_API_KEY` the service still runs — it returns the deterministic ranking and the
> `llm` fields are simply omitted (`llm_applied: false`).

---

# API reference

Base URL (local): `http://localhost:8004`

| Method | Path         | Purpose                                            |
|--------|--------------|----------------------------------------------------|
| GET    | `/health`    | Liveness + which models/key are configured         |
| GET    | `/problems`  | List the registered company problems               |
| GET    | `/companies` | List the registered companies                      |
| POST   | `/match`     | Rank papers for a problem (+ LLM "why it fits")    |

---

## GET `/health`

**Input:** none.

**Output:** object.

| field                  | type   | meaning                                          |
|------------------------|--------|--------------------------------------------------|
| `status`               | string | `"ok"`                                           |
| `embedding_model`      | string | embedding model id (`BAAI/bge-base-en-v1.5`)     |
| `scoring_version`      | string | deterministic scoring version (`scoring-v3.0-poc`)|
| `llm_provider`         | string | `"openai"`                                        |
| `llm_model`            | string | LLM id used for `explain` (`gpt-5.5`)             |
| `openai_key_configured`| bool   | whether an OpenAI key is present                  |

```json
{
  "status": "ok",
  "embedding_model": "BAAI/bge-base-en-v1.5",
  "scoring_version": "scoring-v3.0-poc",
  "llm_provider": "openai",
  "llm_model": "gpt-5.5",
  "openai_key_configured": true
}
```

---

## GET `/problems`

List the registered company problems (use a `problem_ref` as input to `/match`).

**Input:** none.

**Output:** array of objects.

| field               | type   | meaning                                  |
|---------------------|--------|------------------------------------------|
| `problem_ref`       | string | stable key, e.g. `PROB-NT-02`            |
| `company_id`        | string | owning company UUID                       |
| `problem_statement` | string | the problem text                          |
| `sub_domain`        | string | curated sub-domain label                  |

```json
[
  {
    "problem_ref": "PROB-CCS-01",
    "company_id": "837e5e0e-05fa-4323-b629-c78a0542ff13",
    "problem_statement": "Reduce the footprint, capex and regeneration energy of post-combustion CO2 capture from cement flue gas.",
    "sub_domain": "carbon_capture_cement"
  }
]
```

---

## GET `/companies`

**Input:** none.

**Output:** array of objects.

| field             | type     | meaning                                   |
|-------------------|----------|-------------------------------------------|
| `company_id_local`| string   | local id, e.g. `BLD-CCS-001`              |
| `legal_name`      | string   | company legal name                         |
| `company_tier`    | string   | tier label, e.g. `DEEP-TECH STARTUP`       |
| `domains`         | string[] | primary domains                            |

```json
[
  {
    "company_id_local": "BLD-CCS-001",
    "legal_name": "Carbon Clean Solutions Ltd",
    "company_tier": "DEEP-TECH STARTUP",
    "domains": ["buildings_infrastructure"]
  }
]
```

---

## POST `/match`

Rank papers for a problem. Provide **exactly one** of `problem_ref` *or* `problem_statement`.

### Input (JSON body)

| field               | type   | required | default | meaning                                                            |
|---------------------|--------|----------|---------|--------------------------------------------------------------------|
| `problem_ref`       | string | one-of   | —       | rank against a saved problem (uses its stored embedding)           |
| `problem_statement` | string | one-of   | —       | rank against free text (embedded on the fly by bge)                |
| `target_sub_domain` | string | no       | `null`  | sub-domain hint; for `problem_ref` it's inferred from the problem  |
| `top_n`             | int    | no       | `10`    | how many matches to return (clamped 1–50)                          |
| `candidate_pool`    | int    | no       | `60`    | how many papers to score before ranking (clamped to ≤60)           |
| `explain`           | bool   | no       | `true`  | run the LLM "why it fits" layer (set `false` to skip the LLM call) |

```json
{ "problem_statement": "reduce silver paste cost in solar cells", "top_n": 5 }
```
```json
{ "problem_ref": "PROB-NT-02", "top_n": 5 }
```

> Sending both `problem_ref` and `problem_statement` → `400`. Sending neither → `400`.
> (Swagger pre-fills both with `"string"` — delete the one you aren't using.)

### Output (top level)

| field               | type     | meaning                                                          |
|---------------------|----------|------------------------------------------------------------------|
| `problem`           | string   | the resolved problem text                                        |
| `target_sub_domain` | string   | the sub-domain used for scoring (may be `null`)                  |
| `count`             | int      | number of matches returned (`= len(matches)`)                    |
| `candidate_pool`    | int      | number of papers scored before the top-N slice                  |
| `scoring`           | object   | scoring metadata (see below)                                    |
| `matches`           | object[] | ranked papers (see below)                                       |
| `suggestion`        | string   | one-line LLM summary (present when `explain=true`)              |
| `llm_error`         | string   | present **only** if the LLM call failed (ranking still returned) |

`scoring`:
| field          | type   | meaning                                                  |
|----------------|--------|----------------------------------------------------------|
| `version`      | string | `scoring-v3.0-poc`                                        |
| `weights`      | object | deterministic weights `{semantic:0.75, subdomain:0.25}`  |
| `llm_provider` | string | `openai`                                                 |
| `llm_model`    | string | `gpt-5.5`                                                |
| `llm_blend`    | float  | LLM weight in the final blend (`0.30`)                   |
| `llm_requested`| bool   | did the request ask for `explain`                        |
| `llm_applied`  | bool   | did the LLM layer actually run (false on no-key/error)   |

Each item in `matches`:
| field             | type   | meaning                                                                 |
|-------------------|--------|-------------------------------------------------------------------------|
| `rank`            | int    | 1-based final rank                                                      |
| `seed_ref`        | string | paper id, e.g. `RE-08`                                                  |
| `title`           | string | paper title                                                            |
| `sub_domain`      | string | paper sub-domain                                                       |
| `cosine`          | float  | raw pgvector cosine similarity                                         |
| `final_score`     | float  | blended ranking score (0–1) — what the list is sorted by               |
| `confidence_band` | string | `high` ≥0.75 · `medium` ≥0.55 · `low`                                  |
| `rank_reason`     | string | short human-readable why-ranked string                                 |
| `grounding_source`| string | text the LLM judged from: `abstract` · `problem_statement` · `none`    |
| `metrics`         | object | `semantic_calibrated`, `semantic_cosine_raw`, `subdomain`, `indian_source` |
| `score_matrix`    | object | full transparent breakdown (version, weights, metrics, `llm_relevance`)|
| `llm`             | object | LLM judgment (present when `explain=true` and not abstained) — see below|

`llm` (the "why it fits" block):
| field                 | type   | meaning                                                          |
|-----------------------|--------|------------------------------------------------------------------|
| `relevance_score`     | float  | how directly the paper addresses the problem — **drives ranking**|
| `novelty_score`       | float  | how innovative it reads — **display only, not ranked**           |
| `feasibility_score`   | float  | how commercialisation-ready it reads — **display only**          |
| `insufficient_evidence`| bool  | `true` ⇒ model abstained; deterministic score kept unchanged     |
| `evidence`            | string | quote from the grounding text that justifies relevance           |
| `why`                 | string | one-sentence "why it's relevant"                                 |
| `risk`                | string | one short caveat                                                 |
| `next_step`           | string | one concrete next action                                        |

**Example response** (`{"problem_statement":"reduce silver paste cost in solar cells","top_n":1}`):
```json
{
  "problem": "reduce silver paste cost in solar cells",
  "target_sub_domain": null,
  "count": 1,
  "candidate_pool": 60,
  "scoring": {
    "version": "scoring-v3.0-poc",
    "weights": { "semantic": 0.75, "subdomain": 0.25 },
    "llm_provider": "openai", "llm_model": "gpt-5.5",
    "llm_blend": 0.3, "llm_requested": true, "llm_applied": true
  },
  "matches": [
    {
      "rank": 1,
      "seed_ref": "RE-08",
      "title": "Conductive Paste and Method for Producing TOPCon Solar Cell (Patent + Method)",
      "sub_domain": "solar_pv",
      "cosine": 0.793,
      "final_score": 1.0,
      "confidence_band": "high",
      "rank_reason": "strong semantic fit, published 2015",
      "grounding_source": "problem_statement",
      "metrics": {
        "semantic_calibrated": 1.0, "semantic_cosine_raw": 0.793,
        "subdomain": null, "indian_source": 0.0
      },
      "score_matrix": {
        "version": "scoring-v3.0-poc",
        "weights": { "semantic": 0.75, "subdomain": 0.25 },
        "metrics": { "semantic_calibrated": 1.0, "semantic_cosine_raw": 0.793, "subdomain": null, "indian_source": 0.0 },
        "final_score": 1.0, "confidence_band": "high", "llm_relevance": 1.0
      },
      "llm": {
        "relevance_score": 1.0, "novelty_score": 0.7, "feasibility_score": 0.8,
        "insufficient_evidence": false,
        "evidence": "Reduced silver consumption in TOPCon front contact paste",
        "why": "This directly targets the company problem by reducing silver use in solar cell conductive paste.",
        "risk": "Only a short summary is provided.",
        "next_step": "Request the full patent claims and paste formulation details."
      }
    }
  ],
  "suggestion": "Prioritize the TOPCon low-silver paste work, then broader metallization-cost papers."
}
```

---

## Scoring, in one paragraph

`final_score` = `0.70 · deterministic` + `0.30 · LLM relevance` (when `explain=true`; otherwise just the
deterministic score). `deterministic` = a weighted average of **calibrated semantic** similarity (0.75)
and **soft sub-domain** match (0.25), where a missing signal drops out of the average instead of
defaulting to a misleading neutral. `indian_source` is a tiebreak, not a weighted term. When the LLM
abstains (`insufficient_evidence`), its blend is a no-op so the deterministic score stands. novelty and
feasibility are **never** part of the rank.

## Compare versions
`scripts/compare_v2_v3.py` (registered problems) and `scripts/compare_v2_v3_freetext.py` (free-text,
all sub-domains) rank the corpus with the original v2 scorer vs the corrected v3 scorer and report
Recall@N / nDCG / hit@1 against the real sub-domain labels.

## Notes
- Embedding model **must match** for papers and problems (bge-base-en-v1.5, 768-dim).
- `.env` is gitignored — never commit your DB password or OpenAI key.
- `explain=true` makes one OpenAI call per request (latency + cost); set `explain=false` to skip it.
- Supabase RPC alternative (saved problems, no server): `POST {SUPABASE_URL}/rest/v1/rpc/match_papers_by_problem`. See `docs/INTEGRATION.md`.
