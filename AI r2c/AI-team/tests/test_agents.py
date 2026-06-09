import pytest
from app.agents.compliance_advisor import ComplianceAdvisor
from app.agents.commercialization_advisor import CommercializationAdvisor
from app.agents.technology_discovery import TechnologyDiscoveryAgent


@pytest.mark.asyncio
async def test_compliance_checker():
    advisor = ComplianceAdvisor()
    result = await advisor.check_compliance(
        "Renewable Energy",
        "Solar",
        ["IEC 61215"],
    )
    assert result["domain"] == "Renewable Energy"
    assert result["sub_domain"] == "Solar"
    assert "IEC 61730" in result["missing_certifications"]
    assert result["approval_status"] == "Pending"


@pytest.mark.asyncio
async def test_compliance_complete():
    advisor = ComplianceAdvisor()
    result = await advisor.check_compliance(
        "Renewable Energy",
        "Solar",
        ["IEC 61215", "IEC 61730", "BIS Certification", "CEA Approval", "MNRE Recognition", "Environmental Clearance"],
    )
    assert result["approval_status"] == "Complete"


def test_license_determination():
    advisor = CommercializationAdvisor()
    result = advisor._determine_license("Granted", "Ready", 8)
    assert result == "Exclusive"

    result = advisor._determine_license("Granted", "Scaling", 6)
    assert result == "Semi-Exclusive"

    result = advisor._determine_license("Pending", "Not Ready", 4)
    assert result == "Non-Exclusive"


def test_tech_transfer_assessment():
    advisor = CommercializationAdvisor()
    result = advisor._assess_tech_transfer(8, "Ready")
    assert result["possible"] is True
    assert result["timeline_months"] == 6

    result = advisor._assess_tech_transfer(6, "Scaling")
    assert result["possible"] is True
    assert result["timeline_months"] == 12

    result = advisor._assess_tech_transfer(4, "Not Ready")
    assert result["possible"] is False
    assert result["timeline_months"] == 24


def test_match_score_calculation():
    class MockTech:
        trl_level = 7
        patent_status = "Granted"
        manufacturing_readiness = "Ready"
        license_available = 1
        keywords = "battery, recycling, EV"

    agent = TechnologyDiscoveryAgent()
    score = agent._calculate_match_score(MockTech(), 5, ["battery", "recycling"])
    assert score > 80
    assert score <= 100


def test_trl_compatibility():
    from app.agents.industry_fit_evaluator import IndustryFitEvaluator
    evaluator = IndustryFitEvaluator()

    score = evaluator._calculate_trl_score(8, 6)
    assert score == 100.0

    score = evaluator._calculate_trl_score(4, 8)
    assert score == 50.0
