"""
Coverage check: can each of the 60 mapping-doc papers be resolved from OpenAlex?
Resolver waterfall:  DOI -> arXiv DOI -> PMCID -> title search -> UNRESOLVED.
Also cross-verifies the resolved title vs the doc title to catch WRONG matches.
"""
import json, re, sys, time, urllib.request, urllib.parse, os
from difflib import SequenceMatcher

MAILTO = "etaitools@timesinternet.in"
MAP_CANDIDATES = [r"C:\tmp\mapping.txt", r"C:\Users\tishya\AppData\Local\Temp\mapping.txt"]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"NRDC-R2C/0.1 (mailto:{MAILTO})"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

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
            w = get(f"https://api.openalex.org/works/doi:{urllib.parse.quote(ident)}?mailto={MAILTO}")
            return ("doi", w)
        if kind == "pmcid":
            w = get(f"https://api.openalex.org/works/pmcid:{ident}?mailto={MAILTO}")
            return ("pmcid", w)
    except Exception:
        pass
    # fallback: title search
    try:
        q = urllib.parse.quote(title[:200])
        r = get(f"https://api.openalex.org/works?filter=title.search:{q}&per-page=1&mailto={MAILTO}")
        res = r.get("results") or []
        if res:
            return ("title_search", res[0])
    except Exception:
        pass
    return ("UNRESOLVED", None)

def main():
    path = next((p for p in MAP_CANDIDATES if os.path.exists(p)), None)
    if not path:
        print("mapping.txt not found"); sys.exit(1)
    rows = []
    for line in open(path, encoding="utf-8"):
        if re.match(r'^(RE|BL|IN)-\d+\s*\|', line):
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 6:
                rows.append((parts[0], parts[1], parts[-1]))
    print(f"parsed {len(rows)} paper rows from {path}\n")
    print(f"{'ID':<7}{'method':<14}{'res':<5}{'year':<6}{'cites':<7}{'titlematch':<11}resolved_title")
    print("-"*110)
    methods = {}; unresolved = []; mismatches = []
    for sid, title, link in rows:
        method, w = resolve(title, link)
        methods[method] = methods.get(method, 0) + 1
        if w:
            rt = w.get("title") or ""
            sim = SequenceMatcher(None, norm(title), norm(rt)).ratio()
            tag = "ok" if sim >= 0.6 else "CHECK"
            if tag == "CHECK": mismatches.append((sid, title, rt))
            print(f"{sid:<7}{method:<14}{'Y':<5}{str(w.get('publication_year')):<6}{str(w.get('cited_by_count')):<7}{tag+f'({sim:.2f})':<11}{rt[:54]}")
        else:
            unresolved.append((sid, title, link))
            print(f"{sid:<7}{method:<14}{'N':<5}{'-':<6}{'-':<7}{'-':<11}{link[:54]}")
        time.sleep(0.15)
    print("\n=== summary ===")
    for k,v in sorted(methods.items(), key=lambda x:-x[1]):
        print(f"  {k:<14} {v}")
    print(f"  RESOLVED total: {len(rows)-len(unresolved)}/{len(rows)}")
    if unresolved:
        print("\nUNRESOLVED (need manual / non-scholarly):")
        for sid,t,l in unresolved: print(f"  {sid}: {t[:60]}  [{l[:40]}]")
    if mismatches:
        print("\nTITLE-MATCH WARNINGS (resolved record may be wrong - verify):")
        for sid,t,rt in mismatches: print(f"  {sid}: doc='{t[:45]}' vs openalex='{rt[:45]}'")

if __name__ == "__main__":
    main()
