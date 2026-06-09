import logging
from typing import Dict, Any, List

from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


ROADMAP_PROMPT = """Generate a phased deployment roadmap for a technology.

Technology: {technology_name}
Current TRL Level: {trl_level}
Domain: {domain}

Generate a JSON object with a "phases" field containing 3-4 phase strings.
Each phase should include a timeline and specific activities.
Consider domain-specific milestones and regulatory requirements.

Respond with valid JSON only: {{"phases": ["Phase 1: ...", "Phase 2: ...", ...]}}"""


class CommercializationAdvisor:
    async def analyze(
        self,
        technology_name: str,
        trl_level: int,
        patent_status: str,
        manufacturing_readiness: str,
        domain: str,
    ) -> Dict[str, Any]:
        try:
            recommended_license = self._determine_license(patent_status, manufacturing_readiness, trl_level)
            tech_transfer = self._assess_tech_transfer(trl_level, manufacturing_readiness)
            roadmap = await self._generate_roadmap(technology_name, trl_level, domain)

            return {
                "recommended_license": recommended_license,
                "reason": f"Patent status ({patent_status}), TRL ({trl_level}), Manufacturing readiness ({manufacturing_readiness})",
                "technology_transfer_possible": tech_transfer["possible"],
                "tech_transfer_timeline": tech_transfer["timeline_months"],
                "market_readiness": self._assess_market_readiness(trl_level),
                "deployment_roadmap": roadmap,
            }
        except Exception as e:
            logger.error(f"Error analyzing commercialization: {str(e)}")
            raise

    @staticmethod
    def _determine_license(patent_status: str, manufacturing_readiness: str, trl_level: int) -> str:
        if patent_status == "Granted" and manufacturing_readiness == "Ready" and trl_level >= 8:
            return "Exclusive"
        elif patent_status == "Granted":
            return "Semi-Exclusive"
        return "Non-Exclusive"

    @staticmethod
    def _assess_tech_transfer(trl_level: int, manufacturing_readiness: str) -> Dict[str, Any]:
        if trl_level >= 8 and manufacturing_readiness == "Ready":
            return {
                "possible": True,
                "timeline_months": 6,
                "requirements": [
                    "Detailed technical documentation",
                    "IPR protection verification",
                    "Manufacturing process validation",
                    "Quality assurance protocols",
                ],
            }
        elif trl_level >= 6:
            return {
                "possible": True,
                "timeline_months": 12,
                "requirements": [
                    "Complete R&D documentation",
                    "Pilot scale validation",
                    "Manufacturing process standardization",
                ],
            }
        return {
            "possible": False,
            "timeline_months": 24,
            "requirements": [
                "Complete technology development",
                "Scale-up to pilot level",
            ],
        }

    @staticmethod
    def _assess_market_readiness(trl_level: int) -> str:
        if trl_level >= 8:
            return "Ready for commercialization"
        elif trl_level >= 6:
            return "Near market-ready (6-12 months)"
        elif trl_level >= 4:
            return "Under development (12-24 months)"
        return "Early stage research (24+ months)"

    async def _generate_roadmap(self, technology_name: str, trl_level: int, domain: str) -> List[str]:
        try:
            prompt = ROADMAP_PROMPT.format(
                technology_name=technology_name,
                trl_level=trl_level,
                domain=domain,
            )
            response = await llm_service.generate_json(prompt)
            return response.get("phases", self._default_roadmap())
        except Exception as e:
            logger.warning(f"Roadmap generation failed, using defaults: {str(e)}")
            return self._default_roadmap()

    @staticmethod
    def _default_roadmap() -> List[str]:
        return [
            "Phase 1: Commercial production setup (3-6 months)",
            "Phase 2: Initial market launch and pilot customers (6 months)",
            "Phase 3: Scale to target market segments (12-18 months)",
        ]
