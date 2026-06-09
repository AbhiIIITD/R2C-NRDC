"""
Free-text ranking comparison: v2 vs v3 across ALL papers / sub-domains.

Unlike compare_v2_v3.py (which used the 9 registered problems and their stored
embeddings), this exercises the real bge ENCODER on a battery of hand-written
problem statements -- 3 differently-phrased "relevant" queries per sub-domain,
some in deliberately adjacent/confusable areas. No target_sub_domain is passed,
so this measures PURE free-text semantic ranking (the realistic case where a
user just types a problem).

Gold = real DB labels: papers sharing the query's intended sub_domain (6-8 each).
Both versions rank deterministically (no LLM) -> fully reproducible.

Metrics per query (N = #gold for that sub-domain):
  Recall@N   fraction of the N gold papers that land in the top N
  P@5        fraction of top-5 in the right sub-domain
  nDCG@N     binary-relevance nDCG over the top N
  hit@1      is the #1 result in the right sub-domain?
Aggregate also reports how often #1 == the highest-cosine candidate.

Run:  python scripts/compare_v2_v3_freetext.py
"""
import os
import sys
import math
import importlib.util

HERE = os.path.dirname(__file__)
SERVICE = os.path.join(HERE, "..", "service")
sys.path.insert(0, os.path.join(HERE, "..", "supabase"))

import psycopg2
from psycopg2.extras import RealDictCursor
from load import db_params


def load_mod(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


v2 = load_mod("main_v2", os.path.join(SERVICE, "main_v2.py"))
v3 = load_mod("main_v3", os.path.join(SERVICE, "main.py"))

# 3 differently-phrased relevant queries per sub-domain (none copied from stored text).
QUERIES = {
    "geopolymer_cement": [
        "Fly ash and GGBS geopolymer concrete as a Portland cement alternative",
        "Predict the compressive strength of alkali-activated geopolymer concrete mixes",
        "Residual mechanical properties of geopolymer concrete after fire exposure",
    ],
    "carbon_capture_cement": [
        "Capture CO2 from cement plant flue gas using amine solvents",
        "Post-combustion carbon capture and storage for clinker production",
        "Solvent-based CO2 absorption integrated into cement manufacturing",
    ],
    "building_tech_lca": [
        "Life cycle assessment of low-carbon building materials",
        "Reduce embodied carbon in construction with supplementary cementitious materials",
        "Environmental impact of recycled aggregates in concrete",
    ],
    "green_steel_h2": [
        "Hydrogen direct reduction of iron ore for low-carbon steel",
        "Qualify hydrogen-compatible steel pipelines against embrittlement",
        "Decarbonise steel production by replacing coke with green hydrogen",
    ],
    "industrial_iot_predictive_maintenance": [
        "Predict machine failures in factories using IoT sensors and machine learning",
        "Anomaly detection on industrial equipment vibration data",
        "Reduce unplanned downtime with AI-driven predictive maintenance",
    ],
    "process_eng_rpb_materials": [
        "CO2 absorption performance of amine solvent blends in a rotating packed bed",
        "Process intensification using high-gravity rotating packed bed reactors",
        "Mass transfer of MEA-based solvent blends for gas absorption",
    ],
    "batteries_storage": [
        "Improve cycle life and safety of lithium-ion batteries for grid storage",
        "Fast-charging degradation of LFP battery cathodes",
        "Thermal performance of graphene-modified battery electrodes",
    ],
    "green_hydrogen_electrolysers": [
        "Extend PEM electrolyzer stack lifetime under fluctuating renewable power",
        "Low-cost catalyst-coated membranes for green hydrogen electrolysis",
        "Seawater electrolysis for hydrogen production without freshwater",
    ],
    "solar_pv": [
        "Improve the efficiency of bifacial TOPCon silicon solar cells",
        "Perovskite-silicon tandem solar cell manufacturing",
        "Reduce the levelized cost of energy for utility-scale solar PV",
    ],
}


def gold_map(cur):
    cur.execute("select seed_ref, research_domain->>'sub_domain' sd from papers")
    by_sd = {}
    for r in cur.fetchall():
        by_sd.setdefault(r["sd"], set()).add(r["seed_ref"])
    return by_sd


def candidates_for_vec(cur, vec, pool=60):
    cur.execute("select * from match_papers_by_vector(%s::vector, %s)", (vec, pool))
    return [dict(r) for r in cur.fetchall()]


def rank_with(mod, conn, rows, sub_domain=None):
    rows = [dict(r) for r in rows]
    rows = mod.enrich_paper_metadata(conn, rows)
    return mod.score_candidates(rows, sub_domain)


def ndcg_at(ranked, gold, n):
    dcg = sum((1.0 if ranked[i]["seed_ref"] in gold else 0.0) / math.log2(i + 2)
              for i in range(min(n, len(ranked))))
    idcg = sum(1.0 / math.log2(i + 2) for i in range(n))
    return dcg / idcg if idcg else 0.0


def evaluate(ranked, gold):
    n = len(gold)
    topn = ranked[:n]
    recall_n = sum(1 for p in topn if p["seed_ref"] in gold) / n
    p5 = sum(1 for p in ranked[:5] if p["seed_ref"] in gold) / 5
    hit1 = 1 if ranked[0]["seed_ref"] in gold else 0
    return recall_n, p5, ndcg_at(ranked, gold, n), hit1


def main():
    model = v3.model()  # shared bge encoder
    conn = psycopg2.connect(**db_params(), cursor_factory=RealDictCursor)
    cur = conn.cursor()
    gold_by_sd = gold_map(cur)

    print("=" * 100)
    print("FREE-TEXT ranking: v2 vs v3, no domain hint (pure semantic).  "
          "27 queries over 9 sub-domains")
    print("gold = papers in the query's sub-domain (N).  Recall@N / nDCG@N / hit@1")
    print("=" * 100)
    print(f"{'sub-domain':30s} {'query':46s} | {'v2 R@N':>6s} {'v3 R@N':>6s} | "
          f"{'v2 nDCG':>7s} {'v3 nDCG':>7s} | {'v2 h1':>5s} {'v3 h1':>5s}")

    agg = {"v2": [0, 0, 0, 0], "v3": [0, 0, 0, 0]}
    maxcos = {"v2": 0, "v3": 0}
    nq = 0
    for sd, queries in QUERIES.items():
        gold = gold_by_sd[sd]
        for q in queries:
            nq += 1
            vec = model.encode([v3.QPREFIX + q], normalize_embeddings=True)[0].tolist()
            cands = candidates_for_vec(cur, vec)
            maxref = max(cands, key=lambda c: float(c.get("cosine") or 0))["seed_ref"]
            r2 = rank_with(v2, conn, cands, None)
            r3 = rank_with(v3, conn, cands, None)
            e2, e3 = evaluate(r2, gold), evaluate(r3, gold)
            maxcos["v2"] += int(r2[0]["seed_ref"] == maxref)
            maxcos["v3"] += int(r3[0]["seed_ref"] == maxref)
            for i in range(4):
                agg["v2"][i] += e2[i]
                agg["v3"][i] += e3[i]
            print(f"{sd[:30]:30s} {q[:46]:46s} | "
                  f"{e2[0]:>6.2f} {e3[0]:>6.2f} | {e2[2]:>7.3f} {e3[2]:>7.3f} | "
                  f"{e2[3]:>5d} {e3[3]:>5d}")
    print("-" * 100)
    a2, a3 = agg["v2"], agg["v3"]
    print(f"{'MEAN / RATE':77s} | {a2[0]/nq:>6.2f} {a3[0]/nq:>6.2f} | "
          f"{a2[2]/nq:>7.3f} {a3[2]/nq:>7.3f} | {a2[3]/nq*100:>4.0f}% {a3[3]/nq*100:>4.0f}%")
    print(f"\nAcross {nq} queries:")
    print(f"  hit@1 (top result in correct sub-domain) : v2 {a2[3]:.0f}/{nq}   v3 {a3[3]:.0f}/{nq}")
    print(f"  mean Recall@N (gold cluster in top N)     : v2 {a2[0]/nq:.3f}    v3 {a3[0]/nq:.3f}")
    print(f"  mean P@5                                  : v2 {a2[1]/nq:.3f}    v3 {a3[1]/nq:.3f}")
    print(f"  #1 == highest-cosine candidate            : v2 {maxcos['v2']}/{nq}   v3 {maxcos['v3']}/{nq}")
    conn.close()


if __name__ == "__main__":
    main()
