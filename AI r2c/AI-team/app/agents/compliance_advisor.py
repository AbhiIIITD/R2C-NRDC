import logging
from typing import Dict, Any, List

from app.services.llm_service import llm_service
from app.services.web_research_service import GovSourceScraper

logger = logging.getLogger(__name__)


RECOMMENDATION_PROMPT = """You are a regulatory compliance expert for Indian markets. Given the following domain information, provide actionable compliance recommendations.

Domain: {domain}
Sub-domain: {sub_domain}
Missing Certifications: {missing_certs}
Available Certifications: {available_certs}

For each missing certification, provide a JSON with:
1. "recommendation": actionable step-by-step guidance
2. "gov_body": the Indian government body responsible
3. "estimated_timeline": estimated time to obtain
4. "priority": "high", "medium", or "low"

Also add:
5. "additional_notes": any other compliance considerations for this domain in India

Respond with JSON: {{"recommendations": [{{"certification": "...", "recommendation": "...", "gov_body": "...", "estimated_timeline": "...", "priority": "..."}}], "additional_notes": "..."}}"""


DOMAIN_RESEARCH_PROMPT = """You are a compliance researcher for Indian regulations. For the given domain and sub-domain, identify the likely regulatory and certification requirements.

Domain: {domain}
Sub-domain: {sub_domain}
Technology Type: {tech_type}

Consider Indian regulatory bodies like:
- BIS (Bureau of Indian Standards)
- MNRE (Ministry of New & Renewable Energy)
- CEA (Central Electricity Authority)
- CPCB (Central Pollution Control Board)
- IGBC (Indian Green Building Council)
- GRIHA (Green Rating for Integrated Habitat Assessment)
- NBC (National Building Code)
- Factory Inspectorate
- State Pollution Control Boards

Respond with JSON:
1. "required_certifications": array of certification/approval names
2. "regulatory_bodies": array of relevant Indian regulatory bodies
3. "notes": compliance notes specific to Indian context

Respond with valid JSON only."""


class ComplianceAdvisor:
    def __init__(self):
        self.scraper = GovSourceScraper()

    async def check_compliance(
        self,
        domain: str,
        sub_domain: str,
        available_certifications: List[str] = None,
        technology_name: str = "",
    ) -> Dict[str, Any]:
        try:
            available_certifications = available_certifications or []

            required_certs = await self._discover_requirements(domain, sub_domain, technology_name)

            if not required_certs:
                required_certs = self._fallback_certs(domain, sub_domain)

            missing_certs = [c for c in required_certs if c not in available_certifications]

            recommendations = await self._generate_recommendations(
                missing_certs, available_certifications, domain, sub_domain
            )

            return {
                "domain": domain,
                "sub_domain": sub_domain,
                "required_certifications": required_certs,
                "available_certifications": available_certifications,
                "missing_certifications": missing_certs,
                "approval_status": "Complete" if not missing_certs else "Pending",
                "recommendations": recommendations,
            }
        except Exception as e:
            logger.error(f"Error checking compliance: {str(e)}")
            return self._fallback_response(domain, sub_domain, available_certifications or [])
        finally:
            await self.scraper.close()

    async def _discover_requirements(self, domain: str, sub_domain: str, tech_type: str) -> List[str]:
        try:
            prompt = DOMAIN_RESEARCH_PROMPT.format(
                domain=domain,
                sub_domain=sub_domain,
                tech_type=tech_type or sub_domain,
            )
            response = await llm_service.generate_json(prompt)
            certs = response.get("required_certifications", [])
            if certs:
                return certs
        except Exception as e:
            logger.warning(f"Dynamic discovery failed, using fallback: {str(e)}")
        return []

    async def _generate_recommendations(
        self,
        missing_certs: List[str],
        available_certs: List[str],
        domain: str,
        sub_domain: str,
    ) -> List[str]:
        if not missing_certs:
            return ["All certifications compliant."]

        try:
            prompt = RECOMMENDATION_PROMPT.format(
                domain=domain,
                sub_domain=sub_domain,
                missing_certs=", ".join(missing_certs),
                available_certs=", ".join(available_certs) or "None",
            )
            response = await llm_service.generate_json(prompt)

            recs_data = response.get("recommendations", [])
            if recs_data:
                result = []
                for r in recs_data:
                    cert = r.get("certification", "")
                    rec = r.get("recommendation", "")
                    body = r.get("gov_body", "")
                    timeline = r.get("estimated_timeline", "")
                    result.append(f"{cert}: {rec} (via {body}, ~{timeline})")
                notes = response.get("additional_notes", "")
                if notes:
                    result.append(f"Note: {notes}")
                return result
        except Exception as e:
            logger.warning(f"AI recommendation failed: {str(e)}")

        return self._fallback_recommendations(missing_certs)

    @staticmethod
    def _fallback_certs(domain: str, sub_domain: str) -> List[str]:
        mapping = {
            "Renewable Energy": {
                "Solar": ["IEC 61215", "IEC 61730", "BIS Certification", "CEA Approval", "MNRE Recognition"],
                "Wind": ["IEC 61400-1", "BIS Certification", "CEA Approval"],
                "Battery Energy Storage": ["IEC 61891", "BIS Certification", "MNRE Recognition"],
                "Green Hydrogen": ["ISO 22734", "BIS Certification", "MNRE Recognition"],
            },
            "Buildings & Infrastructure": {
                "Green Buildings": ["BIS Certification", "NBC Approval", "GRIHA Rating", "IGBC Certification", "Fire Safety Certificate"],
                "Smart Buildings": ["BIS Certification", "NBC Approval", "IGBC Certification", "Fire Safety Certificate"],
            },
            "Industrial Production": {
                "Industrial Automation": ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018", "CPCB Approval", "Factory License"],
            },
        }
        return mapping.get(domain, {}).get(sub_domain, ["ISO 9001:2015", "ISO 14001:2015"])

    @staticmethod
    def _fallback_recommendations(missing_certs: List[str]) -> List[str]:
        recommendations = []
        for cert in missing_certs:
            if "BIS" in cert:
                recommendations.append(f"Apply for {cert} from Bureau of Indian Standards (8-12 weeks processing)")
            elif "IEC" in cert:
                recommendations.append(f"Initiate {cert} testing with an NABL-accredited lab (6-10 weeks)")
            elif "ISO" in cert:
                recommendations.append(f"Obtain {cert} certification from an ISO registrar (4-8 weeks)")
            elif "MNRE" in cert:
                recommendations.append(f"Register with MNRE for renewable energy recognition")
            elif "CEA" in cert:
                recommendations.append(f"Submit CEA approval request to Central Electricity Authority")
            elif "CPCB" in cert:
                recommendations.append(f"Obtain CPCB consent to operate from State Pollution Control Board")
            elif "GRIHA" in cert:
                recommendations.append(f"Register project with GRIHA Council for green rating")
            elif "IGBC" in cert:
                recommendations.append(f"Register with IGBC for green building certification")
            elif "NBC" in cert:
                recommendations.append(f"Ensure compliance with National Building Code 2016")
            else:
                recommendations.append(f"Apply for {cert} certification (timeline varies by authority)")
        return recommendations

    @staticmethod
    def _fallback_response(domain: str, sub_domain: str, available: List[str]) -> Dict[str, Any]:
        required = ComplianceAdvisor._fallback_certs(domain, sub_domain)
        missing = [c for c in required if c not in available]
        return {
            "domain": domain,
            "sub_domain": sub_domain,
            "required_certifications": required,
            "available_certifications": available,
            "missing_certifications": missing,
            "approval_status": "Complete" if not missing else "Pending",
            "recommendations": ComplianceAdvisor._fallback_recommendations(missing),
        }
