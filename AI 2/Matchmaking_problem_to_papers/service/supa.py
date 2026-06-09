"""
Supabase REST (PostgREST) client for the matchmaking service.

Lets the service run WITHOUT a Postgres password: it calls the auto-exposed
RPCs `match_papers_by_problem` / `match_papers_by_vector` and reads the
`problems` / `companies` tables over the Data API using the publishable key.

Enabled whenever SUPABASE_URL and SUPABASE_KEY are present in the environment
(loaded from .env by service.main). Uses only the Python standard library.
"""
import os
import json
import urllib.request
import urllib.parse
import urllib.error


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def url() -> str:
    return _env("SUPABASE_URL").rstrip("/")


def key() -> str:
    return _env("SUPABASE_KEY")


def enabled() -> bool:
    return bool(url() and key())


def _headers() -> dict:
    k = key()
    return {
        "apikey": k,
        "Authorization": f"Bearer {k}",
        "Content-Type": "application/json",
    }


def _request(method: str, path: str, payload=None, params=None):
    full = url() + path
    if params:
        full += "?" + urllib.parse.urlencode(params)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(full, data=data, method=method, headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")
        raise RuntimeError(f"Supabase {method} {path} failed ({e.code}): {detail}") from None
    return json.loads(body) if body else None


# ---- RPC: matching ----

def match_by_problem(problem_ref: str, top_n: int = 10):
    """Registered problem (uses the pre-stored embedding). No model needed."""
    return _request("POST", "/rest/v1/rpc/match_papers_by_problem",
                    payload={"p_problem_ref": problem_ref, "p_top_n": top_n})


def match_by_vector(vec, top_n: int = 10):
    """Free text: caller embeds first (bge), then we pgvector-search via RPC."""
    return _request("POST", "/rest/v1/rpc/match_papers_by_vector",
                    payload={"p_vec": list(vec), "p_top_n": top_n})


# ---- Table reads ----

def list_problems():
    return _request("GET", "/rest/v1/problems", params={
        "select": "problem_ref,company_id,problem_statement,sub_domain",
        "order": "problem_ref",
    }) or []


def list_companies():
    return _request("GET", "/rest/v1/companies", params={
        "select": "company_id_local,legal_name,company_tier,domains",
        "order": "company_id_local",
    }) or []


def problem_statement(problem_ref: str):
    rows = _request("GET", "/rest/v1/problems", params={
        "select": "problem_statement",
        "problem_ref": f"eq.{problem_ref}",
        "limit": "1",
    }) or []
    return rows[0]["problem_statement"] if rows else None
