"""
NRDC R2C matchmaking API service.

Flow:
  problem text -> bge embedding -> pgvector cosine candidates -> scoring layer
  -> optional OpenAI LLM confidence/reason/suggestion layer.

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
from math import log
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

SCORING_VERSION = "scoring-v2.0"
SCORE_WEIGHTS = {
    "semantic": 0.55,
    "subdomain": 0.20,
    "citation": 0.10,
    "recency": 0.10,
    "indian_source": 0.05,
}

DEFAULT_OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.5")


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
    explain: bool = False


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


def recency_score(year):
    if not year:
        return 0.5
    return clamp((int(year) - 2015) / 10)


def confidence_band(score):
    if score >= 0.75:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def rank_reason(row, target_sub_domain):
    reasons = []
    semantic = row["metrics"]["semantic"]
    if semantic >= 0.70:
        reasons.append("strong semantic fit")
    elif semantic >= 0.55:
        reasons.append("moderate semantic fit")
    else:
        reasons.append("weak semantic fit")

    if target_sub_domain and row.get("sub_domain") == target_sub_domain:
        reasons.append("same sub-domain")
    elif target_sub_domain:
        reasons.append("different sub-domain")

    if row.get("citation_count"):
        reasons.append(f"{row['citation_count']} citations")
    if row.get("published_year"):
        reasons.append(f"published {row['published_year']}")
    return ", ".join(reasons)


def enrich_paper_metadata(conn, papers):
    """Add non-vector scoring signals. Missing values stay neutral."""
    refs = [p["seed_ref"] for p in papers if p.get("seed_ref")]
    if not refs:
        return papers

    with conn.cursor() as cur:
        cur.execute(
            """
            select p.seed_ref,
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
    max_cites = max([as_float(p.get("citation_count")) for p in papers] + [0])
    scored = []

    for paper in papers:
        semantic = clamp(as_float(paper.get("cosine")))
        subdomain = 0.5
        if target_sub_domain:
            subdomain = 1.0 if paper.get("sub_domain") == target_sub_domain else 0.0

        citation = 0.5
        if max_cites > 0:
            citation = clamp(log(as_float(paper.get("citation_count")) + 1) / log(max_cites + 1))

        recency = recency_score(paper.get("published_year"))
        indian = 1.0 if paper.get("indian_source_bonus") else 0.0

        metrics = {
            "semantic": round(semantic, 3),
            "subdomain": round(subdomain, 3),
            "citation": round(citation, 3),
            "recency": round(recency, 3),
            "indian_source": round(indian, 3),
        }
        final_score = sum(metrics[name] * SCORE_WEIGHTS[name] for name in SCORE_WEIGHTS)

        row = dict(paper)
        row["metrics"] = metrics
        row["final_score"] = round(final_score, 3)
        row["confidence_band"] = confidence_band(row["final_score"])
        row["rank_reason"] = rank_reason(row, target_sub_domain)
        row["score_matrix"] = {
            "version": SCORING_VERSION,
            "weights": SCORE_WEIGHTS,
            "metrics": metrics,
            "final_score": row["final_score"],
            "confidence_band": row["confidence_band"],
        }
        scored.append(row)

    scored.sort(key=lambda x: (x["final_score"], as_float(x.get("cosine"))), reverse=True)
    for idx, row in enumerate(scored, 1):
        row["rank"] = idx
    return scored


def openai_score_layer(problem, papers):
    """
    Optional LLM layer that produces user-facing suggestions and confidence.
    The transparent score matrix remains the fallback and source of truth.
    """
    if not os.environ.get("OPENAI_API_KEY"):
        return None

    try:
        from openai import OpenAI

        client = OpenAI()
        candidate_lines = "\n".join(
            f"- {p['seed_ref']}: {p['title']} | cosine={p.get('cosine'):.3f} | "
            f"matrix_score={p.get('final_score'):.3f} | sub_domain={p.get('sub_domain')} | "
            f"rank_reason={p.get('rank_reason')} | citation_count={p.get('citation_count', 0)} | "
            f"published_year={p.get('published_year', 'N/A')}"
            for p in papers
        )
        prompt = (
            "You are the second scoring layer for a research-to-commercialisation matcher.\n"
            "Do not invent facts. Use the cosine score and score matrix as evidence.\n"
            "Return only JSON with this exact shape:\n"
            "{"
            '"suggestion":"short summary for the user",'
            '"rank_adjustments":[{'
            '"seed_ref":"paper id",'
            '"llm_confidence":0.0,'
            '"relevance_score":0.0,'
            '"novelty_score":0.0,'
            '"feasibility_score":0.0,'
            '"why":"one sentence reason",'
            '"risk":"one short caveat",'
            '"next_step":"one concrete action"'
            "}]"
            "}\n\n"
            "Scoring guidelines (0.0 to 1.0):\n"
            "- llm_confidence: Overall confidence this paper solves the problem\n"
            "- relevance_score: How directly the paper addresses the problem statement\n"
            "- novelty_score: How innovative/unique the approach is\n"
            "- feasibility_score: How practical/ready for commercialization the solution is\n\n"
            f"Company problem: {problem}\n\n"
            f"Candidate papers:\n{candidate_lines}"
        )

        response = client.chat.completions.create(
            model=DEFAULT_OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Return valid JSON only. Score all metrics from 0 to 1.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        result = json.loads(response.choices[0].message.content)
        
        # Validate response structure
        if not isinstance(result, dict):
            return {"error": "Invalid response: not a dictionary"}
        if "rank_adjustments" not in result:
            return {"error": "Invalid response: missing rank_adjustments"}
        if not isinstance(result["rank_adjustments"], list):
            return {"error": "Invalid response: rank_adjustments not a list"}
        
        # Validate each adjustment
        for adj in result["rank_adjustments"]:
            if not isinstance(adj, dict):
                return {"error": "Invalid adjustment: not a dictionary"}
            required = ["seed_ref", "llm_confidence", "relevance_score", "novelty_score", "feasibility_score", "why", "risk", "next_step"]
            for field in required:
                if field not in adj:
                    return {"error": f"Invalid adjustment: missing {field}"}
            # Ensure scores are numeric
            for score_field in ["llm_confidence", "relevance_score", "novelty_score", "feasibility_score"]:
                try:
                    adj[score_field] = float(adj[score_field])
                    adj[score_field] = clamp(adj[score_field], 0.0, 1.0)
                except (ValueError, TypeError):
                    return {"error": f"Invalid {score_field}: must be numeric"}
        
        return result
    except json.JSONDecodeError as exc:
        return {"error": f"JSON parse error: {str(exc)}"}
    except Exception as exc:
        return {"error": str(exc)}


def merge_llm_scores(papers, llm_result):
    if not llm_result or llm_result.get("error"):
        return papers

    by_ref = {row.get("seed_ref"): row for row in llm_result.get("rank_adjustments", [])}
    for paper in papers:
        llm_row = by_ref.get(paper.get("seed_ref"))
        if not llm_row:
            continue

        llm_confidence = clamp(as_float(llm_row.get("llm_confidence"), paper["final_score"]))
        relevance = clamp(as_float(llm_row.get("relevance_score"), 0.5))
        novelty = clamp(as_float(llm_row.get("novelty_score"), 0.5))
        feasibility = clamp(as_float(llm_row.get("feasibility_score"), 0.5))
        
        # Calculate composite LLM score from detailed metrics
        llm_composite = (0.4 * relevance) + (0.3 * novelty) + (0.3 * feasibility)
        
        paper["llm"] = {
            "llm_confidence": round(llm_confidence, 3),
            "relevance_score": round(relevance, 3),
            "novelty_score": round(novelty, 3),
            "feasibility_score": round(feasibility, 3),
            "why": llm_row.get("why", ""),
            "risk": llm_row.get("risk", ""),
            "next_step": llm_row.get("next_step", ""),
        }
        paper["llm_confidence"] = round(llm_confidence, 3)

        # Keep deterministic scoring dominant; LLM adjusts confidence, not raw retrieval truth.
        # Blend: 70% deterministic score + 30% LLM composite score
        paper["final_score"] = round((0.70 * paper["final_score"]) + (0.30 * llm_composite), 3)
        paper["confidence_band"] = confidence_band(paper["final_score"])
        paper["score_matrix"]["final_score"] = paper["final_score"]
        paper["score_matrix"]["confidence_band"] = paper["confidence_band"]
        paper["score_matrix"]["llm_confidence"] = paper["llm_confidence"]
        paper["score_matrix"]["llm_metrics"] = {
            "relevance": round(relevance, 3),
            "novelty": round(novelty, 3),
            "feasibility": round(feasibility, 3),
            "composite": round(llm_composite, 3),
        }

    papers.sort(key=lambda x: (x["final_score"], as_float(x.get("cosine"))), reverse=True)
    for idx, row in enumerate(papers, 1):
        row["rank"] = idx
    return papers


@app.post("/match")
def match(req: MatchReq):
    if not req.problem_ref and not req.problem_statement:
        raise HTTPException(400, "provide problem_ref or problem_statement")
    if req.problem_ref and req.problem_statement:
        raise HTTPException(400, "provide only one of problem_ref or problem_statement")

    top_n = max(1, min(req.top_n, 50))
    candidate_pool = req.candidate_pool or max(top_n * 3, top_n + 10)
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
    llm_result = openai_score_layer(problem_text, scored[:top_n]) if req.explain else None

    if llm_result and not llm_result.get("error"):
        scored = merge_llm_scores(scored, llm_result)

    result = {
        "problem": problem_text,
        "target_sub_domain": target_sub_domain,
        "count": min(len(scored), top_n),
        "candidate_pool": len(scored),
        "scoring": {
            "version": SCORING_VERSION,
            "weights": SCORE_WEIGHTS,
            "llm_provider": "openai",
            "llm_model": DEFAULT_OPENAI_MODEL,
            "llm_requested": req.explain,
            "llm_applied": bool(llm_result and not llm_result.get("error")),
        },
        "matches": scored[:top_n],
    }

    if req.explain:
        result["suggestion"] = llm_result.get("suggestion") if llm_result else None
        if llm_result and llm_result.get("error"):
            result["llm_error"] = llm_result["error"]

    return result
