# NRDC R2C — Matchmaking

Match a company's **problem statement** to the most relevant **research papers**, using vector
embeddings (bge-base-en-v1.5) + pgvector in Supabase. Goal: automate research-to-commercialisation
(Quick License + Patent Buyout).

## What's here
```
service/        Matchmaking API (FastAPI)  — the thing you run/test
supabase/       schema.sql, rpc.sql, loaders (build the DB)
scripts/        data builders + local match.py (no server)
data/           source JSON (papers, companies, problems, embeddings, users)
docs/           FINAL_SCHEMA.md · INTEGRATION.md · COMPANY_REGISTRATION_FIELDS.md
```

## Test matchmaking locally (no deployment)
The service runs on your machine and reads data/embeddings from Supabase (cloud).

```bash
pip install -r requirements.txt
cp .env.example .env            # then paste your Supabase Session-pooler URL
uvicorn service.main:app --port 8004
```
Open **http://localhost:8004/docs** → try `POST /match`:
```json
{ "problem_statement": "reduce silver paste cost in solar cells", "top_n": 5 }
```
or a saved problem: `{ "problem_ref": "PROB-NT-02", "top_n": 5 }`.

> ⚠️ Pass **only one** of `problem_ref` / `problem_statement` (the Swagger default fills both with `"string"` — delete the one you're not using).

**Ready-made test cases:** see [docs/TEST_CASES.md](docs/TEST_CASES.md).

## Two ways the platform calls matchmaking
- **Supabase RPC** (saved problems, no server): `POST {SUPABASE_URL}/rest/v1/rpc/match_papers_by_problem`
- **This service** (free-text + AI "why it fits"): `POST :8004/match`

See `docs/INTEGRATION.md` for the full contract.

## Rebuild the DB from scratch (optional)
```bash
python supabase/load.py          # papers + companies + problems + embeddings
python supabase/load_users.py    # 12 company logins (password: test1234)
# apply supabase/rpc.sql once (SQL editor or psql)
python supabase/verify.py        # confirm
```

## Notes
- Embedding model **must be the same** for papers and problems (bge-base-en-v1.5, 768-dim).
- `.env` is gitignored — never commit your DB password.
- Test logins: `<company>@r2c.test`, password `test1234` (see docs/FINAL_SCHEMA.md).
