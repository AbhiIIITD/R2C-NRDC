import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ReportResponse, GenerateReportRequest
from app.models.technology import TechnologyProfile
from app.models.industry import IndustryRequirement
from app.agents.industry_fit_evaluator import IndustryFitEvaluator
from app.agents.compliance_advisor import ComplianceAdvisor
from app.agents.commercialization_advisor import CommercializationAdvisor
from app.agents.citation_verifier import CitationVerifier
from app.agents.comprehensive_analyzer import ComprehensiveAnalyzer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["report"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    req: GenerateReportRequest,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == req.technology_id).first()
        requirement = db.query(IndustryRequirement).filter(IndustryRequirement.id == req.requirement_id).first()

        if not tech or not requirement:
            raise HTTPException(status_code=404, detail="Technology or requirement not found")

        fit_evaluator = IndustryFitEvaluator()
        compliance_advisor = ComplianceAdvisor()
        commercialization_advisor = CommercializationAdvisor()

        fit_result = await fit_evaluator.evaluate(db, tech, requirement)
        compliance_result = await compliance_advisor.check_compliance(
            tech.domain,
            tech.sub_domain,
            tech.certifications_available or [],
            tech.technology_name,
        )
        commercialization_result = await commercialization_advisor.analyze(
            tech.technology_name,
            tech.trl_level,
            tech.patent_status,
            tech.manufacturing_readiness,
            tech.domain,
        )

        if fit_result["industry_fit"] == "HIGH" and compliance_result["approval_status"] == "Complete":
            overall_recommendation = "HIGHLY RECOMMENDED for commercialization"
        elif fit_result["industry_fit"] in ["HIGH", "MEDIUM"] and len(compliance_result["missing_certifications"]) <= 2:
            overall_recommendation = "RECOMMENDED with compliance requirements"
        else:
            overall_recommendation = "FURTHER ASSESSMENT NEEDED"

        return {
            "technology_id": req.technology_id,
            "requirement_id": req.requirement_id,
            "fit_evaluation": fit_result,
            "compliance_check": compliance_result,
            "commercialization": commercialization_result,
            "overall_recommendation": overall_recommendation,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-report")
async def generate_full_report_with_citations(
    req: GenerateReportRequest,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == req.technology_id).first()
        requirement = db.query(IndustryRequirement).filter(IndustryRequirement.id == req.requirement_id).first()

        if not tech or not requirement:
            raise HTTPException(status_code=404, detail="Technology or requirement not found")

        fit_evaluator = IndustryFitEvaluator()
        compliance_advisor = ComplianceAdvisor()
        commercialization_advisor = CommercializationAdvisor()
        citation_verifier = CitationVerifier()

        fit_result = await fit_evaluator.evaluate(db, tech, requirement)
        compliance_result = await compliance_advisor.check_compliance(
            tech.domain,
            tech.sub_domain,
            tech.certifications_available or [],
            tech.technology_name,
        )
        commercialization_result = await commercialization_advisor.analyze(
            tech.technology_name,
            tech.trl_level,
            tech.patent_status,
            tech.manufacturing_readiness,
            tech.domain,
        )

        claims_to_verify = [
            f"Technology {tech.technology_name} has TRL level {tech.trl_level}",
            f"Patent {tech.patent_status} for {tech.technology_name}",
            f"Fit score of {fit_result['score']} for: {requirement.problem_statement[:100]}",
        ]

        verified_claims = []
        for claim in claims_to_verify:
            verification = await citation_verifier.verify_and_cite(
                claim, db, tech.domain, tech.sub_domain
            )
            verified_claims.append(verification)

        if fit_result["industry_fit"] == "HIGH" and compliance_result["approval_status"] == "Complete":
            overall_recommendation = "HIGHLY RECOMMENDED for commercialization"
        elif fit_result["industry_fit"] in ["HIGH", "MEDIUM"] and len(compliance_result["missing_certifications"]) <= 2:
            overall_recommendation = "RECOMMENDED with compliance requirements"
        else:
            overall_recommendation = "FURTHER ASSESSMENT NEEDED"

        return {
            "technology_id": req.technology_id,
            "requirement_id": req.requirement_id,
            "fit_evaluation": fit_result,
            "compliance_check": compliance_result,
            "commercialization": commercialization_result,
            "verified_claims": verified_claims,
            "overall_recommendation": overall_recommendation,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating full report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def comprehensive_analysis(
    requirement_text: str,
    technology_id: int,
    company_id: int = 0,
    db: Session = Depends(get_db),
):
    """One-shot comprehensive analysis: extracts requirement, validates,
    checks compliance with real Indian govt sources, and gives final recommendation."""
    try:
        analyzer = ComprehensiveAnalyzer()
        result = await analyzer.analyze(
            db=db,
            requirement_text=requirement_text,
            technology_id=technology_id,
            company_id=company_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comprehensive analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
