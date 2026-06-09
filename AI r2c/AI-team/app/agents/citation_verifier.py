import logging
import hashlib
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.evidence import EvidenceSource
from app.services.llm_service import llm_service
from app.services.web_research_service import GovSourceScraper

logger = logging.getLogger(__name__)


VERIFICATION_PROMPT = """You are a fact-checker for technology claims. Verify the following claim using the provided supporting evidence.

Claim: {claim}

Evidence from sources:
{sources}

Based ONLY on the evidence provided, respond with JSON:
1. "verified_answer": a concise verified statement
2. "confidence": confidence score 0.0 to 1.0
3. "verification_status": "verified", "partially_verified", or "unverified"
4. "missing_info": what additional info would help verify this better

Respond with valid JSON only."""


DYNAMIC_RESEARCH_PROMPT = """Based on the following topic, identify what information is needed for verification.

Topic: {topic}
Domain: {domain}
Sub-domain: {sub_domain}

Generate a JSON object with:
1. "search_queries": array of 3-5 specific search queries to verify this topic against Indian regulations
2. "gov_sources_to_check": array of relevant Indian government sources (e.g., "Indian Patent Office", "BIS", "MNRE", "CPCB", "CEA", "IGBC")
3. "certification_standards": array of likely certification standards needed

Respond with valid JSON only."""


class CitationVerifier:
    def __init__(self):
        self.scraper = GovSourceScraper()

    async def verify_and_cite(
        self,
        claim: str,
        db: Session,
        domain: str = "",
        sub_domain: str = "",
        max_sources: int = 5,
    ) -> Dict[str, Any]:
        try:
            db_sources = await self._find_db_sources(claim, db, max_sources)

            web_sources = await self.scraper.search_indian_gov(claim)

            all_evidence = []
            for src in db_sources:
                all_evidence.append(f"Source: {src.source_name}\nContent: {src.extracted_text[:300]}")

            for source_type, sources in web_sources.items():
                for s in sources[:3]:
                    all_evidence.append(f"Source: {s.get('source', source_type)}\nContent: {s.get('evidence', '')[:300]}")

            if not all_evidence:
                return {
                    "answer": claim,
                    "confidence_score": 0.2,
                    "sources": [],
                    "verification_status": "unverified",
                    "warning": "No evidence found. Consider providing source documents.",
                    "suggested_searches": [
                        f"site:ipindia.gov.in {claim}",
                        f"site:bis.gov.in {claim}",
                        f"site:mnre.gov.in {claim}",
                    ],
                }

            source_text = "\n\n".join(all_evidence[:5])
            prompt = VERIFICATION_PROMPT.format(claim=claim, sources=source_text)

            result = {"verified_answer": claim, "confidence": 0.5, "verification_status": "unverified", "missing_info": ""}
            try:
                result = await llm_service.generate_json(prompt)
            except Exception as e:
                logger.warning(f"AI verification failed: {str(e)}")

            citations = []
            for src in db_sources[:5]:
                citations.append({
                    "source": src.source_name,
                    "url": src.source_url or "N/A",
                    "evidence": src.extracted_text[:200],
                })
            for source_type, sources in web_sources.items():
                for s in sources[:3]:
                    if len(citations) >= 8:
                        break
                    citations.append({
                        "source": s.get("source", source_type),
                        "url": s.get("url", "N/A"),
                        "evidence": s.get("evidence", "")[:200],
                    })

            return {
                "answer": result.get("verified_answer", claim),
                "confidence_score": result.get("confidence", 0.5),
                "sources": citations,
                "verification_status": result.get("verification_status", "unverified"),
                "missing_info": result.get("missing_info", ""),
            }
        except Exception as e:
            logger.error(f"Error verifying claim: {str(e)}")
            raise
        finally:
            await self.scraper.close()

    async def research_requirements(self, topic: str, domain: str, sub_domain: str) -> Dict[str, Any]:
        try:
            prompt = DYNAMIC_RESEARCH_PROMPT.format(topic=topic, domain=domain, sub_domain=sub_domain)
            research_plan = await llm_service.generate_json(prompt)

            gov_data = await self.scraper.search_indian_gov(topic)

            web_results = await self.scraper.research_topic(topic)

            return {
                "research_plan": research_plan,
                "gov_sources_found": gov_data,
                "web_results": web_results,
            }
        except Exception as e:
            logger.error(f"Research failed: {str(e)}")
            return {"error": str(e)}
        finally:
            await self.scraper.close()

    async def add_citation_source(
        self,
        db: Session,
        source_name: str,
        source_url: str,
        source_type: str,
        extracted_text: str,
    ) -> bool:
        try:
            content_hash = hashlib.sha256(extracted_text.encode()).hexdigest()
            existing = db.query(EvidenceSource).filter(
                EvidenceSource.content_hash == content_hash
            ).first()
            if existing:
                logger.info(f"Source already exists: {source_name}")
                return False

            new_source = EvidenceSource(
                source_name=source_name,
                source_url=source_url,
                source_type=source_type,
                extracted_text=extracted_text,
                verification_status="verified",
                content_hash=content_hash,
            )
            db.add(new_source)
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error adding citation source: {str(e)}")
            db.rollback()
            return False

    async def _find_db_sources(self, claim: str, db: Session, max_sources: int) -> List[EvidenceSource]:
        try:
            return db.query(EvidenceSource).filter(
                EvidenceSource.verification_status != "disputed"
            ).limit(max_sources).all()
        except Exception as e:
            logger.error(f"Error finding sources: {str(e)}")
            return []
