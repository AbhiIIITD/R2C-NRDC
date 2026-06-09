"""
Build the 12-company 'industrial data' records by parsing the FramePlan doc
directly (field | value pairs). No LLM, no guessing - straight from the source.
Output: data/companies/<TECH_ID>.json + data/companies_index.json
"""
import json, os, re

SRC = os.path.join(os.path.dirname(__file__), "..", "data", "_frameplan.txt")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "companies")
NOW = "2026-06-06T00:00:00Z"

DOMAIN_BY_PREFIX = {  # from FramePlan section structure
    "RE-": "renewable_energy", "BLD-": "buildings_infrastructure", "IND-": "industrial_production",
}

def main():
    text = open(SRC, encoding="utf-8").read()
    # split into company blocks
    parts = re.split(r'(Company\s+\d+\s+[—-]\s+)', text)
    blocks = []
    for i in range(1, len(parts), 2):
        blocks.append(parts[i] + parts[i+1])
    os.makedirs(OUT, exist_ok=True)
    index = []
    for blk in blocks:
        # header: "Company N — <Name> (TIER) Type: <type> 1. TECHNOLOGY..."
        m = re.match(r'Company\s+\d+\s+[—-]\s+(.+?)\s+\(([^)]+)\)\s+Type:\s+(.+?)\s+\d+\.\s', blk, re.S)
        if not m:
            continue
        name, tier, ctype = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        # field | value pairs (value runs to end of that doc-line)
        fields = {}
        for fm in re.finditer(r'(?m)^([a-z_]+)\s*\|\s*(.+?)\s*$', blk):
            fields[fm.group(1)] = fm.group(2).strip()
        tech_id = fields.get("technology_id", name.replace(" ", "_")[:20])
        prefix = next((p for p in DOMAIN_BY_PREFIX if tech_id.startswith(p)), None)
        domain = DOMAIN_BY_PREFIX.get(prefix, fields.get("domain"))

        record = {
            "company_id_local": tech_id,
            "company_name": name,
            "tier": tier,                      # TOP/MID/DEEP-TECH/LOCAL
            "company_type": ctype,
            "domain": domain,
            "source": "frameplan_doc",
            "ingested_at": NOW,
            # the technology record (one per company here; schema allows N later)
            "technology": {
                "technology_id": tech_id,
                "technology_name": fields.get("technology_name"),
                "technology_category": fields.get("technology_category"),
                "sub_domain": fields.get("sub_domain"),
                "description": fields.get("technology_description"),
                "problem_solved": fields.get("problem_solved"),
                "innovation_summary": fields.get("innovation_summary"),
                "unique_selling_points": fields.get("unique_selling_points"),
                "keywords": fields.get("keywords"),
                "application_area": fields.get("application_area"),
                "target_industries": fields.get("target_industries"),
                "potential_customers": fields.get("potential_customers"),
                "trl_level": fields.get("trl_level"),
                "mrl_level": fields.get("mrl_level"),
                "development_stage": fields.get("development_stage"),
                "patent_status": fields.get("patent_status"),
                "patent_jurisdiction": fields.get("patent_jurisdiction"),
                "ip_owner": fields.get("ip_owner"),
                "institution_name": fields.get("institution_name"),
                "dsir_recognition_status": fields.get("dsir_recognition_status"),
                "wipo_green_listed": fields.get("wipo_green_listed"),
                "estimated_market_size": fields.get("estimated_market_size"),
                "preferred_license_type": fields.get("preferred_license_type"),
                "royalty_expectation": fields.get("royalty_expectation"),
                "upfront_cost": fields.get("upfront_cost"),
                "certification_status": fields.get("certification_status"),
                "routing_tier": fields.get("routing_tier"),
                "estimated_deal_value": fields.get("estimated_deal_value"),
                "nrdc_revenue_share": fields.get("nrdc_revenue_share"),
            },
            "_raw_fields": fields,  # keep everything we parsed, nothing lost
        }
        with open(os.path.join(OUT, f"{tech_id}.json"), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, ensure_ascii=False)
        index.append({"company_id_local": tech_id, "company_name": name, "tier": tier,
                      "domain": domain, "sub_domain": fields.get("sub_domain"),
                      "trl_level": fields.get("trl_level"), "fields_parsed": len(fields)})
        print(f"  {tech_id:<14}{name:<38}{tier:<16}fields={len(fields)}")
    with open(os.path.join(os.path.dirname(__file__), "..", "data", "companies_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    print(f"\nwrote {len(index)} company records -> data/companies/")

if __name__ == "__main__":
    main()
