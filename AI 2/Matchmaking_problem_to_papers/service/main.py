"""
NRDC R2C — Matchmaking API service.
  embed (bge) -> pgvector top-k (Supabase) -> [optional] LLM re-rank/explain (agents).

Two connection modes (auto-selected at startup):
  • Supabase REST  (default when SUPABASE_URL + SUPABASE_KEY are set) — NO DB password.
       Calls the auto-exposed RPCs match_papers_by_problem / match_papers_by_vector
       over the Data API with the publishable key.
  • Direct Postgres (psycopg2 via DATABASE_URL) — used when REST is not configured.

Run:  pip install fastapi uvicorn sentence-transformers   # psycopg2-binary only for Postgres mode
      uvicorn service.main:app --host 0.0.0.0 --port 8004

Endpoints:
  GET  /health
  GET  /problems                     list registered problems
  GET  /companies                    list companies
  POST /match  {problem_ref|problem_statement, top_n=10, explain=false}
       -> ranked papers (and a short 'why it fits' if explain=true and an LLM key is set)
"""
import os
os.environ.setdefault("USE_TF", "0"); os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
import sys, json

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)                                    # for `import supa`
sys.path.insert(0, os.path.join(HERE, "..", "supabase"))    # for `from load import db_params`


def _load_env():
    """Load ../.env into the process environment (stdlib; no python-dotenv dependency)."""
    envp = os.path.join(HERE, "..", ".env")
    if not os.path.exists(envp):
        return
    for line in open(envp, encoding="utf-8-sig"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import supa

MODEL = "BAAI/bge-base-en-v1.5"
QPREFIX = "Represent this sentence for searching relevant passages: "
SUPA = supa.enabled()

app = FastAPI(title="NRDC R2C Matchmaking API")

_model = None
def model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer  # lazy: heavy import only for free text
        _model = SentenceTransformer(MODEL)
    return _model

def db():
    # Lazy imports so Supabase-REST mode does not require psycopg2.
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from load import db_params   # reuse the .env parser
    return psycopg2.connect(**db_params(), cursor_factory=RealDictCursor)

class MatchReq(BaseModel):
    problem_ref: Optional[str] = None
    problem_statement: Optional[str] = None
    top_n: int = 10
    explain: bool = False

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL, "mode": "supabase-rest" if SUPA else "postgres"}

@app.get("/ping")
def ping():
    return {"pong": True}

@app.get("/problems")
def problems():
    if SUPA:
        return supa.list_problems()
    with db() as c, c.cursor() as cur:
        cur.execute("select problem_ref, company_id, problem_statement, sub_domain from problems order by problem_ref")
        return cur.fetchall()

@app.get("/companies")
def companies():
    if SUPA:
        return supa.list_companies()
    with db() as c, c.cursor() as cur:
        cur.execute("select company_id_local, legal_name, company_tier, domains from companies order by company_id_local")
        return cur.fetchall()

def llm_explain(problem, papers):
    """Optional: uses an LLM if a key is set (the AI-team 'why it fits' agent). Else returns None."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        lst = "\n".join(f"- {p['seed_ref']}: {p['title']}" for p in papers)
        msg = client.messages.create(
            model="claude-opus-4-8", max_tokens=600,
            messages=[{"role": "user", "content":
                f"Company problem: {problem}\n\nCandidate papers:\n{lst}\n\n"
                "For each paper give ONE sentence on why it fits this problem. Return JSON "
                '{"explanations":[{"seed_ref":"..","why":".."}]}.'}])
        txt = msg.content[0].text
        return json.loads(txt[txt.find("{"):txt.rfind("}")+1]).get("explanations")
    except Exception as e:
        return [{"error": str(e)}]

@app.post("/match")
def match(req: MatchReq):
    if not req.problem_ref and not req.problem_statement:
        raise HTTPException(400, "provide problem_ref or problem_statement")

    if SUPA:
        # Supabase REST mode — publishable key, no DB password.
        if req.problem_ref:
            papers = supa.match_by_problem(req.problem_ref, req.top_n)
            problem_text = supa.problem_statement(req.problem_ref) or req.problem_ref
        else:
            vec = model().encode([QPREFIX + req.problem_statement], normalize_embeddings=True)[0].tolist()
            papers = supa.match_by_vector(vec, req.top_n)
            problem_text = req.problem_statement
    else:
        # Direct Postgres mode.
        with db() as c, c.cursor() as cur:
            if req.problem_ref:
                cur.execute("select * from match_papers_by_problem(%s, %s)", (req.problem_ref, req.top_n))
                cur2 = c.cursor()
                cur2.execute("select problem_statement from problems where problem_ref=%s", (req.problem_ref,))
                row = cur2.fetchone(); problem_text = row["problem_statement"] if row else req.problem_ref
            else:
                vec = model().encode([QPREFIX + req.problem_statement], normalize_embeddings=True)[0].tolist()
                cur.execute("select * from match_papers_by_vector(%s::vector, %s)", (vec, req.top_n))
                problem_text = req.problem_statement
            papers = cur.fetchall()

    result = {"problem": problem_text, "count": len(papers), "matches": papers}
    if req.explain:
        result["explanations"] = llm_explain(problem_text, papers)
    return result
