import logging
from typing import Dict, Any, List
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.technology import TechnologyProfile
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


DISCOVERY_PROMPT = """Based on the following technology and requirement match data, provide a match analysis.

Technology: {tech_name}
Match Score: {score:.1f}/100
TRL Level: {trl_level}
Patent Status: {patent_status}
Manufacturing Readiness: {manufacturing_readiness}

Requirement Domain: {domain}
Requirement Sub-domain: {sub_domain}
Required TRL: {required_trl}

Generate a brief 1-2 sentence match reason explaining why this technology fits the requirement.
Return JSON with field: "reason" (string)."""


class TechnologyDiscoveryAgent:
    async def search(
        self,
        db: Session,
        domain: str,
        sub_domain: str,
        keywords: List[str],
        required_trl: int,
    ) -> List[Dict[str, Any]]:
        try:
            # Match within the same domain; the sub_domain is a scoring signal, not a
            # hard gate. The requirement extractor phrases sub_domains freely (e.g.
            # "Green Hydrogen" vs a registered "Green Hydrogen Electrolysers"), so an
            # exact sub_domain filter silently returned nothing. We now scope by domain
            # (exact, else case-insensitive contains) and rank by relevance.
            technologies = db.query(TechnologyProfile).filter(
                TechnologyProfile.domain == domain,
            ).all()
            if not technologies and domain:
                like = f"%{domain.lower()}%"
                technologies = db.query(TechnologyProfile).filter(
                    func.lower(TechnologyProfile.domain).like(like)
                ).all()

            # Score everything first (cheap), then only call the LLM for the top
            # matches. Generating a match reason per technology used to fire one LLM
            # call for EVERY candidate (e.g. 19), which blew past the caller's timeout
            # and returned nothing. Capping the explained set keeps discovery fast.
            scored = [
                (self._calculate_match_score(tech, required_trl, keywords, sub_domain), tech)
                for tech in technologies
            ]
            scored = [pair for pair in scored if pair[0] > 0]
            scored.sort(key=lambda pair: pair[0], reverse=True)
            top = scored[:8]

            results = []
            for score, tech in top:
                match_reason = ""
                try:
                    prompt = DISCOVERY_PROMPT.format(
                        tech_name=tech.technology_name,
                        score=score,
                        trl_level=tech.trl_level,
                        patent_status=tech.patent_status,
                        manufacturing_readiness=tech.manufacturing_readiness,
                        domain=domain,
                        sub_domain=sub_domain,
                        required_trl=required_trl,
                    )
                    analysis = await llm_service.generate_json(prompt)
                    match_reason = analysis.get("reason", "")
                except Exception:
                    pass

                results.append({
                    "id": tech.id,
                    "technology_name": tech.technology_name,
                    "match_score": round(score, 1),
                    "trl_level": tech.trl_level,
                    "patent_status": tech.patent_status,
                    "manufacturing_readiness": tech.manufacturing_readiness,
                    "match_reason": match_reason,
                })

            return results
        except Exception as e:
            logger.error(f"Error searching technologies: {str(e)}")
            raise

    @staticmethod
    def _calculate_match_score(
        tech: TechnologyProfile,
        required_trl: int,
        keywords: List[str],
        sub_domain: str = "",
    ) -> float:
        score = 0.0
        # Sub-domain relevance (replaces the old exact-match gate): full credit for an
        # exact match, partial credit when significant words overlap.
        if sub_domain and tech.sub_domain:
            sd, tsd = sub_domain.lower(), tech.sub_domain.lower()
            if sd == tsd:
                score += 20
            else:
                sd_words = {w for w in sd.split() if len(w) > 3}
                if sd_words and any(w in tsd for w in sd_words):
                    score += 12
        if required_trl and tech.trl_level >= required_trl:
            score += 20
        elif required_trl:
            score += 20 * (tech.trl_level / required_trl)
        else:
            score += 20

        if tech.patent_status == "Granted":
            score += 25
        elif tech.patent_status == "Pending":
            score += 15

        if tech.manufacturing_readiness == "Ready":
            score += 20
        elif tech.manufacturing_readiness == "Scaling":
            score += 15

        if tech.license_available:
            score += 15

        if keywords and tech.keywords:
            keyword_matches = sum(
                1 for kw in keywords
                if kw.lower() in tech.keywords.lower()
            )
            score += 15 * (keyword_matches / len(keywords))

        return min(score, 100.0)
