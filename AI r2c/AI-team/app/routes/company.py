import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    CompanyProfileCreate, CompanyProfileResponse,
    AnalyzeRequest,
)
from app.models.company import CompanyProfile
from app.models.industry import IndustryRequirement
from app.agents.industry_extractor import IndustryRequirementExtractor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/company", tags=["company"])


@router.post("/register", response_model=CompanyProfileResponse)
async def register_company(
    company: CompanyProfileCreate,
    db: Session = Depends(get_db),
):
    try:
        db_company = CompanyProfile(**company.model_dump())
        db.add(db_company)
        db.commit()
        db.refresh(db_company)
        return db_company
    except Exception as e:
        logger.error(f"Error registering company: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}", response_model=CompanyProfileResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db),
):
    try:
        company = db.query(CompanyProfile).filter(CompanyProfile.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting company: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_requirement(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
):
    try:
        company = db.query(CompanyProfile).filter(CompanyProfile.id == req.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        extractor = IndustryRequirementExtractor()
        extracted = await extractor.extract(req.requirement_text)

        requirement = IndustryRequirement(
            company_id=req.company_id,
            problem_statement=extracted.get("problem_statement", ""),
            technology_needed=extracted.get("technology_needed", ""),
            domain=extracted.get("domain", ""),
            sub_domain=extracted.get("sub_domain", ""),
            keywords=extracted.get("keywords", ""),
            required_trl=extracted.get("required_trl", 5),
            deployment_scale=extracted.get("deployment_scale", "Medium"),
        )
        db.add(requirement)
        db.commit()
        db.refresh(requirement)

        return {"requirement_id": requirement.id, "extracted_data": extracted}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing requirement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}/requirements")
async def get_company_requirements(
    company_id: int,
    db: Session = Depends(get_db),
):
    try:
        requirements = db.query(IndustryRequirement).filter(
            IndustryRequirement.company_id == company_id
        ).all()
        return requirements
    except Exception as e:
        logger.error(f"Error getting requirements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
