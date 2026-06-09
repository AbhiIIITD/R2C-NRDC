from app.schemas import (
    CompanyProfileCreate, TechnologyProfileCreate,
    FitEvaluationResponse, ComplianceCheckResponse,
    CommercializationResponse,
)


def test_company_profile_create():
    data = {
        "company_name": "Test Corp",
        "sector": "Energy",
        "sub_sector": "Solar",
        "location": "Mumbai",
        "company_size": "Medium",
    }
    obj = CompanyProfileCreate(**data)
    assert obj.company_name == "Test Corp"


def test_technology_profile_create():
    data = {
        "technology_name": "Solar Panel",
        "description": "High efficiency panel",
        "domain": "Renewable Energy",
        "sub_domain": "Solar",
        "trl_level": 7,
        "technology_readiness_status": "Validated",
        "patent_status": "Granted",
        "manufacturing_readiness": "Ready",
        "scalability": "High",
    }
    obj = TechnologyProfileCreate(**data)
    assert obj.trl_level == 7


def test_fit_evaluation_response():
    data = {
        "industry_fit": "HIGH",
        "score": 85.5,
        "strengths": ["Good TRL", "Patent"],
        "risks": ["Certification missing"],
        "reasons": ["Strong match"],
        "confidence_score": 0.85,
    }
    obj = FitEvaluationResponse(**data)
    assert obj.industry_fit == "HIGH"
    assert obj.score == 85.5


def test_compliance_check_response():
    data = {
        "domain": "Renewable Energy",
        "sub_domain": "Solar",
        "required_certifications": ["IEC 61215"],
        "available_certifications": [],
        "missing_certifications": ["IEC 61215"],
        "approval_status": "Pending",
        "recommendations": ["Apply now"],
    }
    obj = ComplianceCheckResponse(**data)
    assert obj.approval_status == "Pending"


def test_commercialization_response():
    data = {
        "recommended_license": "Exclusive",
        "reason": "Mature technology",
        "technology_transfer_possible": True,
        "tech_transfer_timeline": 6,
        "market_readiness": "Ready",
        "deployment_roadmap": ["Phase 1", "Phase 2"],
    }
    obj = CommercializationResponse(**data)
    assert obj.recommended_license == "Exclusive"
    assert obj.tech_transfer_timeline == 6
