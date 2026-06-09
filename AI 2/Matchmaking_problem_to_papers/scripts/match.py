"""
Local matchmaking test (the real model): a company has registered problems;
for each problem statement -> top-N related research papers by meaning.

Usage:
  python scripts/match.py --list                  # show registered problems
  python scripts/match.py --all                   # top-N for every registered problem
  python scripts/match.py --problem PROB-NT-02    # top-N for one registered problem
  python scripts/match.py "your free-text problem here"   # ad-hoc problem
Options: --top 5
"""
import os
os.environ["USE_TF"] = "0"; os.environ["USE_FLAX"] = "0"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"; os.environ["TOKENIZERS_PARALLELISM"] = "false"
import json, sys
import numpy as np
from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(__file__); DATA = os.path.join(HERE, "..", "data")
MODEL = "BAAI/bge-base-en-v1.5"
QPREFIX = "Represent this sentence for searching relevant passages: "

papers = json.load(open(os.path.join(DATA, "corpus_all.json"), encoding="utf-8"))
pvecs = np.asarray([e["embedding"] for e in json.load(open(os.path.join(DATA, "paper_embeddings_all.json")))])
problems = json.load(open(os.path.join(DATA, "problems.json"), encoding="utf-8"))

def topn(model, text, n, same_subdomain=None):
    qv = model.encode([QPREFIX + text], normalize_embeddings=True)[0]
    sims = pvecs @ qv
    order = np.argsort(-sims)
    out = []
    for i in order:
        p = papers[i]
        if same_subdomain and p["sub_domain"] != same_subdomain:
            continue
        out.append((p, float(sims[i])))
        if len(out) >= n: break
    return out

def show(title, results):
    print(f"\n{title}")
    print(f"  {'rank':<5}{'paper':<7}{'cosine':<8}{'sub_domain':<34}title")
    for r, (p, s) in enumerate(results, 1):
        print(f"  {r:<5}{p['seed_ref']:<7}{s:<8.3f}{p['sub_domain']:<34}{(p['title'] or '')[:44]}")

def main():
    args = sys.argv[1:]
    if "--list" in args:
        print("Registered problems:")
        for p in problems:
            print(f"  {p['problem_id']:<14}{p['company_name']:<22}{p['problem_statement'][:70]}")
        return
    n = 5
    if "--top" in args:
        n = int(args[args.index("--top") + 1])
    print(f"loading {MODEL} ...", file=sys.stderr)
    model = SentenceTransformer(MODEL)
    if "--all" in args:
        for p in problems:
            show(f"[{p['problem_id']}] {p['company_name']}: {p['problem_statement'][:60]}...",
                 topn(model, p["problem_statement"], 3))
        return
    if "--problem" in args:
        pid = args[args.index("--problem") + 1]
        p = next(x for x in problems if x["problem_id"] == pid)
        show(f"[{pid}] {p['company_name']}: {p['problem_statement']}", topn(model, p["problem_statement"], n))
        return
    text = " ".join(a for a in args if not a.startswith("--") and a != str(n))
    if text:
        show(f"Ad-hoc problem: {text}", topn(model, text, n))
    else:
        print("Give a problem, or use --list / --all / --problem <id>")

if __name__ == "__main__":
    main()
