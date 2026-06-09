# NRDC R2C — Final Schema & Status

Single source of truth: the **Master Schema** (31 tables, 7 layers). Live in Supabase project `R2C_data_embeddings`.

## What's built & loaded

| Layer | Tables | Loaded now |
|---|---|---|
| A Research | papers, paper_tree_nodes, paper_derived, **paper_embeddings**, paper_citations, paper_files | 60 papers, 60 embeddings, 60 derived |
| B Authors/IP | institutions, authors, paper_authors, patents, paper_patents | (schema only) |
| C Demand | companies, users, company_users, **problems**, problem_embeddings, problem_tags | 12 companies, 12 users, 9 problems, 9 problem-embeddings |
| D Matching | matches, match_feedback, match_models | match_models: 1 |
| E Transactions | nda_agreements, licensing_deals, deal_milestones, royalty_reports, payments | (schema only — fills as deals run) |
| F Ops | nrdc_officers, escalations, audit_log | (schema only) |
| G Meta | schema_versions, taxonomies, system_jobs | (schema only) |

`discovery_feed` (Master Schema D3) = Redis cache, not a SQL table.

## How matchmaking works
1. A company has **problems** (1 or many). Each is embedded with **bge-base-en-v1.5 (768-dim)** → `problem_embeddings`.
2. Each paper's abstract is embedded → `paper_embeddings`.
3. For a problem, **pgvector** finds the nearest papers (cosine). This is the live query / RPC.
4. (Optional) an LLM re-ranks the top few and writes "why it fits".

## Company logins (test)
12 logins, one per company. **Password for all: `test1234`.**
Emails: `vikramsolar@r2c.test`, `tatasteel@r2c.test`, `newtrace@r2c.test`, `ohmium@r2c.test`, `log9@r2c.test`, `ultratechcement@r2c.test`, `carbonclean@r2c.test`, `carbonstrong@r2c.test`, `mahindra@r2c.test`, `bajajauto@r2c.test`, `detect@r2c.test`, `tatapowersolar@r2c.test`. (role = `company_user`; wireframe calls this `industry`.)

## Files
```
supabase/schema.sql        full 31-table schema
supabase/rpc.sql           match_papers RPC functions
supabase/load.py           load papers+companies+problems+embeddings
supabase/load_users.py     load the 12 company logins
supabase/verify.py         row counts + live match check
service/main.py            matchmaking API (FastAPI, port 8004)
scripts/                   build_*, embed_*, match.py (local tools)
data/                      all source JSON (papers_meta, companies, problems, embeddings, users)
```

## Run
```
python supabase/load.py          # load data        (needs NRDC/.env DATABASE_URL)
python supabase/load_users.py    # load logins
python supabase/verify.py        # confirm
uvicorn service.main:app --port 8004   # the matchmaking API
```

## Data provenance
- Paper facts (title/abstract/year/citations): OpenAlex (37/60 resolved) — real, not invented.
- Paper classification (domain/sub-domain/problem): from the mapping doc (human-authored).
- Company data: parsed from the FramePlan doc (12 companies).
- Missing facts = null, never guessed.

## Not done yet (next)
- patents / NDAs / deals / royalties / payments — schema ready, fill as the licensing workflow runs.
- LLM re-rank + "why it fits" — wired in the API, needs an LLM API key.
- Full PageIndex tree nodes per paper — needs the PDF ingestion pipeline (+ keys).
