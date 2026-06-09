from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class CompanyProfileCreate(BaseModel):
    company_name: str
    sector: str
    sub_sector: str
    location: str
    company_size: str
    business_objective: Optional[str] = None
    technology_interest: Optional[str] = None
    contact_details: Optional[str] = None


class CompanyProfileResponse(BaseModel):
    id: int
    company_name: str
    sector: str
    sub_sector: str
    location: str
    company_size: str
    created_at: datetime

    class Config:
        from_attributes = True


class IndustryRequirementCreate(BaseModel):
    company_id: int
    problem_statement: str
    technology_needed: str
    domain: str
    sub_domain: str
    keywords: Optional[str] = None
    required_trl: int
    deployment_scale: str
    budget: Optional[str] = None
    timeline: Optional[str] = None


class IndustryRequirementResponse(BaseModel):
    id: int
    company_id: int
    problem_statement: str
    technology_needed: str
    domain: str
    sub_domain: str
    required_trl: int
    deployment_scale: str
    created_at: datetime

    class Config:
        from_attributes = True


class TechnologyProfileCreate(BaseModel):
    technology_name: str
    description: str
    domain: str
    sub_domain: str
    trl_level: int
    technology_readiness_status: str
    patent_status: str
    patent_number: Optional[str] = None
    patent_owner: Optional[str] = None
    manufacturing_readiness: str
    manufacturing_location: Optional[str] = None
    manufacturing_capacity: Optional[str] = None
    scalability: str
    market_potential: Optional[str] = None
    market_demand: Optional[str] = None
    estimated_market_size: Optional[str] = None
    deployment_timeline: Optional[str] = None
    keywords: Optional[str] = None
    license_available: int = 0
    certifications_available: Optional[List[str]] = None
    certifications_required: Optional[List[str]] = None


class TechnologyProfileResponse(BaseModel):
    id: int
    technology_name: str
    description: str
    domain: str
    sub_domain: str
    trl_level: int
    patent_status: str
    manufacturing_readiness: str
    scalability: str
    keywords: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TechnologyMatchResult(BaseModel):
    id: int
    technology_name: str
    match_score: float
    trl_level: int
    patent_status: str
    manufacturing_readiness: str
    match_reason: str = ""


class TechnologyMatchResponse(BaseModel):
    matches: List[TechnologyMatchResult]


class FitEvaluationResponse(BaseModel):
    industry_fit: str
    score: float
    strengths: List[str]
    risks: List[str]
    reasons: List[str]
    confidence_score: float


class ComplianceCheckResponse(BaseModel):
    domain: str
    sub_domain: str
    required_certifications: List[str]
    available_certifications: List[str]
    missing_certifications: List[str]
    approval_status: str
    recommendations: List[str]


class CommercializationResponse(BaseModel):
    recommended_license: str
    reason: str
    technology_transfer_possible: bool
    tech_transfer_timeline: int
    market_readiness: str
    deployment_roadmap: List[str]


class ReportResponse(BaseModel):
    technology_id: int
    requirement_id: int
    fit_evaluation: FitEvaluationResponse
    compliance_check: ComplianceCheckResponse
    commercialization: CommercializationResponse
    overall_recommendation: str


class CitationSource(BaseModel):
    source: str
    url: str
    evidence: str


class CitationVerifyResponse(BaseModel):
    answer: str
    confidence_score: float
    sources: List[CitationSource]
    verification_status: str = "verified"


class CitationAddRequest(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    source_type: str
    extracted_text: str


class AnalyzeRequest(BaseModel):
    company_id: int
    requirement_text: str


class MatchRequest(BaseModel):
    requirement_id: int


class EvaluateFitRequest(BaseModel):
    technology_id: int
    requirement_id: int


class ComplianceRequest(BaseModel):
    technology_id: int


class CommercializationRequest(BaseModel):
    technology_id: int


class GenerateReportRequest(BaseModel):
    technology_id: int
    requirement_id: int
