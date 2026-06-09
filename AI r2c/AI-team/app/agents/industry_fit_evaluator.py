import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.technology import TechnologyProfile
from app.models.industry import IndustryRequirement
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


FIT_ANALYSIS_PROMPT = """You are an industry fit analyst. Evaluate how well a technology matches an industry requirement.

Technology: {tech_name}
Overall Fit Score: {score:.1f}/100
TRL Level: {trl_level}
Patent Status: {patent_status}
Manufacturing Readiness: {manufacturing_readiness}
Scalability: {scalability}
Market Demand: {market_demand}

Industry Requirement: {requirement_text}

Generate a JSON object with:
1. "strengths": array of 3-4 key strengths
2. "risks": array of 2-3 potential risks
3. "reasons": array of brief reasons explaining the score

Respond with valid JSON only."""


class IndustryFitEvaluator:
    async def evaluate(
        self,
        db: Session,
        technology: TechnologyProfile,
        requirement: IndustryRequirement,
    ) -> Dict[str, Any]:
        try:
            domain_score = 100 if technology.domain == requirement.domain else 0
            trl_score = self._calculate_trl_score(technology.trl_level, requirement.required_trl)
            patent_score = self._map_patent_status(technology.patent_status)
            manufacturing_score = self._map_manufacturing_readiness(technology.manufacturing_readiness)
            scalability_score = self._map_scalability(technology.scalability)
            market_score = self._estimate_market_score(technology.market_demand or "Medium")

            certs_available = len(technology.certifications_available) if technology.certifications_available else 0
            certs_required = len(technology.certifications_required) if technology.certifications_required else 1
            certification_score = (certs_available / certs_required) * 100 if certs_required > 0 else 0

            total_score = (
                domain_score * 0.25 +
                trl_score * 0.20 +
                patent_score * 0.15 +
                certification_score * 0.10 +
                manufacturing_score * 0.15 +
                scalability_score * 0.10 +
                market_score * 0.05
            )

            if total_score >= 80:
                fit_level = "HIGH"
            elif total_score >= 60:
                fit_level = "MEDIUM"
            else:
                fit_level = "LOW"

            ai_analysis = {"strengths": [], "risks": [], "reasons": []}
            try:
                prompt = FIT_ANALYSIS_PROMPT.format(
                    tech_name=technology.technology_name,
                    score=total_score,
                    trl_level=technology.trl_level,
                    patent_status=technology.patent_status,
                    manufacturing_readiness=technology.manufacturing_readiness,
                    scalability=technology.scalability,
                    market_demand=technology.market_demand or "Medium",
                    requirement_text=requirement.problem_statement,
                )
                ai_analysis = await llm_service.generate_json(prompt)
            except Exception as e:
                logger.warning(f"AI analysis failed, using defaults: {str(e)}")

            return {
                "industry_fit": fit_level,
                "score": round(total_score, 1),
                "strengths": ai_analysis.get("strengths", []),
                "risks": ai_analysis.get("risks", []),
                "reasons": ai_analysis.get("reasons", []),
                "confidence_score": round(total_score / 100.0, 2),
            }
        except Exception as e:
            logger.error(f"Error evaluating industry fit: {str(e)}")
            raise

    @staticmethod
    def _calculate_trl_score(tech_trl: int, required_trl: int) -> float:
        if tech_trl >= required_trl:
            return 100.0
        return (tech_trl / required_trl) * 100

    @staticmethod
    def _map_patent_status(status: str) -> float:
        mapping = {"Granted": 100.0, "Pending": 60.0}
        return mapping.get(status, 30.0)

    @staticmethod
    def _map_manufacturing_readiness(readiness: str) -> float:
        mapping = {"Ready": 100.0, "Scaling": 70.0}
        return mapping.get(readiness, 30.0)

    @staticmethod
    def _map_scalability(scalability: str) -> float:
        mapping = {"High": 100.0, "Medium": 70.0}
        return mapping.get(scalability, 30.0)

    @staticmethod
    def _estimate_market_score(market_demand: str) -> float:
        mapping = {"High": 100.0, "Medium": 70.0}
        return mapping.get(market_demand, 30.0)
