"""
NRDC R2C matchmaking API service.

POC build (60 static papers):
  problem text -> bge embedding -> pgvector cosine over the whole small corpus
  -> calibrated deterministic scoring (semantic + soft sub-domain)
  -> optional grounded LLM relevance judge (reads abstracts, can abstain).

Design notes for the POC scale (~60 papers):
  * Recall is a non-problem at this size, so we score the whole pool — no
    retrieval ceiling games.
  * Cosine is min-max calibrated within the pool so the dominant semantic
    signal keeps dynamic range instead of going flat (~0.55-0.80 band).
  * Sub-domain is a *soft* graded signal, not a hard 1/0 gate, so adjacent
    domain (the point of tech-transfer) is not zeroed out.
  * Ranking is driven by relevance only. The LLM judges from the abstract,
    must cite an evidence span, and can abstain. novelty / feasibility are
    surfaced as decision-support fields, NOT folded into the rank.

Run:
  pip install -r requirements.txt
  uvicorn service.main:app --host 0.0.0.0 --port 8004

Endpoints:
  GET  /health
  GET  /problems
  GET  /companies
  POST /match
"""
import json
import os
import sys
from typing import Optional

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "supabase"))

import psycopg2
from fastapi import FastAPI, HTTPException
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from load import db_params


def load_local_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8-sig") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()


MODEL = "BAAI/bge-base-en-v1.5"
QPREFIX = "Represent this sentence for searching relevant passages: "

# POC corpus is small + hand-curated, so we keep the deterministic layer lean:
# semantic relevance plus a soft sub-domain nudge. Citation/recency are noisy at
# this scale (pool-relative, time-biased) and are surfaced as raw fields instead
# of weighted into the score. indian_source is a business signal used only as a
# deterministic tiebreak.
SCORING_VERSION = "scoring-v3.0-poc"
SCORE_WEIGHTS = {
    "semantic": 0.75,
    "subdomain": 0.25,
}

# The user confirms gpt-5.5 is a valid model; override via OPENAI_MODEL if needed.
DEFAULT_OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.5")

# How much LLM blends into the deterministic relevance. Deterministic stays
# dominant so the LLM nudges, never overrides, the retrieval truth.
LLM_BLEND = 0.30


app = FastAPI(title="NRDC R2C Matchmaking API")
_model = None


def model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL)
    return _model


def db():
    params = db_params()
    if not params:
        raise HTTPException(500, "DATABASE_URL is not configured")
    return psycopg2.connect(**params, cursor_factory=RealDictCursor)


class MatchReq(BaseModel):
    problem_ref: Optional[str] = None
    problem_statement: Optional[str] = None
    target_sub_domain: Optional[str] = None
    top_n: int = 10
    candidate_pool: Optional[int] = None
    explain: bool = True   # default ON: include the LLM "why it fits" layer


@app.get("/health")
def health():
    return {
        "status": "ok",
        "embedding_model": MODEL,
        "scoring_version": SCORING_VERSION,
        "llm_provider": "openai",
        "llm_model": DEFAULT_OPENAI_MODEL,
        "openai_key_configured": bool(os.environ.get("OPENAI_API_KEY")),
    }


@app.get("/problems")
def problems():
    with db() as c, c.cursor() as cur:
        cur.execute(
            "select problem_ref, company_id, problem_statement, sub_domain "
            "from problems order by problem_ref"
        )
        return cur.fetchall()


@app.get("/companies")
def companies():
    with db() as c, c.cursor() as cur:
        cur.execute(
            "select company_id_local, legal_name, company_tier, domains "
            "from companies order by company_id_local"
        )
        return cur.fetchall()


def clamp(value, lo=0.0, hi=1.0):
    return max(lo, min(hi, value))


def as_float(value, default=0.0):
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def confidence_band(score):
    if score >= 0.75:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def _domain_tokens(value):
    if not value:
        return set()
    cleaned = str(value).lower().replace("-", " ").replace("_", " ").replace("/", " ")
    return {tok for tok in cleaned.split() if tok}


def subdomain_score(paper_sub_domain, target_sub_domain):
    """Soft, graded sub-domain match. Returns None when there's nothing to
    compare against, so the signal is *excluded* from the weighted average
    rather than injected as a misleading 0.5 neutral."""
    if not target_sub_domain or not paper_sub_domain:
        return None
    a, b = _domain_tokens(paper_sub_domain), _domain_tokens(target_sub_domain)
    if not a or not b:
        return None
    if a == b:
        return 1.0
    # Jaccard token overlap -> adjacent domains score partial credit instead of 0.
    return round(len(a & b) / len(a | b), 3)


def weighted_score(signals):
    """Weighted average over only the signals that are actually present.
    A missing signal drops out and the remaining weights renormalise, so
    absence of data never inflates (or deflates) a paper's score."""
    num = den = 0.0
    for name, weight in SCORE_WEIGHTS.items():
        value = signals.get(name)
        if value is None:
            continue
        num += value * weight
        den += weight
    return round(num / den, 3) if den > 0 else 0.0


def rank_reason(row, target_sub_domain):
    reasons = []
    semantic = row["metrics"]["semantic_calibrated"]
    if semantic >= 0.70:
        reasons.append("strong semantic fit")
    elif semantic >= 0.45:
        reasons.append("moderate semantic fit")
    else:
        reasons.append("weak semantic fit")

    sub = row["metrics"].get("subdomain")
    if target_sub_domain and sub is not None:
        if sub >= 0.99:
            reasons.append("same sub-domain")
        elif sub > 0:
            reasons.append("adjacent sub-domain")
        else:
            reasons.append("different sub-domain")

    if row.get("citation_count"):
        reasons.append(f"{row['citation_count']} citations")
    if row.get("published_year"):
        reasons.append(f"published {row['published_year']}")
    return ", ".join(reasons)


def paper_grounding(paper):
    """Real text to ground the LLM on, with provenance. NEVER fabricated:
    the full abstract if we have one, else the curated one-line
    problem_statement from the mapping-doc ingestion. Empty -> the model is
    expected to abstain (insufficient_evidence)."""
    abstract = (paper.get("abstract") or "").strip()
    if abstract:
        return abstract, "abstract"
    problem_statement = (paper.get("problem_statement") or "").strip()
    if problem_statement:
        return problem_statement, "problem_statement"
    return "", "none"


def enrich_paper_metadata(conn, papers):
    """Add non-vector fields (incl. abstract for LLM grounding). Missing
    values stay absent rather than defaulting to a misleading neutral."""
    refs = [p["seed_ref"] for p in papers if p.get("seed_ref")]
    if not refs:
        return papers

    with conn.cursor() as cur:
        cur.execute(
            """
            select p.seed_ref,
                   p.abstract,
                   p.research_domain->>'problem_statement' as problem_statement,
                   p.published_year,
                   p.research_domain->>'primary_domain' as domain,
                   p.research_domain->>'sub_domain' as sub_domain,
                   pd.citation_count,
                   coalesce(pd.indian_source_bonus, 0) as indian_source_bonus
            from papers p
            left join paper_derived pd on pd.paper_id = p.paper_id
            where p.seed_ref = any(%s)
            """,
            (refs,),
        )
        by_ref = {r["seed_ref"]: r for r in cur.fetchall()}

    for paper in papers:
        paper.update(
            {k: v for k, v in by_ref.get(paper.get("seed_ref"), {}).items() if v is not None}
        )
    return papers


def score_candidates(papers, target_sub_domain=None):
    """Deterministic relevance over the whole (small) pool.
    Semantic cosine is min-max calibrated within the pool so the dominant
    signal keeps dynamic range instead of collapsing into a flat band."""
    cosines = [as_float(p.get("cosine")) for p in papers]
    lo, hi = (min(cosines), max(cosines)) if cosines else (0.0, 0.0)

    scored = []
    for paper in papers:
        raw_cosine = as_float(paper.get("cosine"))
        if hi > lo:
            semantic = clamp((raw_cosine - lo) / (hi - lo))
        else:
            semantic = clamp(raw_cosine)

        sub = subdomain_score(paper.get("sub_domain"), target_sub_domain)
        indian = 1.0 if paper.get("indian_source_bonus") else 0.0

        signals = {"semantic": round(semantic, 3)}
        if sub is not None:
            signals["subdomain"] = sub
        final_score = weighted_score(signals)

        metrics = {
            "semantic_calibrated": round(semantic, 3),
            "semantic_cosine_raw": round(raw_cosine, 3),
            "subdomain": sub,            # None when no target to compare
            "indian_source": indian,     # tiebreak only, not weighted
        }

        row = dict(paper)
        row["metrics"] = metrics
        row["final_score"] = final_score
        row["confidence_band"] = confidence_band(final_score)
        row["rank_reason"] = rank_reason(row, target_sub_domain)
        row["score_matrix"] = {
            "version": SCORING_VERSION,
            "weights": SCORE_WEIGHTS,
            "metrics": metrics,
            "final_score": final_score,
            "confidence_band": row["confidence_band"],
        }
        scored.append(row)

    _rank(scored)
    return scored


def _rank(rows):
    """Single ordering used everywhere: score, then Indian-source tiebreak,
    then raw cosine. Keeps every comparison on one scale."""
    rows.sort(
        key=lambda x: (
            x["final_score"],
            x["metrics"].get("indian_source", 0),
            as_float(x.get("cosine")),
        ),
        reverse=True,
    )
    for idx, row in enumerate(rows, 1):
        row["rank"] = idx
    return rows


def openai_score_layer(problem, papers):
    """Grounded relevance judge. Reads each abstract, must cite an evidence
    span, and may abstain via insufficient_evidence. Cosine / matrix scores
    are deliberately NOT shown to avoid anchoring the model to the
    deterministic order. The score matrix remains the source of truth."""
    if not os.environ.get("OPENAI_API_KEY"):
        return None

    def trim(text, n=600):
        text = (text or "").strip().replace("\n", " ")
        return text[:n] + ("…" if len(text) > n else "")

    try:
        from openai import OpenAI

        client = OpenAI()
        candidate_blocks = []
        for p in papers:
            text, src = paper_grounding(p)
            p["grounding_source"] = src  # surfaced in output for transparency
            candidate_blocks.append(
                f"[{p['seed_ref']}] {p.get('title')}\n"
                f"sub_domain: {p.get('sub_domain')}\n"
                f"text ({src}): {trim(text)}"
            )
        candidate_lines = "\n\n".join(candidate_blocks)
        prompt = (
            "You are a research-to-commercialisation relevance judge.\n"
            "Judge ONLY from the provided text for each paper (a full abstract, or "
            "a short curated summary). Do not use outside knowledge and do not "
            "invent facts. If the text is missing or too thin to judge, set "
            "\"insufficient_evidence\": true and use 0.0 scores.\n\n"
            "Return ONLY JSON of this exact shape:\n"
            "{"
            '"suggestion":"one short sentence for the user",'
            '"rank_adjustments":[{'
            '"seed_ref":"paper id",'
            '"relevance_score":0.0,'
            '"novelty_score":0.0,'
            '"feasibility_score":0.0,'
            '"insufficient_evidence":false,'
            '"evidence":"<=20-word quote from the provided text justifying relevance",'
            '"why":"one sentence reason",'
            '"risk":"one short caveat",'
            '"next_step":"one concrete action"'
            "}]"
            "}\n\n"
            "Scoring (0.0-1.0):\n"
            "- relevance_score: how directly the abstract addresses the problem "
            "(THIS drives ranking)\n"
            "- novelty_score: how innovative the approach reads (display only)\n"
            "- feasibility_score: how commercialisation-ready it reads (display only)\n\n"
            f"Company problem:\n{problem}\n\n"
            f"Candidate papers:\n{candidate_lines}"
        )

        response = client.chat.completions.create(
            model=DEFAULT_OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Return valid JSON only. Judge strictly from the provided abstracts.",
                },
                {"role": "user", "content": prompt},
            ],
            seed=7,
        )
        result = json.loads(response.choices[0].message.content)

        if not isinstance(result, dict):
            return {"error": "Invalid response: not a dictionary"}
        if not isinstance(result.get("rank_adjustments"), list):
            return {"error": "Invalid response: missing or non-list rank_adjustments"}

        # Lenient per-row coercion: a malformed row degrades to neutral/abstain
        # instead of throwing the entire LLM signal away.
        for adj in result["rank_adjustments"]:
            if not isinstance(adj, dict) or "seed_ref" not in adj:
                continue
            for field in ("relevance_score", "novelty_score", "feasibility_score"):
                adj[field] = clamp(as_float(adj.get(field), 0.0))
            adj["insufficient_evidence"] = bool(adj.get("insufficient_evidence", False))
        return result
    except json.JSONDecodeError as exc:
        return {"error": f"JSON parse error: {exc}"}
    except Exception as exc:
        return {"error": str(exc)}


def merge_llm_scores(papers, llm_result):
    """Blend the LLM's *relevance* into the deterministic score (relevance
    only — novelty/feasibility are display fields, never ranked on). Every
    paper in the set is blended on the same scale: when the LLM has no row or
    abstains, relevance falls back to the deterministic score so the blend is
    a no-op and scales never mix."""
    if not llm_result or llm_result.get("error"):
        return papers

    by_ref = {row.get("seed_ref"): row for row in llm_result.get("rank_adjustments", [])}
    for paper in papers:
        det = paper["final_score"]
        llm_row = by_ref.get(paper.get("seed_ref"))

        if llm_row and not llm_row.get("insufficient_evidence"):
            relevance = clamp(as_float(llm_row.get("relevance_score"), det))
        else:
            relevance = det  # abstained / missing -> no-op blend

        paper["final_score"] = round((1 - LLM_BLEND) * det + LLM_BLEND * relevance, 3)
        paper["confidence_band"] = confidence_band(paper["final_score"])
        paper["score_matrix"]["final_score"] = paper["final_score"]
        paper["score_matrix"]["confidence_band"] = paper["confidence_band"]

        if llm_row:
            paper["llm"] = {
                "relevance_score": round(clamp(as_float(llm_row.get("relevance_score"))), 3),
                "novelty_score": round(clamp(as_float(llm_row.get("novelty_score"))), 3),
                "feasibility_score": round(clamp(as_float(llm_row.get("feasibility_score"))), 3),
                "insufficient_evidence": bool(llm_row.get("insufficient_evidence", False)),
                "evidence": llm_row.get("evidence", ""),
                "why": llm_row.get("why", ""),
                "risk": llm_row.get("risk", ""),
                "next_step": llm_row.get("next_step", ""),
            }
            paper["score_matrix"]["llm_relevance"] = paper["llm"]["relevance_score"]

    _rank(papers)
    return papers


@app.post("/match")
def match(req: MatchReq):
    if not req.problem_ref and not req.problem_statement:
        raise HTTPException(400, "provide problem_ref or problem_statement")
    if req.problem_ref and req.problem_statement:
        raise HTTPException(400, "provide only one of problem_ref or problem_statement")

    top_n = max(1, min(req.top_n, 50))
    # POC: tiny static corpus -> score the whole pool, no recall games.
    candidate_pool = req.candidate_pool or 60
    candidate_pool = max(top_n, min(candidate_pool, 60))
    target_sub_domain = req.target_sub_domain

    with db() as conn, conn.cursor() as cur:
        if req.problem_ref:
            cur.execute(
                "select * from match_papers_by_problem(%s, %s)",
                (req.problem_ref, candidate_pool),
            )
            cur2 = conn.cursor()
            cur2.execute(
                "select problem_statement, sub_domain from problems where problem_ref=%s",
                (req.problem_ref,),
            )
            problem_row = cur2.fetchone()
            problem_text = problem_row["problem_statement"] if problem_row else req.problem_ref
            target_sub_domain = target_sub_domain or (
                problem_row["sub_domain"] if problem_row else None
            )
        else:
            vec = model().encode(
                [QPREFIX + req.problem_statement], normalize_embeddings=True
            )[0].tolist()
            cur.execute(
                "select * from match_papers_by_vector(%s::vector, %s)",
                (vec, candidate_pool),
            )
            problem_text = req.problem_statement

        papers = enrich_paper_metadata(conn, cur.fetchall())

    scored = score_candidates(papers, target_sub_domain)

    # The LLM judges exactly the set we will display (plus a little headroom),
    # and ranking is then taken from that blended set only — so every shown
    # paper is on one consistent scale (no blended-vs-deterministic co-sort).
    ranked = scored
    llm_result = None
    llm_applied = False
    if req.explain:
        llm_set = scored[: min(len(scored), max(top_n, 15))]
        llm_result = openai_score_layer(problem_text, llm_set)
        if llm_result and not llm_result.get("error"):
            ranked = merge_llm_scores(llm_set, llm_result)
            llm_applied = True

    matches = ranked[:top_n]
    for paper in matches:
        paper.pop("abstract", None)  # keep the payload lean; it was only for grounding

    result = {
        "problem": problem_text,
        "target_sub_domain": target_sub_domain,
        "count": len(matches),
        "candidate_pool": len(scored),
        "scoring": {
            "version": SCORING_VERSION,
            "weights": SCORE_WEIGHTS,
            "llm_provider": "openai",
            "llm_model": DEFAULT_OPENAI_MODEL,
            "llm_blend": LLM_BLEND,
            "llm_requested": req.explain,
            "llm_applied": llm_applied,
        },
        "matches": matches,
    }

    if req.explain:
        result["suggestion"] = llm_result.get("suggestion") if llm_result else None
        if llm_result and llm_result.get("error"):
            result["llm_error"] = llm_result["error"]

    return result
