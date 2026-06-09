-- Matchmaking RPC functions. Supabase auto-exposes these at:
--   POST /rest/v1/rpc/match_papers_by_problem   body: {"p_problem_ref":"PROB-NT-02","p_top_n":10}
--   POST /rest/v1/rpc/match_papers_by_vector     body: {"p_vec":[...768 floats...],"p_top_n":10}

-- (A) by a registered problem (embedding already stored) — the clean team-facing call
create or replace function match_papers_by_problem(p_problem_ref text, p_top_n int default 10)
returns table(seed_ref text, title text, sub_domain text, cosine numeric, citation_count int)
language sql stable as $$
  select p.seed_ref, p.title,
         p.research_domain->>'sub_domain' as sub_domain,
         round((1 - (pe.embedding_abstract <=> q.embedding))::numeric, 3) as cosine,
         pd.citation_count
  from problem_embeddings q
  join papers p on true
  join paper_embeddings pe on pe.paper_id = p.paper_id
  left join paper_derived pd on pd.paper_id = p.paper_id
  where q.problem_id = (select problem_id from problems where problem_ref = p_problem_ref)
    and pe.embedding_abstract is not null
  order by pe.embedding_abstract <=> q.embedding
  limit p_top_n;
$$;

-- (B) by an ad-hoc query vector (caller embeds the free text first, e.g. via the matchmaking service)
create or replace function match_papers_by_vector(p_vec vector(768), p_top_n int default 10)
returns table(seed_ref text, title text, sub_domain text, cosine numeric)
language sql stable as $$
  select p.seed_ref, p.title,
         p.research_domain->>'sub_domain' as sub_domain,
         round((1 - (pe.embedding_abstract <=> p_vec))::numeric, 3) as cosine
  from papers p
  join paper_embeddings pe on pe.paper_id = p.paper_id
  where pe.embedding_abstract is not null
  order by pe.embedding_abstract <=> p_vec
  limit p_top_n;
$$;
