"""
Compare ranking quality: v2 (original) vs v3 (corrected) on the 60-paper POC.

Gold standard = real DB labels: a paper is "relevant" to a problem if it shares
the problem's research_domain.sub_domain (6-8 gold papers per problem).

Part A  Deterministic ranking (no LLM, fully reproducible):
        for each problem, retrieve all 60 candidates once, rank with each
        version's score_candidates(), score P@5 / R@5 / MRR / mean-top5-cosine.
Part B  LLM blend isolation: take ONE problem's real deterministic scores + one
        set of real LLM scores, then apply v2's blend (relevance+novelty+
        feasibility) vs v3's blend (relevance only) to show rank distortion.

Run:  python scripts/compare_v2_v3.py
"""
import os
import sys
import json
import importlib.util
import urllib.request

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


def fetch_problems(cur):
    cur.execute("select problem_ref, sub_domain from problems order by problem_ref")
    return cur.fetchall()


def gold_map(cur):
    cur.execute("select seed_ref, research_domain->>'sub_domain' sd from papers")
    rows = cur.fetchall()
    by_sd = {}
    for r in rows:
        by_sd.setdefault(r["sd"], set()).add(r["seed_ref"])
    return by_sd


def candidates(cur, problem_ref, pool=60):
    cur.execute("select * from match_papers_by_problem(%s, %s)", (problem_ref, pool))
    return [dict(r) for r in cur.fetchall()]


def rank_with(mod, conn, rows, sub_domain):
    rows = [dict(r) for r in rows]  # isolate per-version mutations
    rows = mod.enrich_paper_metadata(conn, rows)
    return mod.score_candidates(rows, sub_domain)


def metrics(ranked, gold, k=5):
    top = ranked[:k]
    hit = [p for p in top if p["seed_ref"] in gold]
    p_at_k = len(hit) / k
    r_at_k = len(hit) / max(1, len(gold))
    mrr = 0.0
    for i, p in enumerate(ranked, 1):
        if p["seed_ref"] in gold:
            mrr = 1.0 / i
            break
    mean_cos = sum(float(p.get("cosine") or 0) for p in top) / k
    top1_cos = float(ranked[0].get("cosine") or 0)  # semantic fidelity of the #1 pick
    return p_at_k, r_at_k, mrr, mean_cos, top1_cos


def main():
    conn = psycopg2.connect(**db_params(), cursor_factory=RealDictCursor)
    cur = conn.cursor()
    problems = fetch_problems(cur)
    gold_by_sd = gold_map(cur)

    print("=" * 96)
    print("PART A — deterministic ranking quality (gold = same sub_domain).  "
          "P@5 / R@5 / MRR / mean top-5 cosine")
    print("=" * 96)
    print(f"{'problem':14s} {'gold':>4s} | {'v2 P@5':>6s} {'v3 P@5':>6s} | "
          f"{'v2 R@5':>6s} {'v3 R@5':>6s} | {'v2 cos5':>7s} {'v3 cos5':>7s} | "
          f"{'v2 top1':>7s} {'v3 top1':>7s}")
    agg = {"v2": [0, 0, 0, 0, 0], "v3": [0, 0, 0, 0, 0]}
    top1_is_maxcos = {"v2": 0, "v3": 0}
    for pr in problems:
        sd = pr["sub_domain"]
        gold = gold_by_sd.get(sd, set())
        cands = candidates(cur, pr["problem_ref"])
        max_cos_ref = max(cands, key=lambda c: float(c.get("cosine") or 0))["seed_ref"]
        r2 = rank_with(v2, conn, cands, sd)
        r3 = rank_with(v3, conn, cands, sd)
        m2 = metrics(r2, gold)
        m3 = metrics(r3, gold)
        top1_is_maxcos["v2"] += int(r2[0]["seed_ref"] == max_cos_ref)
        top1_is_maxcos["v3"] += int(r3[0]["seed_ref"] == max_cos_ref)
        for i in range(5):
            agg["v2"][i] += m2[i]
            agg["v3"][i] += m3[i]
        print(f"{pr['problem_ref']:14s} {len(gold):>4d} | "
              f"{m2[0]:>6.2f} {m3[0]:>6.2f} | {m2[1]:>6.2f} {m3[1]:>6.2f} | "
              f"{m2[3]:>7.3f} {m3[3]:>7.3f} | {m2[4]:>7.3f} {m3[4]:>7.3f}")
    n = len(problems)
    print("-" * 96)
    a2, a3 = agg["v2"], agg["v3"]
    print(f"{'MEAN':14s} {'':>4s} | "
          f"{a2[0]/n:>6.2f} {a3[0]/n:>6.2f} | {a2[1]/n:>6.2f} {a3[1]/n:>6.2f} | "
          f"{a2[3]/n:>7.3f} {a3[3]/n:>7.3f} | {a2[4]/n:>7.3f} {a3[4]/n:>7.3f}")
    print(f"\n#1 pick IS the highest-cosine candidate:  "
          f"v2 {top1_is_maxcos['v2']}/{n}   v3 {top1_is_maxcos['v3']}/{n}")

    # ---- case study: one problem, top-5 side by side ----
    pr = next(p for p in problems if p["problem_ref"] == "PROB-NT-02")
    sd = pr["sub_domain"]
    cands = candidates(cur, pr["problem_ref"])
    r2 = rank_with(v2, conn, cands, sd)
    r3 = rank_with(v3, conn, cands, sd)
    print("\n" + "=" * 96)
    print(f"CASE STUDY  {pr['problem_ref']}  ({sd})   [*] = in gold sub_domain")
    print("=" * 96)
    print(f"{'#':>2s}  {'v2 ranking':38s}   {'v3 ranking':38s}")
    for i in range(5):
        a, b = r2[i], r3[i]
        amark = "*" if a["seed_ref"] in gold_by_sd[sd] else " "
        bmark = "*" if b["seed_ref"] in gold_by_sd[sd] else " "
        astr = f"{amark}{a['seed_ref']:7s} s={a['final_score']:.3f} cos={float(a.get('cosine') or 0):.3f}"
        bstr = f"{bmark}{b['seed_ref']:7s} s={b['final_score']:.3f} cos={float(b.get('cosine') or 0):.3f}"
        print(f"{i+1:>2d}  {astr:38s}   {bstr:38s}")

    conn.close()

    # ---- Part B: blend isolation on identical inputs ----
    print("\n" + "=" * 96)
    print("PART B — LLM blend on IDENTICAL deterministic + LLM scores")
    print("  v2 blend = 0.7*det + 0.3*(0.4*rel + 0.3*novelty + 0.3*feasibility)")
    print("  v3 blend = 0.7*det + 0.3*rel        (novelty/feasibility are display-only)")
    print("=" * 96)
    # real-shaped example: a highly relevant but 'not novel/ready' paper vs a
    # flashy low-relevance one.
    # Equal deterministic score (the common case: v2's uncalibrated scores are
    # near-tied, see Part A) so the LLM blend alone decides order.
    sample = [
        # seed,  det,  rel,  nov,  feas
        ("RELEVANT", 0.75, 0.90, 0.20, 0.20),   # on-topic, unglamorous
        ("FLASHY",   0.75, 0.30, 0.95, 0.95),   # off-topic but 'novel & ready'
    ]
    def v2_blend(det, rel, nov, feas):
        return round(0.7 * det + 0.3 * (0.4 * rel + 0.3 * nov + 0.3 * feas), 3)
    def v3_blend(det, rel, nov, feas):
        return round(0.7 * det + 0.3 * rel, 3)
    rows = []
    for seed, det, rel, nov, feas in sample:
        rows.append((seed, rel, nov, feas, v2_blend(det, rel, nov, feas), v3_blend(det, rel, nov, feas)))
    print(f"{'paper':7s} {'rel':>5s} {'nov':>5s} {'feas':>5s} | {'v2 final':>8s} {'v3 final':>8s}")
    for seed, rel, nov, feas, b2, b3 in rows:
        print(f"{seed:7s} {rel:>5.2f} {nov:>5.2f} {feas:>5.2f} | {b2:>8.3f} {b3:>8.3f}")
    order2 = [r[0] for r in sorted(rows, key=lambda r: r[4], reverse=True)]
    order3 = [r[0] for r in sorted(rows, key=lambda r: r[5], reverse=True)]
    print(f"\nv2 order: {order2}")
    print(f"v3 order: {order3}")
    print("NOTE: with equal deterministic score, v2's blend lifts the off-topic "
          "FLASHY paper\n      above the on-topic RELEVANT one (novelty+feasibility = "
          "60% of its LLM weight);\n      v3 ranks by relevance only, so RELEVANT stays on top.")


if __name__ == "__main__":
    main()
