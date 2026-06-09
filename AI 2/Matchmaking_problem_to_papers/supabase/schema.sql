-- =====================================================================
-- NRDC R2C Platform — FULL schema (Master Schema doc, 7 layers A–G)
-- Goal: automate Quick-License + Patent-Buyout across the full
-- research-to-commercialisation (R2C) journey.
-- Target: Supabase (Postgres 16 + pgvector). Run once.
-- Notes:
--   * discovery_feed (Master Schema D3) is Redis cache, NOT a table — omitted here.
--   * enums modelled as TEXT + CHECK for portability; widen as needed.
--   * cross-cyclic FKs (users<->officers) added via ALTER at the end.
-- =====================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- =====================================================================
-- LAYER B — Institutions, Authors, Patents  (created first: papers ref them)
-- =====================================================================

create table if not exists institutions (
    institution_id          uuid primary key default gen_random_uuid(),
    name                    text not null,
    type                    text,        -- csir_lab|iit|iiit|university|private_rd|govt_lab|iisc|niit
    dsir_recognized         boolean,
    dsir_recognition_expiry date,
    city                    text,
    state                   text,
    country                 text default 'IN',
    parent_organization     text,
    accreditations          text[],
    is_active               boolean default true,
    website                 text,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists authors (
    author_id               uuid primary key default gen_random_uuid(),
    full_name               text not null,
    orcid                   text unique,
    email                   text,
    primary_institution_id  uuid references institutions(institution_id),
    h_index                 int,
    total_citations         int,
    scopus_id               text,
    google_scholar_id       text,
    linkedin_url            text,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists patents (
    patent_id               uuid primary key default gen_random_uuid(),
    patent_number           text,
    patent_office           text,        -- IN|US|EP|PCT|JP|CN|WO
    title                   text,
    status                  text,        -- filed|published|under_examination|granted|lapsed|abandoned
    filing_date             date,
    publication_date        date,
    grant_date              date,
    expiry_date             date,
    annuity_paid_until      date,        -- CRITICAL: Indian patents lapse if unpaid
    assignee_institution_id uuid references institutions(institution_id),
    inventors               text[],
    abstract                text,
    claims_count            int,
    encumbrances            text,
    grant_back_terms        text,
    wipo_green_listed       boolean,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    unique (patent_number, patent_office)
);

-- =====================================================================
-- LAYER A — Research (papers + derived/embeddings/tree/citations/files)
-- =====================================================================

create table if not exists papers (
    paper_id                uuid primary key default gen_random_uuid(),
    seed_ref                text unique,                 -- RE-09 etc (our corpus key)
    title                   text not null,
    authors                 text[],                      -- denormalised cache
    author_affiliations     text[],
    abstract                text,
    doi                     text unique,
    published_year          int,
    venue                   text,
    language                text,
    country_of_origin       text,
    source                  text,                        -- upload|arxiv|crawl|mapping_doc
    paper_type              text,
    page_count              int,
    -- Layer 2: expandable JSONB domain blocks
    research_domain         jsonb,
    technical               jsonb,
    commercialization       jsonb,
    legal                   jsonb,
    categorization          jsonb,
    -- versioning
    metadata_schema_version text default '1.0',
    batch_version           text,
    index_version           text,
    ingestion_timestamp     timestamptz default now(),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    deleted_at              timestamptz                  -- soft delete only
);
create index if not exists idx_papers_title_trgm on papers using gin (title gin_trgm_ops);
create index if not exists idx_papers_year on papers (published_year desc);
create index if not exists idx_papers_domain on papers using gin ((research_domain->>'primary_domain') gin_trgm_ops);

create table if not exists paper_tree_nodes (
    node_id                 uuid primary key default gen_random_uuid(),
    paper_id                uuid references papers(paper_id) on delete cascade,
    parent_node_id          uuid references paper_tree_nodes(node_id) on delete cascade,
    node_title              text,
    summary                 text,                        -- LLM-generated
    page_start              int,
    page_end                int,
    depth_level             int,                         -- 0 root,1 chapter,2 section,3 subsection
    node_path               text[],
    node_index              int
);
create index if not exists idx_tree_paper on paper_tree_nodes (paper_id);

create table if not exists paper_derived (
    paper_id                uuid primary key references papers(paper_id) on delete cascade,
    topic_cluster           text,
    citation_score          numeric,
    influence_score         numeric,
    citation_count          int,
    industry_citations      int,
    abstract_structure_signal text,
    confidence_score        numeric,
    novelty_score           numeric,
    indian_source_bonus     int,                         -- 0 or 1
    wipo_green_eligible      boolean,
    derived_by              text,
    derivation_version      text,
    computed_at             timestamptz default now()
);

create table if not exists paper_embeddings (
    paper_id                uuid primary key references papers(paper_id) on delete cascade,
    embedding_abstract      vector(768),                 -- bge-base-en-v1.5
    embedding_full          vector(1536),                -- from concatenated tree summaries (later)
    embedding_model         text default 'BAAI/bge-base-en-v1.5',
    embedding_dim           int default 768,
    computed_at             timestamptz default now()
);
create index if not exists idx_paper_emb_abs on paper_embeddings using hnsw (embedding_abstract vector_cosine_ops);

create table if not exists paper_citations (
    citation_id             uuid primary key default gen_random_uuid(),
    citing_paper_id         uuid references papers(paper_id) on delete cascade,
    cited_paper_id          uuid references papers(paper_id) on delete cascade,
    citation_context        text,
    citation_type           text,        -- supporting|contrasting|methodological|background
    source                  text,        -- OpenAlex|Crossref|extracted
    unique (citing_paper_id, cited_paper_id)
);

-- =====================================================================
-- LAYER C — Demand (companies, users, problems)  [users/officers cycle resolved below]
-- =====================================================================

create table if not exists companies (
    company_id              uuid primary key default gen_random_uuid(),
    company_id_local        text unique,                 -- RE-OHM-001 etc (FramePlan key)
    legal_name              text,
    brand_name              text,
    gstin                   text unique,
    cin                     text,
    nic_code                text,
    company_tier            text,        -- top|mid|startup|local_startup
    domains                 text[],
    sub_domains             text[],
    hq_city                 text,
    hq_state                text,
    country                 text,
    employee_count_band     text,
    annual_revenue_band     text,
    dsir_recognized         boolean,
    license_budget_band     text,        -- <50L|50L-2Cr|2-10Cr|>10Cr
    routing_tier            text,
    raw                     jsonb,       -- full parsed FramePlan technology record
    is_verified             boolean default false,
    is_active               boolean default true,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists users (
    user_id                 uuid primary key default gen_random_uuid(),
    email                   text unique not null,
    full_name               text,
    phone                   text,
    password_hash           text,
    role                    text,        -- researcher|company_user|nrdc_officer|admin
    author_id               uuid references authors(author_id),
    nrdc_officer_id         uuid,        -- FK added after nrdc_officers exists
    profession              text,
    technology_domain       text,
    interest                text,
    last_login_at           timestamptz,
    mfa_enabled             boolean default false,
    is_email_verified       boolean default false,
    is_active               boolean default true,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    deleted_at              timestamptz
);

create table if not exists nrdc_officers (
    officer_id              uuid primary key default gen_random_uuid(),
    user_id                 uuid unique references users(user_id),
    employee_id             text,
    domain_specialisations  text[],
    max_concurrent_deals    int default 8,
    seniority               text,        -- junior|senior|lead|director
    can_approve_deals_above_inr bigint,
    is_active               boolean default true,
    joined_at               timestamptz default now()
);
alter table users drop constraint if exists fk_users_officer;
alter table users add constraint fk_users_officer
    foreign key (nrdc_officer_id) references nrdc_officers(officer_id);

create table if not exists company_users (
    user_id                 uuid references users(user_id) on delete cascade,
    company_id              uuid references companies(company_id) on delete cascade,
    role_in_company         text,        -- admin|tech_scout|legal|finance|viewer
    can_sign_deals          boolean default false,
    spending_authority_inr  bigint,
    invited_by              uuid references users(user_id),
    invitation_accepted_at  timestamptz,
    is_active               boolean default true,
    created_at              timestamptz default now(),
    primary key (user_id, company_id)
);

create table if not exists paper_files (
    file_id                 uuid primary key default gen_random_uuid(),
    paper_id                uuid references papers(paper_id) on delete cascade,
    file_type               text,        -- pdf|supplementary|figure|dataset
    s3_bucket               text,
    s3_key                  text,
    file_size_bytes         bigint,
    mime_type               text,
    checksum_sha256         text,
    uploaded_by             uuid references users(user_id),
    uploaded_at             timestamptz default now(),
    is_public               boolean default false        -- gates pre-NDA serving
);

create table if not exists paper_authors (
    paper_id                uuid references papers(paper_id) on delete cascade,
    author_id               uuid references authors(author_id) on delete cascade,
    author_order            int,
    is_corresponding        boolean,
    affiliation_at_publication text,
    contribution_statement  text,
    primary key (paper_id, author_id)
);

create table if not exists paper_patents (
    paper_id                uuid references papers(paper_id) on delete cascade,
    patent_id               uuid references patents(patent_id) on delete cascade,
    relationship_type       text,        -- primary|related|derived
    linked_by               uuid references users(user_id),
    confidence              numeric,
    created_at              timestamptz default now(),
    primary key (paper_id, patent_id)
);

-- =====================================================================
-- LAYER G (taxonomies) — needed by problems/tags; officers exist now
-- =====================================================================

create table if not exists taxonomies (
    taxonomy_id             uuid primary key default gen_random_uuid(),
    parent_taxonomy_id      uuid references taxonomies(taxonomy_id),
    term                    text,
    term_type               text,        -- domain|sub_domain|problem_area|method|certification|industry|technology
    description             text,
    synonyms                text[],
    depth_level             int,
    is_active               boolean default true,
    curated_by_officer_id   uuid references nrdc_officers(officer_id),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists problems (
    problem_id              uuid primary key default gen_random_uuid(),
    problem_ref             text unique,                 -- PROB-NT-02 (our seed key)
    company_id              uuid references companies(company_id) on delete cascade,
    problem_statement       text not null,
    sub_domain              text,                        -- (taxonomy term; soft ref)
    urgency                 text,        -- low|medium|high|critical
    internal_status         text,        -- no_effort|exploring|active_rd|piloting|blocked
    target_trl_min          int,
    target_trl_max          int,
    preferred_license_tier  text,        -- quick_license|patent_buyout|either
    budget_band             text,
    geographies             text[],
    created_by_user_id      uuid references users(user_id),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now(),
    expires_at              timestamptz,
    is_active               boolean default true
);
create index if not exists idx_problems_company on problems (company_id);

create table if not exists problem_embeddings (
    problem_id              uuid primary key references problems(problem_id) on delete cascade,
    embedding               vector(768),
    embedding_model         text default 'BAAI/bge-base-en-v1.5',
    embedding_dim           int default 768,
    computed_at             timestamptz default now()
);
create index if not exists idx_problem_emb on problem_embeddings using hnsw (embedding vector_cosine_ops);

create table if not exists problem_tags (
    tag_id                  uuid primary key default gen_random_uuid(),
    problem_id              uuid references problems(problem_id) on delete cascade,
    taxonomy_id             uuid references taxonomies(taxonomy_id),
    tag_value               text,
    confidence              numeric,
    assigned_by             text,        -- system|user|officer
    created_at              timestamptz default now()
);

-- =====================================================================
-- LAYER D — Matching (the platform's core IP)
-- =====================================================================

create table if not exists match_models (
    model_version           text primary key,            -- matcher-v1.0
    description             text,
    scoring_weights         jsonb,
    embedding_model         text,
    training_data_snapshot_id text,
    is_active               boolean default true,
    deployed_at             timestamptz default now(),
    retired_at              timestamptz
);

create table if not exists matches (
    match_id                uuid primary key default gen_random_uuid(),
    paper_id                uuid references papers(paper_id) on delete cascade,
    problem_id              uuid references problems(problem_id) on delete cascade,
    score                   numeric(4,3),
    confidence              numeric(4,3),
    score_breakdown         jsonb,
    explanation             text,
    snippet                 text,
    page_refs               jsonb,
    suggested_action        text,        -- surface_high|surface_medium|hide|flag_for_officer
    routing_tier            text,        -- auto_quick_license|officer_review|patent_buyout_candidate
    model_version           text references match_models(model_version),
    computed_at             timestamptz default now(),
    is_current              boolean default true,
    unique (paper_id, problem_id, model_version)
);
create index if not exists idx_matches_problem on matches (problem_id) where is_current;

create table if not exists match_feedback (
    feedback_id             uuid primary key default gen_random_uuid(),
    match_id                uuid references matches(match_id) on delete cascade,
    user_id                 uuid references users(user_id),
    action                  text,        -- viewed|saved|dismissed|nda_requested|flagged_irrelevant|escalated_to_officer
    reason                  text,
    session_id              text,
    created_at              timestamptz default now()
);

-- =====================================================================
-- LAYER E — Transactions (NDA -> deal -> milestones -> royalty -> payment)
-- =====================================================================

create table if not exists nda_agreements (
    nda_id                  uuid primary key default gen_random_uuid(),
    match_id                uuid references matches(match_id),
    company_id              uuid references companies(company_id),
    paper_id                uuid references papers(paper_id),
    status                  text,        -- requested|draft|sent_for_signature|signed|expired|rescinded
    template_version        text,
    requested_by_user_id    uuid references users(user_id),
    signed_by_company_user_id uuid references users(user_id),
    signed_by_nrdc_officer_id uuid references nrdc_officers(officer_id),
    signed_pdf_s3_key       text,
    valid_from              date,
    valid_until             date,
    scope_description       text,
    requested_at            timestamptz default now(),
    signed_at               timestamptz
);

create table if not exists licensing_deals (
    deal_id                 uuid primary key default gen_random_uuid(),
    match_id                uuid references matches(match_id),
    nda_id                  uuid references nda_agreements(nda_id),
    company_id              uuid references companies(company_id),
    paper_id                uuid references papers(paper_id),
    patent_ids              uuid[],
    institution_id          uuid references institutions(institution_id),
    deal_tier               text,        -- quick_license|patent_buyout
    exclusivity             text,        -- exclusive|non_exclusive|sole|field_limited
    field_of_use            text,
    geographies             text[],
    license_term_years      int,
    upfront_fee_inr         bigint,      -- paise
    royalty_pct             numeric(5,3),
    minimum_guarantee_annual_inr bigint,
    sub_license_allowed     text,        -- yes|yes_with_consent|no
    grant_back_terms        text,
    encumbrance_status      text,        -- clear|flagged|cleared_with_conditions
    nrdc_revenue_share_pct  numeric,
    institution_revenue_share_pct numeric,
    status                  text,        -- draft|under_negotiation|signed|active|expired|terminated|disputed
    assigned_officer_id     uuid references nrdc_officers(officer_id),
    signed_contract_s3_key  text,
    signed_at               timestamptz,
    effective_from          date,
    expires_at              date,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists deal_milestones (
    milestone_id            uuid primary key default gen_random_uuid(),
    deal_id                 uuid references licensing_deals(deal_id) on delete cascade,
    milestone_type          text,        -- upfront_payment|first_production|first_commercial_sale|100mw_deployed|annual_audit|performance_test|training_complete
    due_date                date,
    status                  text,        -- pending|met|overdue|waived
    evidence_required       text,
    evidence_s3_key         text,
    payment_amount_inr      bigint,
    completed_at            timestamptz,
    completed_by_user_id    uuid references users(user_id),
    verified_by_officer_id  uuid references nrdc_officers(officer_id),
    notes                   text,
    created_at              timestamptz default now()
);

create table if not exists royalty_reports (
    report_id               uuid primary key default gen_random_uuid(),
    deal_id                 uuid references licensing_deals(deal_id) on delete cascade,
    quarter                 text,
    period_start            date,
    period_end              date,
    declared_units_sold     bigint,
    declared_net_sales_inr  bigint,
    computed_royalty_inr    bigint,
    min_guarantee_applied   boolean,
    supporting_file_s3_key  text,
    submitted_by_user_id    uuid references users(user_id),
    submitted_at            timestamptz,
    status                  text,        -- submitted|under_review|accepted|disputed|audited
    reviewed_by_officer_id  uuid references nrdc_officers(officer_id),
    reviewed_at             timestamptz,
    audit_notes             text,
    unique (deal_id, quarter)
);

create table if not exists payments (
    payment_id              uuid primary key default gen_random_uuid(),
    deal_id                 uuid references licensing_deals(deal_id),
    milestone_id            uuid references deal_milestones(milestone_id),
    royalty_report_id       uuid references royalty_reports(report_id),
    payment_type            text,        -- upfront_fee|milestone_payment|quarterly_royalty|minimum_guarantee|dispute_resolution
    amount_inr              bigint,      -- paise
    payer_company_id        uuid references companies(company_id),
    payee_breakdown         jsonb,       -- {nrdc_inr, institution_inr, tds_inr}
    tds_rate_pct            numeric,
    payment_method          text,        -- neft|rtgs|imps|wire|escrow_release
    reference_number        text,
    bank_name               text,
    status                  text,        -- expected|initiated|in_transit|settled|failed|refunded
    expected_at             timestamptz,
    initiated_at            timestamptz,
    settled_at              timestamptz,
    settlement_proof_s3_key text,
    gst_invoice_id          text,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

-- =====================================================================
-- LAYER F — Operations (escalations, audit)  [nrdc_officers created above]
-- =====================================================================

create table if not exists escalations (
    escalation_id           uuid primary key default gen_random_uuid(),
    source_type             text,        -- user_raised|system_flagged|officer_initiated
    source_entity_type      text,        -- match|deal|royalty_report|patent|paper|company
    source_entity_id        uuid,        -- polymorphic
    raised_by_user_id       uuid references users(user_id),
    severity                text,        -- low|medium|high|critical
    category                text,        -- ip_conflict|quality_concern|payment_dispute|data_error|suspicious_activity|model_misjudgement|other
    description             text,
    status                  text,        -- open|triaged|in_progress|resolved|dismissed
    assigned_officer_id     uuid references nrdc_officers(officer_id),
    resolution_notes        text,
    resolved_at             timestamptz,
    sla_target_hours        int,
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

create table if not exists audit_log (
    audit_id                bigserial primary key,
    entity_type             text,
    entity_id               uuid,
    action                  text,        -- create|update|delete|status_change|permission_change|login|data_export|admin_override
    changed_fields          jsonb,
    actor_user_id           uuid,
    actor_role              text,
    actor_ip_address        inet,
    actor_user_agent        text,
    reason                  text,
    session_id              text,
    occurred_at             timestamptz default now()
);
create index if not exists idx_audit_entity on audit_log (entity_type, entity_id, occurred_at desc);

-- =====================================================================
-- LAYER G (meta) — schema_versions, system_jobs  (taxonomies created above)
-- =====================================================================

create table if not exists schema_versions (
    version                 text primary key,
    fields                  jsonb,
    introduced_fields       jsonb,
    deprecated_fields       jsonb,
    notes                   text,
    is_current              boolean default false,
    created_at              timestamptz default now()
);

create table if not exists system_jobs (
    job_id                  uuid primary key default gen_random_uuid(),
    job_type                text,        -- paper_ingest|embedding_refresh|match_recompute|patent_sync|...
    job_params              jsonb,
    status                  text,        -- queued|running|completed|failed|retrying|dead_letter
    retry_count             int default 0,
    max_retries             int default 3,
    started_at              timestamptz,
    completed_at            timestamptz,
    duration_seconds        numeric,
    error_message           text,
    error_stack             text,
    output_summary          jsonb,
    triggered_by            text,        -- cron|event|manual|api
    triggered_by_user_id    uuid references users(user_id),
    worker_id               text
);

-- =====================================================================
-- MATCHMAKING QUERY (coarse recall) — for one registered problem:
--   select p.seed_ref, p.title, p.research_domain->>'sub_domain' as sub_domain,
--          1 - (pe.embedding_abstract <=> q.embedding) as cosine
--   from problem_embeddings q
--   join paper_embeddings pe on true
--   join papers p on p.paper_id = pe.paper_id
--   where q.problem_id = (select problem_id from problems where problem_ref='PROB-NT-02')
--   order by pe.embedding_abstract <=> q.embedding
--   limit 20;
-- Expose as a Postgres function match_papers(problem_id, top_n) -> Supabase RPC.
-- =====================================================================
