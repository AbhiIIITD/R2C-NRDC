import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.services.llm_service import llm_service
from app.agents.industry_extractor import IndustryRequirementExtractor
from app.agents.technology_discovery import TechnologyDiscoveryAgent
from app.agents.industry_fit_evaluator import IndustryFitEvaluator
from app.agents.compliance_advisor import ComplianceAdvisor
from app.agents.commercialization_advisor import CommercializationAdvisor
from app.agents.citation_verifier import CitationVerifier

logger = logging.getLogger(__name__)


FINAL_RECOMMENDATION_PROMPT = """You are an AI technology commercialization advisor for the Indian market. Based on all the analysis results below, provide a final comprehensive recommendation.

## Industry Requirement
{requirement_summary}

## Technology Profile
{technology_summary}

## Fit Evaluation
{fit_evaluation}

## Compliance Check
{compliance_check}

## Commercialization Analysis
{commercialization}

## Verified Citations
{citations}

## Available Evidence Sources
{evidence_sources}

Based on ALL the above data, provide a final JSON recommendation with:
1. "overall_verdict": one of "HIGHLY RECOMMENDED", "RECOMMENDED", "CONDITIONALLY RECOMMENDED", "NOT RECOMMENDED"
2. "reasoning": detailed 3-5 sentence reasoning
3. "action_items": array of 3-5 specific actionable steps for the company
4. "risks": array of key risks
5. "next_steps": array of immediate next steps
6. "confidence": overall confidence score 0.0-1.0
7. "missing_data": what additional data would improve this recommendation

Respond with valid JSON only."""


class ComprehensiveAnalyzer:
    def __init__(self):
        self.extractor = IndustryRequirementExtractor()
        self.discovery = TechnologyDiscoveryAgent()
        self.fit_evaluator = IndustryFitEvaluator()
        self.compliance = ComplianceAdvisor()
        self.commercialization = CommercializationAdvisor()
        self.citation = CitationVerifier()

    async def analyze(
        self,
        db: Session,
        requirement_text: str,
        technology_id: int,
        company_id: int = 0,
    ) -> Dict[str, Any]:
        try:
            extracted = await self.extractor.extract(requirement_text)

            from app.models.technology import TechnologyProfile
            tech_obj = db.query(TechnologyProfile).filter(TechnologyProfile.id == technology_id).first()
            if not tech_obj:
                return {"error": "Technology not found"}
            from app.models.industry import IndustryRequirement

            requirement = IndustryRequirement(
                company_id=company_id or 1,
                problem_statement=extracted.get("problem_statement", requirement_text),
                technology_needed=extracted.get("technology_needed", ""),
                domain=extracted.get("domain", tech_obj.domain),
                sub_domain=extracted.get("sub_domain", tech_obj.sub_domain),
                keywords=extracted.get("keywords", ""),
                required_trl=extracted.get("required_trl", 5),
                deployment_scale=extracted.get("deployment_scale", "Medium"),
            )

            discovered = await self.discovery.search(
                db,
                requirement.domain,
                requirement.sub_domain,
                [k.strip() for k in (extracted.get("keywords", "") or "").split(",") if k.strip()],
                requirement.required_trl,
            )

            fit_result = await self.fit_evaluator.evaluate(db, tech_obj, requirement)

            compliance_result = await self.compliance.check_compliance(
                tech_obj.domain,
                tech_obj.sub_domain,
                tech_obj.certifications_available or [],
                tech_obj.technology_name,
            )

            commercialization_result = await self.commercialization.analyze(
                tech_obj.technology_name,
                tech_obj.trl_level,
                tech_obj.patent_status,
                tech_obj.manufacturing_readiness,
                tech_obj.domain,
            )

            claims_to_verify = [
                f"Technology {tech_obj.technology_name} has TRL level {tech_obj.trl_level}",
                f"Patent status is {tech_obj.patent_status} for {tech_obj.technology_name}",
                f"Fit score of {fit_result['score']} for requirement: {requirement.problem_statement[:100]}",
            ]
            verified_claims = []
            for claim in claims_to_verify:
                verification = await self.citation.verify_and_cite(
                    claim, db, tech_obj.domain, tech_obj.sub_domain
                )
                verified_claims.append(verification)

            final_rec = await self._generate_final_recommendation(
                requirement_text=requirement_text,
                tech_name=tech_obj.technology_name,
                fit_result=fit_result,
                compliance_result=compliance_result,
                commercialization_result=commercialization_result,
                verified_claims=verified_claims,
                discovered_techs=discovered,
            )

            return {
                "query": requirement_text,
                "extracted_requirement": extracted,
                "matched_technologies": discovered[:3] if discovered else [],
                "fit_evaluation": fit_result,
                "compliance_check": compliance_result,
                "commercialization": commercialization_result,
                "verified_citations": verified_claims,
                "final_recommendation": final_rec,
            }
        except Exception as e:
            logger.error(f"Comprehensive analysis failed: {str(e)}")
            raise

    async def _generate_final_recommendation(
        self,
        requirement_text: str,
        tech_name: str,
        fit_result: Dict[str, Any],
        compliance_result: Dict[str, Any],
        commercialization_result: Dict[str, Any],
        verified_claims: List[Dict[str, Any]],
        discovered_techs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        try:
            citations_text = "\n".join([
                f"- {vc.get('answer', '')[:200]} (confidence: {vc.get('confidence_score', 0)})"
                for vc in verified_claims
            ]) if verified_claims else "No verified citations available."

            evidence_text = "\n".join([
                f"- {vc.get('answer', '')[:200]}: {len(vc.get('sources', []))} source(s)"
                for vc in verified_claims
            ]) if verified_claims else "No evidence found."

            prompt = FINAL_RECOMMENDATION_PROMPT.format(
                requirement_summary=requirement_text[:500],
                technology_summary=f"Name: {tech_name}\nTop matches: {[t.get('technology_name', '') for t in discovered_techs[:3]]}",
                fit_evaluation=str(fit_result),
                compliance_check=str(compliance_result),
                commercialization=str(commercialization_result),
                citations=citations_text,
                evidence_sources=evidence_text,
            )

            return await llm_service.generate_json(prompt)
        except Exception as e:
            logger.warning(f"Final recommendation generation failed: {str(e)}")
            return self._fallback_recommendation(fit_result, compliance_result, commercialization_result)

    @staticmethod
    def _fallback_recommendation(
        fit: Dict[str, Any],
        compliance: Dict[str, Any],
        commercialization: Dict[str, Any],
    ) -> Dict[str, Any]:
        fit_high = fit.get("industry_fit") == "HIGH"
        compliant = compliance.get("approval_status") == "Complete"
        missing_count = len(compliance.get("missing_certifications", []))

        if fit_high and compliant:
            verdict = "HIGHLY RECOMMENDED"
        elif fit_high and missing_count <= 2:
            verdict = "RECOMMENDED"
        elif not fit_high and missing_count > 0:
            verdict = "CONDITIONALLY RECOMMENDED"
        else:
            verdict = "NOT RECOMMENDED"

        return {
            "overall_verdict": verdict,
            "reasoning": f"Fit score {fit.get('score', 0)}, compliance {'met' if compliant else f'missing {missing_count} certs'}, "
                         f"license recommendation: {commercialization.get('recommended_license', 'N/A')}",
            "action_items": [
                "Address missing certifications",
                "Prepare detailed technical documentation",
                "Engage with relevant Indian regulatory bodies",
            ],
            "risks": fit.get("risks", ["Regulatory approval timelines uncertain"]),
            "next_steps": [
                "Initiate compliance process for missing certifications",
                "Conduct detailed market analysis for Indian context",
                "Prepare IP protection strategy",
            ],
            "confidence": fit.get("confidence_score", 0.5),
            "missing_data": "Real-time patent and regulatory data would improve accuracy",
        }
