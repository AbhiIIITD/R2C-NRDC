# RE-09 — Worked Paper Record (static seed)

Paper: **Modeling Membrane Degradation in PEM Electrolyzers with Physics-Informed Neural Networks**
arXiv:2507.02887 · DOI 10.48550/arXiv.2507.02887 · 2025 · Universidad Pontificia Comillas (IIT), Madrid + Innomerics
Maps to: **Newtrace, Ohmium** (Renewable Energy → Green Hydrogen & Electrolysers)

This folder is one paper expressed in the **Master Schema** (one JSON file per table). It's the
template the rest of the 60-paper corpus follows. Format = JSON-per-table; embeddings deferred.

## Files (Layer A + B — everything about the paper)
| File | Schema table | Notes |
|------|--------------|-------|
| `papers.json` | A1 `papers` | Core cols + the 5 Layer-2 JSONB blocks (research_domain, technical, commercialization, legal, categorization). |
| `paper_tree_nodes.json` | A2 `paper_tree_nodes` | Real PageIndex hierarchy (root + 7 sections + 3 subsections + 2 appendices). **Page ranges are approximate** (estimated over the 9-page PDF) — re-extract exact ranges when the ingestion pipeline parses the PDF. |
| `paper_derived.json` | A3 `paper_derived` | Computed scores. citation_* left null → OpenAlex job fills later. |
| `paper_embeddings.json` | A4 `paper_embeddings` | **DEFERRED** — vectors null until DB + model chosen. |
| `paper_citations.json` | A5 `paper_citations` | **DEFERRED** — needs cited papers to exist in DB first. ~39 refs. |
| `paper_files.json` | A6 `paper_files` | Real PDF: `source.pdf` (866,162 bytes, sha256 ea93f8…). `s3_key` mirrors future S3 layout. |
| `institutions.json` | B1 `institutions` | Comillas IIT + Innomerics. |
| `authors.json` | B2 `authors` | 4 authors, emails captured, ORCID null (lookup later). |
| `paper_authors.json` | B3 `paper_authors` | Author order + corresponding flag. |
| `source.pdf` | (S3 in prod) | The actual downloaded PDF. |

## `_match_demo/` (Layers C + D — the matchmaking, for illustration)
Shows how RE-09 surfaces to a company. Based on the mapping doc's worked example (§B.2, Newtrace).
`companies.json`, `users.json`, `problems.json`, `problem_tags.json`, `match_models.json`, `matches.json`.
The `matches.json` score (0.808) is computed honestly from the v1.0 weights; the doc's stated 0.83 is rounding.

## Assumptions / things to verify
- **Year is 2025**, not 2024 as the mapping doc says (arXiv submission June 2025). Mapping doc should be corrected.
- **TRL = 3** is inferred (paper states no explicit TRL); matches the mapping doc's worked example.
- **`is_public = true`** on the PDF — correct here because it's an open-access preprint (no pre-NDA IP to gate). Patent-wrapped papers should default to `false`.
- IDs are hand-assigned readable UUIDs for the seed. Swap for `gen_random_uuid()` at load time if preferred (keep the FK relationships).
- `taxonomy_id`s in `problem_tags.json` are stubs — seed the `taxonomies` table (G2) first, then replace.

## Loading into Supabase later
1. Run the schema migration (31 tables + pgvector + triggers).
2. Load reference data first: `institutions` → `authors` → `papers` → `paper_authors` → `paper_tree_nodes` → `paper_files` → `paper_derived`. (FK order matters.)
3. Upload `source.pdf` to the `r2c-papers-*` bucket at `s3_key`.
4. Generate `paper_embeddings` in one batch (abstract → 768-dim; full → 1536-dim from concatenated tree-node summaries). Same model for papers AND problems.
5. Run the citation job to fill `paper_citations`.
