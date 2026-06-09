"""
NRDC R2C - record builder (ingestion prototype).
Reads merged Crossref+OpenAlex metadata and emits schema-conformant records
with the null-first + tiered-confidence policy:

  Tier A (factual)      : Crossref -> OpenAlex waterfall; null if not found (never guessed)
  Tier B (deterministic): computed from Tier-A fields by rule; null if inputs null
  Tier C (judgment)     : LLM/editorial DRAFT with low confidence, flagged needs_review
  Tier D (human-only)   : null until a researcher/officer provides it

Run: python scripts/build_records.py
"""
import json, os, hashlib

META_PATH = r"C:\tmp\meta.json"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "papers")
CORPUS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "corpus.json")
CURRENT_YEAR = 2026
NOW = "2026-06-06T00:00:00Z"

# Editorial / mapping context (Tier-C drafts + Tier-D from the mapping doc).
# These are NRDC-side judgments, NOT facts from the paper -> low confidence, needs_review.
CONTEXT = {
    "RE-17": {
        "uuid": "11111111-1111-4111-8111-000000000017",
        "domain": "renewable_energy", "sub_domain": "batteries_storage",
        "problem_area": "low electrical conductivity & fast-charge/cycle stability of LFP cathodes",
        "method": "plasma-assisted reduced graphene oxide (rGO) additive for LFP",
        "maps_to_companies": ["Log9 Materials"],
        "trl_draft": 4, "trl_basis": "lab half-cell + full-cell results; no pilot/production",
        "wipo_green": True,
    },
    "BL-02": {
        "uuid": "11111111-1111-4111-8111-000000000002",
        "domain": "buildings_infrastructure", "sub_domain": "geopolymer_cement",
        "problem_area": "compressive-strength prediction & low-carbon mix optimization of fly-ash geopolymer concrete",
        "method": "ML ensemble + genetic programming + LCA-based CO2 model",
        "maps_to_companies": ["UltraTech", "CarbonStrong"],
        "trl_draft": 4, "trl_basis": "validated predictive model + design-program case study; not field-deployed",
        "wipo_green": True,
    },
    "IN-07": {
        "uuid": "11111111-1111-4111-8111-000000000007",
        "domain": "industrial_production", "sub_domain": "industrial_iot_pipeline_inspection",
        "problem_area": "acoustic-emission leak localization in industrial pipelines",
        "method": "minimum entropy deconvolution + damping-frequency energy + zero-crossing TDoA",
        "maps_to_companies": ["Detect Technologies"],
        "trl_draft": 5, "trl_basis": "experimental validation on pipeline test rig; outperforms GCC/EMD-GCC baselines",
        "wipo_green": None,  # leak detection is green-adjacent but NOT clearly WIPO GREEN -> do not assert
    },
}

def f(value, source):
    """Tier-A field wrapper: carries value + provenance, or null+not_found."""
    if value in (None, "", []):
        return {"value": None, "source": None, "_resolution": "not_found"}
    return {"value": value, "source": source}

def recency_rule(year):
    if year is None: return None
    return round(max(0.0, 1.0 - (CURRENT_YEAR - year) * 0.1), 2)  # 2024->0.8, 2022->0.6

def main():
    meta = json.load(open(META_PATH, encoding="utf-8"))
    corpus = []
    for sid, m in meta.items():
        cr = m.get("crossref", {}) or {}
        oa = m.get("openalex", {}) or {}
        ctx = CONTEXT[sid]

        # ---- merge authors by index (counts verified equal across sources) ----
        cr_auth = cr.get("authors", []) or []
        oa_auth = oa.get("authors", []) or []
        n = max(len(cr_auth), len(oa_auth))
        authors, institutions, paper_authors = [], {}, []
        for i in range(n):
            a_cr = cr_auth[i] if i < len(cr_auth) else {}
            a_oa = oa_auth[i] if i < len(oa_auth) else {}
            orcid = a_cr.get("orcid") or a_oa.get("orcid")  # waterfall fill
            insts = a_oa.get("institutions") or []
            inst_id = None
            if insts:
                inst = insts[0]
                ror = inst.get("ror")
                inst_id = ror or inst.get("name")
                if inst_id and inst_id not in institutions:
                    institutions[inst_id] = {
                        "institution_id_local": inst_id, "name": inst.get("name"),
                        "ror": ror, "country": inst.get("country"),
                        "is_indian": inst.get("country") == "IN",
                        "source": "openalex",
                    }
            aid = f"{ctx['uuid'][:-3]}{i:03d}"
            authors.append({
                "author_id": aid, "full_name": a_cr.get("name") or a_oa.get("name"),
                "orcid": orcid, "primary_institution_local": inst_id,
                "source": "crossref+openalex",
            })
            paper_authors.append({
                "author_id": aid, "author_order": i + 1, "is_corresponding": None,
                "affiliation_at_publication": (a_cr.get("affiliation") or [None])[0],
            })

        year = cr.get("year") or oa.get("year")
        any_indian = any(inst["is_indian"] for inst in institutions.values())

        record = {
            "paper_id": ctx["uuid"], "seed_ref": sid,
            "metadata_schema_version": "1.0", "batch_version": "seed-2026-06",
            "ingestion_timestamp": NOW, "created_at": NOW, "updated_at": NOW,

            # ---------- Tier A: factual (waterfall, null-if-missing) ----------
            "tier_A_factual": {
                "title": f(cr.get("title") or oa.get("title"), "crossref"),
                "doi": f(m["doi"], "crossref"),
                "published_year": f(year, "crossref"),
                "venue": f(cr.get("venue"), "crossref"),
                "publisher": f(cr.get("publisher"), "crossref"),
                "paper_type": f(cr.get("type") or oa.get("type"), "crossref"),
                "language": f(cr.get("language") or oa.get("language"), "crossref"),
                "abstract": f(cr.get("abstract") or oa.get("abstract"), "crossref"),
                "reference_count": f(cr.get("reference_count"), "crossref"),
                "citation_count": f(oa.get("cited_by_count"), "openalex"),
                "is_open_access": f(oa.get("is_oa"), "openalex"),
                "oa_pdf_url": f(oa.get("oa_url"), "openalex"),
                "distribution_license": f((cr.get("license") or [None])[0], "crossref"),
                "openalex_id": f(oa.get("id"), "openalex"),
                "openalex_topics": f(oa.get("topics"), "openalex"),
            },

            # ---------- Tier B: deterministic derived (rule-computed) ----------
            "tier_B_derived": {
                "indian_source_bonus": {"value": 1 if any_indian else 0,
                                        "rule": "1 if any author institution country == IN else 0",
                                        "inputs": [i["country"] for i in institutions.values()]},
                "recency_score": {"value": recency_rule(year),
                                  "rule": "max(0, 1-(2026-year)*0.1)", "input_year": year},
            },

            # ---------- Tier C: judgment DRAFTS (low confidence, needs_review) ----------
            "tier_C_draft": {
                "domain": {"value": ctx["domain"], "confidence": 0.5, "assigned_by": "system_editorial_draft", "needs_review": True},
                "sub_domain": {"value": ctx["sub_domain"], "confidence": 0.5, "assigned_by": "system_editorial_draft", "needs_review": True},
                "problem_area": {"value": ctx["problem_area"], "confidence": 0.5, "assigned_by": "system_editorial_draft", "needs_review": True},
                "method": {"value": ctx["method"], "confidence": 0.5, "assigned_by": "system_editorial_draft", "needs_review": True},
                "trl_claim": {"value": ctx["trl_draft"], "basis": ctx["trl_basis"], "confidence": 0.4, "assigned_by": "system_editorial_draft", "needs_review": True},
                "wipo_green_eligible": ({"value": ctx["wipo_green"], "confidence": 0.5, "assigned_by": "system_editorial_draft", "needs_review": True}
                                        if ctx["wipo_green"] is not None
                                        else {"value": None, "_resolution": "uncertain_not_asserted", "needs_review": True}),
                "novelty_score": {"value": None, "_resolution": "needs_rubric", "needs_review": True},
                "publication_quality_score": {"value": None, "_resolution": "needs_rubric", "needs_review": True},
            },

            # ---------- Tier D: human-only (null until provided) ----------
            "tier_D_human": {
                "has_patent": {"value": None, "_resolution": "awaiting_researcher_or_officer"},
                "ip_encumbrances": {"value": None, "_resolution": "awaiting_researcher_or_officer"},
                "licensing_preference": {"value": None, "_resolution": "awaiting_researcher"},
                "maps_to_companies_DRAFT": {"value": ctx["maps_to_companies"], "confidence": 0.4, "needs_review": True},
            },

            # ---------- related tables ----------
            "institutions": list(institutions.values()),
            "authors": authors,
            "paper_authors": paper_authors,

            "paper_files": {"s3_key": None, "_resolution": "pdf_not_fetched",
                            "oa_pdf_url": oa.get("oa_url"), "is_public": True},
            "paper_tree_nodes": {"_status": "DEFERRED", "_note": "Needs GROBID/LLM pass over the PDF for section hierarchy."},
            "paper_embeddings": {"_status": "DEFERRED",
                                 "_note": "Generate with bge-base-en-v1.5 (768-dim) for BOTH papers and problems. See scripts/embed_demo.py for the local demo."},
        }

        os.makedirs(os.path.join(OUT_DIR, sid), exist_ok=True)
        with open(os.path.join(OUT_DIR, sid, "record.json"), "w", encoding="utf-8") as fp:
            json.dump(record, fp, indent=2, ensure_ascii=False)

        corpus.append({
            "seed_ref": sid, "paper_id": ctx["uuid"],
            "title": record["tier_A_factual"]["title"]["value"],
            "abstract": record["tier_A_factual"]["abstract"]["value"],
            "domain": ctx["domain"], "sub_domain": ctx["sub_domain"],
            "year": year, "citation_count": oa.get("cited_by_count"),
        })
        print(f"wrote data/papers/{sid}/record.json  (indian_source_bonus={record['tier_B_derived']['indian_source_bonus']['value']}, citations={oa.get('cited_by_count')})")

    # include RE-09 (already done) in the corpus for the embedding demo
    re09 = json.load(open(os.path.join(OUT_DIR, "RE-09", "papers.json"), encoding="utf-8"))
    corpus.insert(0, {
        "seed_ref": "RE-09", "paper_id": re09["paper_id"],
        "title": re09["title"], "abstract": re09["abstract"],
        "domain": "renewable_energy", "sub_domain": "green_hydrogen_electrolysers",
        "year": re09["published_year"], "citation_count": None,
    })
    with open(CORPUS_PATH, "w", encoding="utf-8") as fp:
        json.dump(corpus, fp, indent=2, ensure_ascii=False)
    print(f"\nwrote data/corpus.json with {len(corpus)} papers (for embedding demo)")

if __name__ == "__main__":
    main()
