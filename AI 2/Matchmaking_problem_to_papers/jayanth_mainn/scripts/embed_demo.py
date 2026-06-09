"""
NRDC R2C - local embedding + ranked-match demo.

Embeds the paper corpus + your problem statement with bge-base-en-v1.5 (768-dim,
the model you standardized on) and prints papers ranked by cosine similarity.
This is the *coarse recall* stage of matchmaking, run entirely locally - no API,
no Supabase. Production swaps this for pgvector ANN + an LLM re-rank, same vectors.

Usage:
  python scripts/embed_demo.py "your problem statement here"
  python scripts/embed_demo.py            # interactive: type problems, blank line to quit

First run downloads the model (~440MB) once, then caches it.
"""
import os
# Force the PyTorch backend; skip TensorFlow/Flax (avoids a protobuf clash from a stray TF install)
os.environ["USE_TF"] = "0"
os.environ["USE_FLAX"] = "0"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
import json, sys
import numpy as np
from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(__file__)
CORPUS = os.path.join(HERE, "..", "data", "corpus.json")
EMB_OUT = os.path.join(HERE, "..", "data", "paper_embeddings_local.json")
MODEL = "BAAI/bge-base-en-v1.5"
# bge-v1.5 recommends prefixing the QUERY (problem) only; passages (papers) get no prefix.
QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

def load_model():
    print(f"loading {MODEL} (first run downloads ~440MB)...", file=sys.stderr)
    return SentenceTransformer(MODEL)

def embed_papers(model, papers):
    texts = [f"{p['title']}. {p['abstract'] or ''}" for p in papers]
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    # persist the stored vectors (what would live in paper_embeddings.embedding_abstract)
    out = [{"paper_id": p["paper_id"], "seed_ref": p["seed_ref"],
            "embedding_model": MODEL, "embedding_dim": int(vecs.shape[1]),
            "embedding_abstract": [round(float(x), 6) for x in v]}
           for p, v in zip(papers, vecs)]
    with open(EMB_OUT, "w", encoding="utf-8") as f:
        json.dump(out, f)
    print(f"saved {len(out)} paper vectors ({vecs.shape[1]}-dim) -> data/paper_embeddings_local.json", file=sys.stderr)
    return np.asarray(vecs)

def rank(model, paper_vecs, papers, problem):
    qv = model.encode([QUERY_INSTRUCTION + problem], normalize_embeddings=True)[0]
    sims = paper_vecs @ qv                      # cosine (both normalized) = coarse semantic score
    order = np.argsort(-sims)
    print(f'\nPROBLEM: "{problem}"')
    print("-" * 92)
    print(f"{'rank':<5}{'paper':<8}{'cosine':<9}{'sub_domain':<34}title")
    print("-" * 92)
    for r, i in enumerate(order, 1):
        p = papers[i]
        title = (p["title"] or "")[:46]
        print(f"{r:<5}{p['seed_ref']:<8}{sims[i]:<9.3f}{p['sub_domain']:<34}{title}")
    print("-" * 92)
    print("note: cosine here is ONLY the semantic-similarity dimension (40% weight in the full")
    print("score). Production then re-ranks with TRL-fit, sub-domain, Indian-source, recency + LLM.")

def main():
    papers = json.load(open(CORPUS, encoding="utf-8"))
    model = load_model()
    paper_vecs = embed_papers(model, papers)
    if len(sys.argv) > 1:
        rank(model, paper_vecs, papers, " ".join(sys.argv[1:]))
        return
    print("\nType a problem statement (blank line to quit):")
    while True:
        try:
            q = input("> ").strip()
        except EOFError:
            break
        if not q:
            break
        rank(model, paper_vecs, papers, q)

if __name__ == "__main__":
    main()
