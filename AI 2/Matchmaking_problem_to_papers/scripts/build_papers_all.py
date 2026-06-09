"""
Build metadata for all 60 mapping-doc papers.
Facts (title/abstract/year/citations/authors/OA) come from OpenAlex (waterfall:
DOI -> arXiv -> PMCID -> title search). Classification (domain/sub_domain/problem/
maps-to) comes from the human-authored mapping doc. Nothing is invented; missing
facts are null. Output: data/papers_meta/<ID>.json + data/corpus_all.json
"""
import json, os, re, time, urllib.request, urllib.parse
from difflib import SequenceMatcher

MAILTO = "etaitools@timesinternet.in"
MAP = next((p for p in [r"C:\tmp\mapping.txt", r"C:\Users\tishya\AppData\Local\Temp\mapping.txt"] if os.path.exists(p)), None)
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "papers_meta")
CORPUS = os.path.join(os.path.dirname(__file__), "..", "data", "corpus_all.json")
NOW = "2026-06-06T00:00:00Z"

DOMAIN = {"RE": "renewable_energy", "BL": "buildings_infrastructure", "IN": "industrial_production"}
SUBDOMAIN = {
    "RE": [(8,"solar_pv"), (14,"green_hydrogen_electrolysers"), (20,"batteries_storage")],
    "BL": [(8,"geopolymer_cement"), (14,"carbon_capture_cement"), (20,"building_tech_lca")],
    "IN": [(6,"green_steel_h2"), (14,"industrial_iot_predictive_maintenance"), (20,"process_eng_rpb_materials")],
}

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"NRDC-R2C/0.1 (mailto:{MAILTO})"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def norm(s): return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def oa_abstract(inv):
    if not inv: return None
    pos = {}
    for w, idxs in inv.items():
        for i in idxs: pos[i] = w
    return ' '.join(pos[i] for i in sorted(pos))

def derive(link):
    link = link or ""
    m = re.search(r'arxiv\.org\S*?(\d{4}\.\d{4,5})', link)
    if m: return ("doi", f"10.48550/arXiv.{m.group(1)}")
    m = re.search(r'(PMC\d+)', link)
    if m: return ("pmcid", m.group(1))
    m = re.search(r'nature\.com/articles/(s\d[\w-]+)', link)
    if m: return ("doi", f"10.1038/{m.group(1)}")
    m = re.search(r'(10\.\d{4,9}/[^\s|)\]]+)', link)
    if m: return ("doi", m.group(1).rstrip('.'))
    return (None, None)

def resolve(title, link):
    kind, ident = derive(link)
    try:
        if kind == "doi":
            return ("doi", get(f"https://api.openalex.org/works/doi:{urllib.parse.quote(ident)}?mailto={MAILTO}"))
        if kind == "pmcid":
            return ("pmcid", get(f"https://api.openalex.org/works/pmcid:{ident}?mailto={MAILTO}"))
    except Exception:
        pass
    try:
        q = urllib.parse.quote(title[:200])
        r = get(f"https://api.openalex.org/works?filter=title.search:{q}&per-page=1&mailto={MAILTO}")
        res = r.get("results") or []
        if res: return ("title_search", res[0])
    except Exception:
        pass
    return ("unresolved", None)

def subdomain(prefix, num):
    for cap, name in SUBDOMAIN[prefix]:
        if num <= cap: return name
    return None

def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for line in open(MAP, encoding="utf-8"):
        if re.match(r'^(RE|BL|IN)-\d+\s*\|', line):
            p = [c.strip() for c in line.split('|')]
            if len(p) >= 6:
                rows.append((p[0], p[1], p[2], p[3], p[4], p[-1]))
    corpus = []
    resolved_ct = 0
    for sid, title, src_year, problem, maps_to, link in rows:
        prefix, num = sid.split('-')[0], int(sid.split('-')[1])
        method, w = resolve(title, link)
        y = None
        my = re.search(r'(19|20)\d{2}', src_year or "")
        if my: y = int(my.group(0))
        abstract = None; real_title = title; cites = None; authors = []; insts = {}; venue = None; doi = None; oa = None; year = y
        verify = None
        if w:
            resolved_ct += 1
            real_title = w.get("title") or title
            cites = w.get("cited_by_count")
            year = w.get("publication_year") or y
            oa = (w.get("open_access") or {}).get("is_oa")
            doi = (w.get("doi") or "").replace("https://doi.org/", "") or None
            venue = ((w.get("primary_location") or {}).get("source") or {}).get("display_name")
            abstract = oa_abstract(w.get("abstract_inverted_index"))
            for a in w.get("authorships", []):
                au = a.get("author", {})
                ins = a.get("institutions", []) or []
                c0 = ins[0].get("country_code") if ins else None
                authors.append({"name": au.get("display_name"), "orcid": au.get("orcid"),
                                "institution": ins[0].get("display_name") if ins else None, "country": c0})
                if ins: insts[ins[0].get("ror")] = c0
            sim = SequenceMatcher(None, norm(title), norm(real_title)).ratio()
            verify = {"title_similarity": round(sim, 2), "year_doc": y, "year_openalex": w.get("publication_year"),
                      "flag": ("CHECK" if (sim < 0.6 or (y and w.get("publication_year") and abs(y - w.get("publication_year")) > 1)) else "ok")}
        emb_text = abstract or f"{real_title}. {problem}"
        any_indian = any(c == "IN" for c in insts.values())

        rec = {
            "seed_ref": sid, "metadata_schema_version": "1.0", "ingested_at": NOW,
            "resolution": {"method": method, "verify": verify},
            "core": {
                "title": real_title, "title_source": ("openalex" if w else "mapping_doc"),
                "abstract": abstract, "abstract_source": ("openalex" if abstract else None),
                "published_year": year, "venue": venue, "doi": doi,
                "citation_count": cites, "is_open_access": oa,
                "authors": authors or None,
            },
            "research_domain": {  # classification from the human mapping doc
                "primary_domain": DOMAIN[prefix], "sub_domain": subdomain(prefix, num),
                "problem_statement": problem, "_source": "mapping_doc",
            },
            "commercialization": {
                "maps_to_companies": [c.strip() for c in (maps_to or "").split(",") if c.strip()],
                "trl_level": None, "_trl_note": "needs review (no full-text TRL extraction in this lightweight pass)",
            },
            "derived": {
                "indian_source_bonus": 1 if any_indian else 0,
                "recency_score": (round(max(0.0, 1 - (2026 - year) * 0.1), 2) if year else None),
                "citation_count": cites,
            },
            "embedding_text": emb_text,
            "paper_embeddings": {"_status": "DEFERRED", "model": "BAAI/bge-base-en-v1.5", "dim": 768},
        }
        with open(os.path.join(OUT, f"{sid}.json"), "w", encoding="utf-8") as f:
            json.dump(rec, f, indent=2, ensure_ascii=False)
        corpus.append({"seed_ref": sid, "title": real_title, "abstract": abstract,
                       "embedding_text": emb_text, "domain": DOMAIN[prefix],
                       "sub_domain": subdomain(prefix, num), "year": year, "citation_count": cites,
                       "resolved": bool(w)})
        flag = (verify or {}).get("flag", "-")
        print(f"  {sid:<7}{method:<14}{'abs' if abstract else 'NOabs':<6}cite={str(cites):<5}{flag}")
        time.sleep(0.12)
    with open(CORPUS, "w", encoding="utf-8") as f:
        json.dump(corpus, f, indent=2, ensure_ascii=False)
    print(f"\nresolved {resolved_ct}/{len(rows)} | abstracts: {sum(1 for c in corpus if c['abstract'])} | wrote data/papers_meta/ + corpus_all.json")

if __name__ == "__main__":
    main()
