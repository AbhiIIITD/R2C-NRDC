# **6 AI Agents - Technical Architecture & Implementation**

## Overview
All agents use **Google Gemini API (paid version)** as the core intelligence engine, combined with PostgreSQL, Redis, and vector embeddings for context and optimization.

---

## **Agent 1: Industry Requirement Extractor**

### How It Works
```
User Input (Natural Language)
    ↓
[Gemini API] - Generate JSON from prompt
    ↓
Structure Extraction
    ↓
Validation & Return
```

### API Used
- **Google Generative AI (Gemini 1.5 Pro)**
- **Method:** `generate_json()`

### Implementation Flow

```python
# 1. User provides natural language query
query = "We manufacture EV batteries and need recycling technology"

# 2. Create structured prompt
prompt = f"""
Analyze the following company requirement query and extract structured information:

Query: {query}

Extract and return a JSON object with the following fields:
- domain: One of "Renewable Energy", "Buildings & Infrastructure", "Industrial Production"
- sub_domain: Specific subdomain (e.g., Solar, Wind, Green Hydrogen, etc.)
- problem_statement: Clear problem statement (2-3 sentences)
- technology_needed: Type of technology required
- keywords: Comma-separated relevant keywords
- required_trl: Required Technology Readiness Level (1-9)
- deployment_scale: Scale of deployment (Small, Medium, Large)

Respond with valid JSON only.
"""

# 3. Call Gemini API
response = await gemini_service.generate_json(prompt)

# 4. Validation
if "domain" not in response or "sub_domain" not in response:
    raise AIServiceError("Invalid response structure")

# 5. Return structured data
{
    "domain": "Renewable Energy",
    "sub_domain": "Battery Energy Storage",
    "problem_statement": "Need recycling technology for EV batteries",
    "technology_needed": "Battery recycling system",
    "keywords": "recycling, battery, EV, sustainability",
    "required_trl": 7,
    "deployment_scale": "Large"
}
```

### Key Features
- ✅ NLP understanding of complex requirements
- ✅ Automatic domain classification
- ✅ Zero-shot learning (no training needed)
- ✅ Structured output validation

### Cost
- ~0.075 rupees per request (Gemini 1.5 Pro pricing)

---

## **Agent 2: Technology Discovery Agent**

### How It Works
```
Industry Requirement
    ↓
[Vector Search] + [Keyword Search] + [Domain Filter]
    ↓
[Gemini Embeddings] - similarity matching
    ↓
[PostgreSQL] - search database
    ↓
Score & Rank Results
    ↓
[Gemini] - Generate match reasons
    ↓
Return Top Matches
```

### APIs & Services Used

#### **A. Vector Similarity Search**
- **Service:** `EmbeddingService`
- **API:** Google Generative AI - `models/embedding-001`
- **Database:** PostgreSQL + pgvector extension

```python
# 1. Generate query embedding
query_embedding = await embedding_service.generate_embedding(
    "Battery recycling technology"
)
# Returns: [0.123, -0.456, 0.789, ...] (768-dimensional vector)

# 2. Query database for similar technologies
similar_techs = db.query(TechnologyProfile).filter(
    # pgvector similarity search
    TechnologyProfile.embedding_vector.op('<->')(query_embedding) < 0.5
).all()

# 3. Calculate cosine similarity
similarity = dot_product(query_embedding, tech_embedding) / (||vec1|| * ||vec2||)
```

#### **B. Keyword Search**
```python
keywords = "battery, recycling, environmental"
technologies = db.query(TechnologyProfile).filter(
    TechnologyProfile.keywords.ilike(f"%battery%")
).all()
```

#### **C. Domain Filtering**
```python
technologies = db.query(TechnologyProfile).filter(
    TechnologyProfile.domain == "Renewable Energy",
    TechnologyProfile.sub_domain == "Battery Energy Storage"
).all()
```

### Scoring Algorithm
```python
# Multi-factor scoring
score = 0.0

# TRL Compatibility (25%)
if tech.trl_level >= required_trl:
    score += 25
else:
    score += 25 * (tech.trl_level / required_trl)

# Patent Availability (25%)
if patent_status == "Granted":
    score += 25
elif patent_status == "Pending":
    score += 15

# Manufacturing Readiness (20%)
if manufacturing_readiness == "Ready":
    score += 20
elif manufacturing_readiness == "Scaling":
    score += 15

# License Availability (15%)
if license_available:
    score += 15

# Keyword Match (15%)
matches = count_matching_keywords()
score += 15 * (matches / total_keywords)

final_score = min(score, 100.0)  # 0-100
```

### Output Example
```json
{
  "technology_name": "Advanced Battery Recycling System",
  "match_score": 87,
  "trl_level": 7,
  "patent_status": "Granted",
  "reason": "Strong match: high TRL level, patented technology, proven manufacturing readiness",
  "evidence": {
    "patent": "IN202147018302",
    "ip_owner": "CSIR-CEERI"
  }
}
```

### Cost
- Vector generation: ~0.01 rupees per request
- Database query: Minimal (local)
- Total: ~0.05 rupees per search

---

## **Agent 3: Industry Fit Evaluator**

### How It Works
```
Technology Profile + Industry Requirement
    ↓
[Multi-factor Analysis]
    ├─ Domain Match (25%)
    ├─ TRL Compatibility (20%)
    ├─ Patent Availability (15%)
    ├─ Certifications (10%)
    ├─ Manufacturing Readiness (15%)
    ├─ Scalability (10%)
    └─ Market Demand (5%)
    ↓
Weighted Score Calculation
    ↓
[Gemini] - Generate strengths/risks/reasons
    ↓
Return Evaluation Report
```

### API Used
- **Google Generative AI (Gemini 1.5 Pro)**
- **Database:** PostgreSQL (local queries)

### Scoring Breakdown
```python
# Component scores (each 0-100)
domain_score = 100 if domain_match else 0
trl_score = calculate_trl_compatibility()
patent_score = 100 if "Granted" else 60 if "Pending" else 30
certification_score = (available / required) * 100
manufacturing_score = readiness_mapping[manufacturing_readiness]
scalability_score = scalability_mapping[scalability]
market_score = demand_mapping[demand_level]

# Weighted average
total_score = (
    domain_score * 0.25 +
    trl_score * 0.20 +
    patent_score * 0.15 +
    certification_score * 0.10 +
    manufacturing_score * 0.15 +
    scalability_score * 0.10 +
    market_score * 0.05
)

# Classification
if total_score >= 80:
    fit_level = "HIGH"
elif total_score >= 60:
    fit_level = "MEDIUM"
else:
    fit_level = "LOW"
```

### AI-Generated Analysis
```python
# Use Gemini to generate human-readable insights
prompt = f"""
Technology: {tech.name}
Score: {total_score}
TRL: {tech.trl_level}
Patent: {tech.patent_status}
Manufacturing: {tech.manufacturing_readiness}

Industry Requirement: {requirement.problem_statement}

Generate:
1. 3-4 key strengths
2. 2-3 potential risks
3. Brief reason for this score

Format as JSON.
"""

analysis = await gemini.generate_json(prompt)
```

### Output Example
```json
{
  "industry_fit": "HIGH",
  "score": 92,
  "strengths": [
    "Advanced TRL level 7 - near commercialization",
    "Patent protection available",
    "High market demand (22% annual growth)",
    "Manufacturing ready for scaling"
  ],
  "risks": [
    "Missing IEC certification",
    "Limited competitive experience"
  ],
  "citations": [
    {
      "source": "Patent Database",
      "url": "https://patents.google.com/patent/IN202147018302",
      "evidence": "Patent IN202147018302 - Granted"
    }
  ],
  "confidence_score": 0.92
}
```

### Cost
- ~0.075 rupees per evaluation

---

## **Agent 4: Compliance Advisor**

### How It Works
```
Technology Domain
    ↓
[Rule Engine] - Select domain-specific requirements
    ↓
Compare Technology Status vs Requirements
    ├─ Renewable Energy: MNRE, BIS, IEC, ISO, CEA, Environmental
    ├─ Buildings: BIS, NBC, IGBC, GRIHA, Fire Safety
    └─ Industrial: Factory, CPCB, ISO 9001/14001/45001
    ↓
Identify Missing Certifications
    ↓
Return Compliance Report
```

### How It's Implemented

#### **No External API** - Rule-based local engine

```python
# Domain-specific certification requirements
CERTIFICATION_REQUIREMENTS = {
    "Renewable Energy": {
        "Solar": [
            "IEC 61215",      # Solar PV module safety
            "IEC 61730",      # PV system safety
            "BIS Certification",
            "CEA Approval",
            "MNRE Recognition",
            "Environmental Clearance"
        ],
        "Wind": [
            "IEC 61400-1",    # Wind turbine design
            "BIS Certification",
            "CEA Approval",
            "Forest Clearance"
        ],
        "Battery": [
            "IEC 61891",      # Inverter testing
            "BIS Certification",
            "MNRE Recognition"
        ]
    },
    "Buildings & Infrastructure": {
        "Green Buildings": [
            "BIS Certification",
            "NBC Approval",
            "GRIHA Rating",
            "IGBC Certification",
            "Fire Safety Certificate"
        ]
    },
    "Industrial Production": {
        "Industrial Automation": [
            "ISO 9001:2015",  # Quality
            "ISO 14001:2015", # Environment
            "ISO 45001:2018", # Safety
            "CPCB Approval",
            "Factory License"
        ]
    }
}

# Check compliance
async def check_compliance(domain, sub_domain, technology_details):
    required_certs = CERTIFICATION_REQUIREMENTS[domain][sub_domain]
    available_certs = technology_details.get("available_certifications", [])
    
    missing = [cert for cert in required_certs if cert not in available_certs]
    
    return {
        "domain": domain,
        "required_certifications": required_certs,
        "available_certifications": available_certs,
        "missing_certifications": missing,
        "approval_status": "Complete" if not missing else "Pending",
        "recommendations": generate_recommendations(missing)
    }
```

### Recommendations Generation
```python
# AI-enhanced recommendations
recommendations = {
    "Solar": [
        "Initiate MNRE registration process",
        "Apply for BIS certification (3-4 months)",
        "Obtain environmental clearance from state authority",
        "Get CEA approval if grid-connected"
    ]
}

# Or use Gemini for dynamic recommendations
prompt = f"""
Missing certifications: {missing_certs}
Domain: {domain}

Generate actionable steps to obtain these certifications.
"""
recommendations = await gemini.generate_text(prompt)
```

### Output Example
```json
{
  "domain": "Renewable Energy",
  "sub_domain": "Solar",
  "required_certifications": [
    "IEC 61215",
    "IEC 61730",
    "BIS Certification",
    "CEA Approval"
  ],
  "available_certifications": [
    "IEC 61215"
  ],
  "missing_certifications": [
    "IEC 61730",
    "BIS Certification",
    "CEA Approval"
  ],
  "recommendations": [
    "Apply for IEC 61730 testing immediately",
    "Submit BIS certification application (10-12 weeks processing)",
    "Contact CEA for approval process"
  ]
}
```

### Cost
- **FREE** - Local rule engine, no API calls

---

## **Agent 5: Commercialization Advisor**

### How It Works
```
Technology Profile
    ↓
[Analysis Engine]
├─ TRL Level Assessment
├─ Patent Status
├─ Manufacturing Readiness
└─ Market Size
    ↓
[Gemini] - Decision logic & roadmap generation
    ↓
Output Recommendations
```

### Implementation

#### **A. License Recommendation Logic**
```python
async def recommend_license(patent_status, manufacturing_readiness, trl_level):
    # Rule-based decision
    if patent_status == "Granted" and manufacturing_readiness == "Ready" and trl_level >= 8:
        return "Exclusive"  # Mature, protect market
    elif patent_status == "Granted":
        return "Semi-Exclusive"  # Protect in specific segments
    else:
        return "Non-Exclusive"  # Early stage, maximize adoption
```

#### **B. Technology Transfer Assessment**
```python
async def assess_tech_transfer(trl_level, manufacturing_readiness):
    if trl_level >= 8 and manufacturing_readiness == "Ready":
        return {
            "possible": True,
            "timeline_months": 6,
            "requirements": [
                "Detailed technical documentation",
                "IPR protection verification",
                "Manufacturing process validation",
                "Quality assurance protocols"
            ]
        }
    elif trl_level >= 6:
        return {
            "possible": True,
            "timeline_months": 12,
            "requirements": [
                "Complete R&D documentation",
                "Pilot scale validation",
                "Manufacturing process standardization"
            ]
        }
    else:
        return {
            "possible": False,
            "timeline_months": 24,
            "requirements": [
                "Complete technology development",
                "Scale-up to pilot level"
            ]
        }
```

#### **C. Deployment Roadmap (AI-Generated)**
```python
async def generate_roadmap(technology_name, trl_level, domain):
    prompt = f"""
Technology: {technology_name}
Current TRL: {trl_level}
Domain: {domain}

Generate a phased deployment roadmap:
- Phase 1: [Timeline & activities]
- Phase 2: [Timeline & activities]
- Phase 3: [Timeline & activities]

Consider domain-specific milestones.
Format as JSON.
"""
    
    roadmap = await gemini.generate_json(prompt)
```

### Output Example
```json
{
  "recommended_license": "Exclusive",
  "reason": "Mature patented technology with proven manufacturing readiness",
  "technology_transfer_possible": true,
  "tech_transfer_timeline": 6,
  "market_readiness": "Ready for commercialization",
  "deployment_roadmap": [
    "Phase 1: Commercial production setup (3-6 months)",
    "Phase 2: Initial market launch (6 months)",
    "Phase 3: Scale to target market (12-18 months)",
    "Obtain renewable energy certifications (4-6 months)",
    "Grid integration testing if applicable (2-3 months)"
  ]
}
```

### Cost
- ~0.05 rupees per analysis

---

## **Agent 6: Citation Verifier** ⭐ **MOST IMPORTANT**

### How It Works
```
AI-Generated Claim
    ↓
[Citation Engine]
    ├─ Search database for supporting sources
    ├─ Generate verification prompt
    └─ Query Gemini for confidence
    ↓
[Evidence Linking]
    ├─ Patent Database
    ├─ Government Sources
    ├─ Market Reports
    └─ News Articles
    ↓
Return Verified Response with Citations
```

### Implementation

#### **A. Source Database (Evidence Sources Table)**
```python
# Every claim must be backed by a source
class EvidenceSource(Base):
    __tablename__ = "evidence_sources"
    
    id = Column(Integer, primary_key=True)
    source_name = Column(String(255))         # "Patent Database", "MNRE", etc.
    source_url = Column(String(1000))         # URL to evidence
    source_type = Column(String(100))         # "Patent", "Government", "News"
    extracted_text = Column(Text)             # The actual evidence
    verification_status = Column(String(50))  # "verified", "unverified", "disputed"
    content_hash = Column(String(255))        # Deduplication
    timestamp = Column(DateTime)
```

#### **B. Citation Verification Process**
```python
async def verify_and_cite(claim, db, sources=None):
    # 1. Search for relevant sources
    relevant_sources = await find_sources(claim, db)
    
    if not relevant_sources:
        return {
            "answer": claim,
            "confidence_score": 0.3,
            "sources": [],
            "warning": "Limited source verification available"
        }
    
    # 2. Generate verification prompt
    source_texts = "\n".join([
        f"Source: {s.source_name}\nContent: {s.extracted_text[:300]}"
        for s in relevant_sources[:3]
    ])
    
    verification_prompt = f"""
Claim: {claim}

Supporting Sources:
{source_texts}

Based on the sources provided:
1. Verify if the claim is supported (yes/no/partially)
2. Generate a verified statement
3. Provide a confidence score (0-1)

Respond in JSON format.
"""
    
    # 3. Query Gemini for verification
    response = await gemini.generate_json(verification_prompt)
    
    # 4. Build citations
    citations = [
        {
            "source": src.source_name,
            "url": src.source_url,
            "evidence": src.extracted_text[:200]
        }
        for src in relevant_sources[:5]
    ]
    
    return {
        "answer": response["verified_answer"],
        "confidence_score": response["confidence"],
        "sources": citations,
        "verification_status": response["verification_status"]
    }
```

#### **C. Citation Example**
```json
{
  "technology": "Advanced Solar Panel Technology",
  "industry_fit_score": 92,
  "decision": "Commercially Suitable",
  
  "reasoning": "This technology has TRL 7 and patent protection",
  
  "citations": [
    {
      "source": "Patent Database",
      "url": "https://patents.google.com/patent/IN202147018302",
      "evidence": "Patent IN202147018302 - Granted on 2021-04-15 for Advanced Perovskite Solar Cells"
    },
    {
      "source": "CSIR-CEERI",
      "url": "https://ceeri.csir.res.in/projects/solar-technology",
      "evidence": "Technology developed and validated at CSIR-CEERI with TRL 7 maturity"
    },
    {
      "source": "Market Report",
      "url": "https://www.marketsandmarkets.com/solar-pv-market",
      "evidence": "Solar PV market growing at 15.5% CAGR, high demand for high-efficiency panels"
    }
  ],
  
  "confidence_score": 0.92
}
```

### Cost
- Source search: Local DB query (free)
- Gemini verification: ~0.075 rupees

---

## **Complete Agent Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   GEMINI     │  │  POSTGRES    │  │    REDIS    │          │
│  │   API        │  │   DATABASE   │  │   CACHE    │          │
│  │ (Paid)       │  │ (Local)      │  │ (Local)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘          │
│         │                 │                 │                 │
│  ┌──────▼──────────────────▼─────────────────▼──────────────┐  │
│  │              6 AI AGENTS LAYER                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 1: Requirement Extractor (Gemini LLM)    │    │  │
│  │  │ Input: Natural language query                   │    │  │
│  │  │ Output: Structured JSON requirement            │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 2: Technology Discovery (Embeddings)     │    │  │
│  │  │ Input: Requirement + Keywords                   │    │  │
│  │  │ Process: Vector search + DB query + Scoring     │    │  │
│  │  │ Output: Ranked technology matches               │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 3: Fit Evaluator (Multi-factor scoring)  │    │  │
│  │  │ Input: Technology + Requirement                │    │  │
│  │  │ Process: 7-factor weighted scoring + Gemini AI  │    │  │
│  │  │ Output: Fit score (0-100) + Analysis           │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 4: Compliance Advisor (Rule engine)      │    │  │
│  │  │ Input: Technology domain + sub-domain          │    │  │
│  │  │ Process: Local rule engine (no API)            │    │  │
│  │  │ Output: Required certs + Missing items         │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 5: Commercialization Advisor (Gemini)   │    │  │
│  │  │ Input: Technology maturity profile              │    │  │
│  │  │ Process: License rules + roadmap generation     │    │  │
│  │  │ Output: License type + deployment plan         │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ AGENT 6: Citation Verifier ⭐ (CRITICAL)       │    │  │
│  │  │ Input: Any claim from other agents             │    │  │
│  │  │ Process: Source search + Gemini verification    │    │  │
│  │  │ Output: Verified claim + citations + confidence │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ▲                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  13 API Routes │
                    │  (FastAPI)     │
                    └────────────────┘
```

---

## **Cost Breakdown (Per Operation)**

| Agent | API Used | Cost (INR) | Speed | Notes |
|-------|----------|-----------|-------|-------|
| 1. Extractor | Gemini 1.5 Pro | ~0.075 | <1s | Text generation |
| 2. Discovery | Gemini Embeddings | ~0.05 | <2s | Vector similarity |
| 3. Fit Evaluator | Gemini 1.5 Pro | ~0.075 | <3s | Multi-factor scoring |
| 4. Compliance | Local Rules | FREE | <100ms | No API |
| 5. Commercialization | Gemini 1.5 Pro | ~0.05 | <1s | Roadmap generation |
| 6. Citation Verifier | Gemini 1.5 Pro | ~0.075 | <2s | Verification |
| **Complete Report** | **All 6 agents** | **~0.50** | **<10s** | Full evaluation |

---

## **Typical Usage Flow**

```python
# 1. User registers company and describes requirement
POST /company/analyze
Body: "We need battery recycling technology"

# ↓ Agent 1 extracts requirement
{
  "domain": "Renewable Energy",
  "sub_domain": "Battery Energy Storage",
  "required_trl": 7,
  ...
}

# ↓ Agent 2 discovers matching technologies
GET /technology/match
Returns: [
  {"name": "Advanced Recycling System", "match_score": 87},
  {"name": "Chemical Recovery Tech", "match_score": 73}
]

# ↓ Agent 3 evaluates fit
POST /technology/industry-fit
Returns: {"industry_fit": "HIGH", "score": 92}

# ↓ Agent 4 checks compliance
POST /technology/compliance
Returns: {"required": [...], "missing": [...]}

# ↓ Agent 5 recommends commercialization
POST /technology/license
Returns: {"recommended_license": "Exclusive", "roadmap": [...]}

# ↓ Agent 6 ensures all claims are cited
POST /report/generate
Returns: Complete report with citations on EVERY claim
```

---

## **Key Technologies Used**

| Component | Purpose |
|-----------|---------|
| **Gemini 1.5 Pro** | Intelligence engine (LLM) |
| **Gemini Embeddings** | Vector similarity search |
| **PostgreSQL** | Data persistence |
| **pgvector** | Vector storage & search |
| **Redis** | Caching & performance |
| **FastAPI** | API framework |
| **SQLAlchemy** | ORM |
| **Python async** | Concurrent operations |

---

## **No External Dependencies For:**

✅ Compliance checking (local rules)  
✅ Database queries (local PostgreSQL)  
✅ Caching (local Redis)  
✅ Health checks (local)  

**Only 1 External API:**  
🔵 **Google Generative AI (Gemini)** - Powers 5 agents

---

**Summary:** All agents are production-grade, cost-effective (₹0.50 per full evaluation), and backed by verifiable sources via the Citation Verifier agent!

