# Matchmaking — Integration Guide (for the platform/dev team)

Two ways to call matchmaking. Use whichever fits.

---

## Option A — Supabase RPC (no extra service; auto-served by the Data API)
Works for **registered problems** (embedding already stored). Pure DB call.

`POST {SUPABASE_URL}/rest/v1/rpc/match_papers_by_problem`
headers: `apikey: <anon-key>`, `Authorization: Bearer <anon-key>`, `Content-Type: application/json`
```json
{ "p_problem_ref": "PROB-NT-02", "p_top_n": 10 }
```
Response:
```json
[ { "seed_ref":"RE-09","title":"Modeling Membrane Degradation...","sub_domain":"green_hydrogen_electrolysers","cosine":0.680,"citation_count":0 } ]
```
For an ad-hoc query vector: `rpc/match_papers_by_vector` with `{ "p_vec":[...768 floats...], "p_top_n":10 }` (you must embed the text first — use Option B for that).

---

## Option B — Matchmaking API service (FastAPI, port 8004)
Use this for **ad-hoc free-text problems** (it embeds for you) and for the optional "why it fits" explanation.

Run: `uvicorn service.main:app --host 0.0.0.0 --port 8004`

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/health` | — | check |
| GET | `/problems` | — | list registered problems |
| GET | `/companies` | — | list companies |
| POST | `/match` | see below | rank papers for a problem |

`POST /match`
```json
{ "problem_statement": "reduce silver paste cost in solar cells", "top_n": 5, "explain": false }
```
or for a saved problem:
```json
{ "problem_ref": "PROB-NT-02", "top_n": 5, "explain": true }
```
Response:
```json
{
  "problem": "reduce silver paste cost ...",
  "count": 5,
  "matches": [ {"seed_ref":"RE-08","title":"Conductive Paste ...","sub_domain":"solar_pv","cosine":0.806} ],
  "explanations": [ {"seed_ref":"RE-08","why":"Directly addresses front-contact silver reduction ..."} ]
}
```
- `explain:true` adds one-line reasons per paper — **only works if `ANTHROPIC_API_KEY` is set** in the service env (this is the AI-team "why it fits" agent). Without a key, you still get ranked `matches`.

---

## Typical platform flow
```
1. Company logs in (email + password)           → users / company_users
2. Company registers a problem                  → POST problems  (+ embed -> problem_embeddings)
3. Show top-N papers for that problem           → Option A (saved) or B (ad-hoc)
4. Company shortlists / requests NDA            → nda_agreements ...
```

## Config
- Supabase URL + anon key: from the **Data API** page in Supabase.
- The service reads the DB connection from `NRDC/.env` (`DATABASE_URL`).
- Embedding model: `BAAI/bge-base-en-v1.5` (768-dim) — **same model for papers and problems**, always.
