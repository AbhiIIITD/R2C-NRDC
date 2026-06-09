import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CitationAddRequest, CitationVerifyResponse
from app.models.evidence import EvidenceSource
from app.agents.citation_verifier import CitationVerifier

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("/add")
async def add_evidence_source(
    req: CitationAddRequest,
    db: Session = Depends(get_db),
):
    try:
        verifier = CitationVerifier()
        success = await verifier.add_citation_source(
            db=db,
            source_name=req.source_name,
            source_url=req.source_url,
            source_type=req.source_type,
            extracted_text=req.extracted_text,
        )
        return {"success": success, "message": "Source added" if success else "Duplicate source, not added"}
    except Exception as e:
        logger.error(f"Error adding evidence source: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_evidence_sources(
    db: Session = Depends(get_db),
):
    try:
        sources = db.query(EvidenceSource).all()
        return sources
    except Exception as e:
        logger.error(f"Error listing evidence sources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify", response_model=CitationVerifyResponse)
async def verify_claim(
    claim: str,
    domain: str = "",
    sub_domain: str = "",
    db: Session = Depends(get_db),
):
    try:
        verifier = CitationVerifier()
        result = await verifier.verify_and_cite(
            claim=claim,
            db=db,
            domain=domain,
            sub_domain=sub_domain,
        )
        return result
    except Exception as e:
        logger.error(f"Error verifying claim: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
