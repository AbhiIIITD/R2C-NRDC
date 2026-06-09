"""
Load NRDC data into Supabase against the FULL Master Schema (supabase/schema.sql).
Reads DATABASE_URL from NRDC/.env (never printed).

Populates (Phase-1 active tables):
  institutions(implicit via paper authors? skipped for seed), papers (+JSONB blocks),
  paper_embeddings, paper_derived, companies, problems, problem_embeddings, match_models.

Run:  pip install psycopg2-binary   then   python supabase/load.py
"""
import os, json, glob, sys

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "data")

def db_params():
    """Return psycopg2 connection kwargs parsed from .env (handles special chars in password)."""
    import re
    text = ""
    envp = os.path.join(HERE, "..", ".env")
    if os.path.exists(envp):
        text = open(envp, encoding="utf-8-sig").read()  # -sig strips a BOM if present
    # extract the postgres URI no matter the prefix (DATABASE_URL=, quotes, etc.)
    m = re.search(r'postgres(?:ql)?://\S+', text) or re.search(r'postgres(?:ql)?://\S+', os.environ.get("DATABASE_URL", ""))
    if not m:
        return None
    raw = m.group(0).strip().strip('"').strip("'")
    after = raw.split("://", 1)[1]
    creds, hostpart = after.rsplit("@", 1)        # last @ = creds|host (host has no @)
    user, pw = creds.split(":", 1)                 # user has no ':'
    if "/" in hostpart:
        hostport, dbname = hostpart.split("/", 1)
    else:
        hostport, dbname = hostpart, "postgres"
    dbname = (dbname.split("?", 1)[0] or "postgres")
    if ":" in hostport:
        host, port = hostport.rsplit(":", 1)
    else:
        host, port = hostport, "5432"
    return {"host": host, "port": int(port), "user": user, "password": pw,
            "dbname": dbname, "sslmode": "require"}

def main():
    params = db_params()
    if not params:
        print("ERROR: no postgres URI found in NRDC/.env"); sys.exit(1)
    print(f"connecting to {params['host']}:{params['port']} db={params['dbname']} user={params['user']} ...")
    try:
        import psycopg2
        from psycopg2.extras import Json
    except ImportError:
        print("ERROR: pip install psycopg2-binary"); sys.exit(1)

    conn = psycopg2.connect(**params); conn.autocommit = False; cur = conn.cursor()
    print("running schema.sql ...")
    cur.execute(open(os.path.join(HERE, "schema.sql"), encoding="utf-8").read())

    # ---- match_models ----
    cur.execute("""insert into match_models (model_version, description, scoring_weights, embedding_model, is_active)
        values ('matcher-v1.0','Seed scorer (5 weighted dims)',
                %s,'BAAI/bge-base-en-v1.5', true)
        on conflict (model_version) do nothing""",
        (Json({"semantic":0.40,"trl_fit":0.20,"subdomain":0.15,"indian_source":0.10,"recency":0.15}),))

    # ---- papers (+ JSONB blocks) + embeddings + derived ----
    paper_emb = {e["seed_ref"]: e["embedding"] for e in json.load(open(os.path.join(DATA, "paper_embeddings_all.json")))}
    n_pap = 0
    for fp in sorted(glob.glob(os.path.join(DATA, "papers_meta", "*.json"))):
        r = json.load(open(fp, encoding="utf-8")); sid = r["seed_ref"]; c = r["core"]
        authors_names = [a.get("name") for a in (c.get("authors") or []) if a.get("name")] or None
        affils = [a.get("institution") for a in (c.get("authors") or [])] or None
        research_domain = {"primary_domain": r["research_domain"]["primary_domain"],
                           "sub_domain": r["research_domain"]["sub_domain"],
                           "problem_statement": r["research_domain"]["problem_statement"],
                           "source": r["research_domain"].get("_source")}
        commercialization = {"maps_to_companies": r["commercialization"]["maps_to_companies"],
                             "trl_level": r["commercialization"].get("trl_level")}
        categorization = {"resolution": r.get("resolution")}
        cur.execute("""insert into papers
            (seed_ref,title,authors,author_affiliations,abstract,doi,published_year,venue,source,
             research_domain,commercialization,categorization,metadata_schema_version)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'1.0')
            on conflict (seed_ref) do update set title=excluded.title, abstract=excluded.abstract,
              research_domain=excluded.research_domain, commercialization=excluded.commercialization
            returning paper_id""",
            (sid, c["title"], authors_names, affils, c["abstract"],
             (c["doi"] or None), c["published_year"], c["venue"],
             (r["resolution"]["method"] if r.get("resolution") else "mapping_doc"),
             Json(research_domain), Json(commercialization), Json(categorization)))
        pid = cur.fetchone()[0]
        if sid in paper_emb:
            cur.execute("""insert into paper_embeddings (paper_id, embedding_abstract, embedding_model, embedding_dim)
                values (%s,%s,'BAAI/bge-base-en-v1.5',768)
                on conflict (paper_id) do update set embedding_abstract=excluded.embedding_abstract""",
                (pid, paper_emb[sid]))
        d = r["derived"]
        cur.execute("""insert into paper_derived (paper_id, citation_count, indian_source_bonus, derived_by, derivation_version)
            values (%s,%s,%s,'seed-2026-06','seed-1.0')
            on conflict (paper_id) do update set citation_count=excluded.citation_count,
              indian_source_bonus=excluded.indian_source_bonus""",
            (pid, d.get("citation_count"), d.get("indian_source_bonus")))
        n_pap += 1

    # ---- companies ----
    comp_uuid = {}  # company_id_local -> company_id (uuid)
    for fp in sorted(glob.glob(os.path.join(DATA, "companies", "*.json"))):
        c = json.load(open(fp, encoding="utf-8")); cid = c["company_id_local"]; t = c["technology"]
        cur.execute("""insert into companies
            (company_id_local,legal_name,brand_name,company_tier,domains,sub_domains,routing_tier,raw)
            values (%s,%s,%s,%s,%s,%s,%s,%s)
            on conflict (company_id_local) do update set raw=excluded.raw
            returning company_id""",
            (cid, c["company_name"], c["company_name"], c["tier"], [c["domain"]],
             [t.get("sub_domain")] if t.get("sub_domain") else None, t.get("routing_tier"), Json(c)))
        comp_uuid[cid] = cur.fetchone()[0]

    # ---- problems + embeddings ----
    prob_emb = {e["problem_id"]: e["embedding"] for e in json.load(open(os.path.join(DATA, "problem_embeddings.json")))}
    n_pr = 0
    for pr in json.load(open(os.path.join(DATA, "problems.json"), encoding="utf-8")):
        ref = pr["problem_id"]; cuuid = comp_uuid.get(pr["company_id_local"])
        cur.execute("""insert into problems
            (problem_ref,company_id,problem_statement,sub_domain,urgency)
            values (%s,%s,%s,%s,%s)
            on conflict (problem_ref) do update set problem_statement=excluded.problem_statement
            returning problem_id""",
            (ref, cuuid, pr["problem_statement"], pr.get("sub_domain"), pr.get("urgency")))
        puuid = cur.fetchone()[0]
        if ref in prob_emb:
            cur.execute("""insert into problem_embeddings (problem_id, embedding, embedding_model, embedding_dim)
                values (%s,%s,'BAAI/bge-base-en-v1.5',768)
                on conflict (problem_id) do update set embedding=excluded.embedding""",
                (puuid, prob_emb[ref]))
        n_pr += 1

    conn.commit(); cur.close(); conn.close()
    print(f"LOADED: {n_pap} papers + {len(comp_uuid)} companies + {n_pr} problems (with embeddings) into Supabase.")

if __name__ == "__main__":
    main()
