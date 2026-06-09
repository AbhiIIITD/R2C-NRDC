"""
Embed all 60 papers + 12 company problems with bge-base-en-v1.5 (768-dim).
Saves vectors to disk (what would go into Supabase paper_embeddings /
problem_embeddings) and runs a quick self-test ranking.
"""
import os
os.environ["USE_TF"] = "0"; os.environ["USE_FLAX"] = "0"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"; os.environ["TOKENIZERS_PARALLELISM"] = "false"
import json, glob, sys
import numpy as np
from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "data")
MODEL = "BAAI/bge-base-en-v1.5"
QPREFIX = "Represent this sentence for searching relevant passages: "

def main():
    papers = json.load(open(os.path.join(DATA, "corpus_all.json"), encoding="utf-8"))
    # company "problems" = the problem_solved text from each technology record
    companies = []
    for fp in sorted(glob.glob(os.path.join(DATA, "companies", "*.json"))):
        c = json.load(open(fp, encoding="utf-8"))
        prob = c["technology"].get("problem_solved") or c["technology"].get("description") or ""
        companies.append({"company": c["company_name"], "id": c["company_id_local"],
                          "domain": c["domain"], "problem": prob})

    print(f"loading {MODEL} ...", file=sys.stderr)
    m = SentenceTransformer(MODEL)

    pvecs = m.encode([p["embedding_text"] for p in papers], normalize_embeddings=True, show_progress_bar=False)
    json.dump([{"seed_ref": p["seed_ref"], "embedding_model": MODEL, "embedding_dim": int(pvecs.shape[1]),
                "embedding": [round(float(x), 6) for x in v]} for p, v in zip(papers, pvecs)],
              open(os.path.join(DATA, "paper_embeddings_all.json"), "w"))
    cvecs = m.encode([QPREFIX + c["problem"] for c in companies], normalize_embeddings=True, show_progress_bar=False)
    json.dump([{"company_id": c["id"], "embedding_model": MODEL, "embedding_dim": int(cvecs.shape[1]),
                "embedding": [round(float(x), 6) for x in v]} for c, v in zip(companies, cvecs)],
              open(os.path.join(DATA, "problem_embeddings_all.json"), "w"))
    print(f"saved {len(papers)} paper + {len(companies)} company vectors (768-dim)", file=sys.stderr)

    # self-test: for 3 companies, show top-3 papers by cosine
    P = np.asarray(pvecs)
    for ci in [c["id"] for c in companies if c["id"] in ("RE-OHM-001", "RE-LOG9-001", "IND-DT-001")]:
        idx = next(i for i, c in enumerate(companies) if c["id"] == ci)
        sims = P @ cvecs[idx]
        order = np.argsort(-sims)[:3]
        print(f"\n{companies[idx]['company']} ({companies[idx]['domain']}):")
        for r, i in enumerate(order, 1):
            print(f"  {r}. {papers[i]['seed_ref']:<7}{sims[i]:.3f}  {papers[i]['sub_domain']:<34}{(papers[i]['title'] or '')[:42]}")

if __name__ == "__main__":
    main()
