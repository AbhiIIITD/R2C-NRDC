import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    TechnologyProfileCreate, TechnologyProfileResponse,
    TechnologyMatchResponse, TechnologyMatchResult,
    FitEvaluationResponse, ComplianceCheckResponse,
    CommercializationResponse, EvaluateFitRequest,
    ComplianceRequest, CommercializationRequest,
)
from app.models.technology import TechnologyProfile
from app.models.industry import IndustryRequirement
from app.agents.technology_discovery import TechnologyDiscoveryAgent
from app.agents.industry_fit_evaluator import IndustryFitEvaluator
from app.agents.compliance_advisor import ComplianceAdvisor
from app.agents.commercialization_advisor import CommercializationAdvisor
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/technology", tags=["technology"])


@router.post("/register", response_model=TechnologyProfileResponse)
async def register_technology(
    technology: TechnologyProfileCreate,
    db: Session = Depends(get_db),
):
    try:
        embedding_service = EmbeddingService()
        embedding = await embedding_service.generate_embedding(technology.description)

        tech_data = technology.model_dump()
        db_tech = TechnologyProfile(**tech_data, embedding_vector=embedding)
        db.add(db_tech)
        db.commit()
        db.refresh(db_tech)
        return db_tech
    except Exception as e:
        logger.error(f"Error registering technology: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{tech_id}", response_model=TechnologyProfileResponse)
async def get_technology(
    tech_id: int,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == tech_id).first()
        if not tech:
            raise HTTPException(status_code=404, detail="Technology not found")
        return tech
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting technology: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_technologies(
    db: Session = Depends(get_db),
):
    try:
        technologies = db.query(TechnologyProfile).all()
        return technologies
    except Exception as e:
        logger.error(f"Error listing technologies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/match", response_model=TechnologyMatchResponse)
async def match_technology(
    requirement_id: int,
    db: Session = Depends(get_db),
):
    try:
        requirement = db.query(IndustryRequirement).filter(
            IndustryRequirement.id == requirement_id
        ).first()

        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")

        keywords = requirement.keywords.split(",") if requirement.keywords else []

        agent = TechnologyDiscoveryAgent()
        results = await agent.search(
            db,
            requirement.domain,
            requirement.sub_domain,
            keywords,
            requirement.required_trl,
        )

        matches = [TechnologyMatchResult(**r) for r in results]
        return TechnologyMatchResponse(matches=matches)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error matching technologies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/industry-fit", response_model=FitEvaluationResponse)
async def evaluate_fit(
    req: EvaluateFitRequest,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == req.technology_id).first()
        requirement = db.query(IndustryRequirement).filter(IndustryRequirement.id == req.requirement_id).first()

        if not tech or not requirement:
            raise HTTPException(status_code=404, detail="Technology or requirement not found")

        evaluator = IndustryFitEvaluator()
        result = await evaluator.evaluate(db, tech, requirement)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating fit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compliance", response_model=ComplianceCheckResponse)
async def check_compliance(
    req: ComplianceRequest,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == req.technology_id).first()

        if not tech:
            raise HTTPException(status_code=404, detail="Technology not found")

        advisor = ComplianceAdvisor()
        result = await advisor.check_compliance(
            tech.domain,
            tech.sub_domain,
            tech.certifications_available or [],
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking compliance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/license", response_model=CommercializationResponse)
async def analyze_commercialization(
    req: CommercializationRequest,
    db: Session = Depends(get_db),
):
    try:
        tech = db.query(TechnologyProfile).filter(TechnologyProfile.id == req.technology_id).first()

        if not tech:
            raise HTTPException(status_code=404, detail="Technology not found")

        advisor = CommercializationAdvisor()
        result = await advisor.analyze(
            tech.technology_name,
            tech.trl_level,
            tech.patent_status,
            tech.manufacturing_readiness,
            tech.domain,
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing commercialization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
