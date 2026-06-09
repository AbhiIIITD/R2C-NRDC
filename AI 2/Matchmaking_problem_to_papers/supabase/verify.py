"""Verify the Supabase load + run a live pgvector matchmaking query."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from load import db_params
import psycopg2

conn = psycopg2.connect(**db_params()); cur = conn.cursor()

print("=== row counts ===")
for t in ["papers", "paper_embeddings", "paper_derived", "companies",
          "problems", "problem_embeddings", "match_models"]:
    cur.execute(f"select count(*) from {t}")
    print(f"  {t:<22}{cur.fetchone()[0]}")

print("\n=== live matchmaking (pgvector) for PROB-NT-02 (Newtrace: membrane lifetime) ===")
cur.execute("""
    select p.seed_ref,
           p.research_domain->>'sub_domain' as sub_domain,
           round((1 - (pe.embedding_abstract <=> q.embedding))::numeric, 3) as cosine,
           left(p.title, 50) as title
    from problem_embeddings q
    join papers p on true
    join paper_embeddings pe on pe.paper_id = p.paper_id
    where q.problem_id = (select problem_id from problems where problem_ref = 'PROB-NT-02')
      and pe.embedding_abstract is not null
    order by pe.embedding_abstract <=> q.embedding
    limit 5
""")
for r in cur.fetchall():
    print(f"  {r[0]:<7}{str(r[2]):<8}{(r[1] or ''):<34}{r[3]}")

cur.close(); conn.close()
