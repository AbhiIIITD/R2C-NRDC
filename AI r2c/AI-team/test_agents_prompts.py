"""
Comprehensive test suite for all AI agents based on their actual prompts.
Tests each agent with realistic scenarios matching their prompt specifications.
"""

import pytest
import asyncio
from app.agents.industry_extractor import IndustryRequirementExtractor
from app.agents.technology_discovery import TechnologyDiscoveryAgent
from app.agents.industry_fit_evaluator import IndustryFitEvaluator
from app.agents.compliance_advisor import ComplianceAdvisor
from app.agents.commercialization_advisor import CommercializationAdvisor
from app.agents.citation_verifier import CitationVerifier
from app.agents.comprehensive_analyzer import ComprehensiveAnalyzer


class TestIndustryRequirementExtractor:
    """Test Industry Requirement Extraction Agent"""
    
    @pytest.fixture
    def extractor(self):
        return IndustryRequirementExtractor()
    
    @pytest.mark.asyncio
    async def test_solar_energy_extraction(self, extractor):
        """Test extraction of solar energy requirements"""
        query = "We need solar panel technology for a 5MW commercial installation in Gujarat. The panels should have TRL 8 or higher and be certified for Indian grid standards."
        
        result = await extractor.extract(query)
        
        # Verify required fields exist
        assert "domain" in result
        assert "sub_domain" in result
        assert "problem_statement" in result
        assert "technology_needed" in result
        assert "keywords" in result
        assert "required_trl" in result
        assert "deployment_scale" in result
        
        # Verify domain is Renewable Energy
        assert result["domain"] in ["Renewable Energy", "Buildings & Infrastructure", "Industrial Production"]
        
        # Verify TRL is integer 1-9
        assert isinstance(result["required_trl"], int)
        assert 1 <= result["required_trl"] <= 9
        
        print(f"✓ Solar extraction: {result}")
    
    @pytest.mark.asyncio
    async def test_green_building_extraction(self, extractor):
        """Test extraction of green building requirements"""
        query = "Looking for green building materials and smart HVAC systems for a large-scale commercial complex in Mumbai. Need materials with environmental clearance and BIS certification."
        
        result = await extractor.extract(query)
        
        assert result["domain"] in ["Renewable Energy", "Buildings & Infrastructure", "Industrial Production"]
        assert result["deployment_scale"] in ["Small", "Medium", "Large"]
        assert len(result["problem_statement"]) > 10
        
        print(f"✓ Green building extraction: {result}")
    
    @pytest.mark.asyncio
    async def test_industrial_automation_extraction(self, extractor):
        """Test extraction of industrial automation requirements"""
        query = "Need industrial automation solutions for battery manufacturing plant. Required TRL 7, medium scale deployment with ISO certification."
        
        result = await extractor.extract(query)
        
        assert "domain" in result
        assert "sub_domain" in result
        assert result["required_trl"] >= 1
        
        print(f"✓ Industrial automation extraction: {result}")


class TestTechnologyDiscoveryAgent:
    """Test Technology Discovery Agent"""
    
    @pytest.fixture
    def discovery_agent(self):
        return TechnologyDiscoveryAgent()
    
    def test_match_score_calculation_high(self, discovery_agent):
        """Test match score calculation for high compatibility"""
        class MockTech:
            trl_level = 8
            patent_status = "Granted"
            manufacturing_readiness = "Ready"
            license_available = True
            keywords = "solar, panel, photovoltaic, efficiency"
        
        score = discovery_agent._calculate_match_score(
            MockTech(), 
            required_trl=7, 
            keywords=["solar", "efficiency"]
        )
        
        assert score > 80
        assert score <= 100
        print(f"✓ High match score: {score}")
    
    def test_match_score_calculation_low(self, discovery_agent):
        """Test match score calculation for low compatibility"""
        class MockTech:
            trl_level = 3
            patent_status = "Pending"
            manufacturing_readiness = "Not Ready"
            license_available = False
            keywords = "wind, turbine"
        
        score = discovery_agent._calculate_match_score(
            MockTech(), 
            required_trl=8, 
            keywords=["solar", "efficiency"]
        )
        
        assert score < 60
        print(f"✓ Low match score: {score}")
    
    def test_match_score_patent_granted(self, discovery_agent):
        """Test score boost for granted patents"""
        class MockTech:
            trl_level = 5
            patent_status = "Granted"
            manufacturing_readiness = "Scaling"
            license_available = True
            keywords = "battery, storage"
        
        score = discovery_agent._calculate_match_score(
            MockTech(), 
            required_trl=5, 
            keywords=["battery"]
        )
        
        assert score > 50  # Should get patent bonus
        print(f"✓ Patent granted score: {score}")


class TestIndustryFitEvaluator:
    """Test Industry Fit Evaluator Agent"""
    
    @pytest.fixture
    def evaluator(self):
        return IndustryFitEvaluator()
    
    def test_trl_score_calculation(self, evaluator):
        """Test TRL score calculation"""
        # TRL meets requirement
        score = evaluator._calculate_trl_score(8, 6)
        assert score == 100.0
        
        # TRL below requirement
        score = evaluator._calculate_trl_score(4, 8)
        assert score == 50.0
        
        # TRL partially meets requirement
        score = evaluator._calculate_trl_score(6, 9)
        assert score == 66.66666666666666
        
        print(f"✓ TRL score calculations passed")
    
    def test_patent_status_mapping(self, evaluator):
        """Test patent status to score mapping"""
        assert evaluator._map_patent_status("Granted") == 100.0
        assert evaluator._map_patent_status("Pending") == 60.0
        assert evaluator._map_patent_status("Unknown") == 30.0
        
        print(f"✓ Patent status mapping passed")
    
    def test_manufacturing_readiness_mapping(self, evaluator):
        """Test manufacturing readiness to score mapping"""
        assert evaluator._map_manufacturing_readiness("Ready") == 100.0
        assert evaluator._map_manufacturing_readiness("Scaling") == 70.0
        assert evaluator._map_manufacturing_readiness("Not Ready") == 30.0
        
        print(f"✓ Manufacturing readiness mapping passed")
    
    def test_scalability_mapping(self, evaluator):
        """Test scalability to score mapping"""
        assert evaluator._map_scalability("High") == 100.0
        assert evaluator._map_scalability("Medium") == 70.0
        assert evaluator._map_scalability("Low") == 30.0
        
        print(f"✓ Scalability mapping passed")
    
    def test_market_score_estimation(self, evaluator):
        """Test market demand score estimation"""
        assert evaluator._estimate_market_score("High") == 100.0
        assert evaluator._estimate_market_score("Medium") == 70.0
        assert evaluator._estimate_market_score("Low") == 30.0
        
        print(f"✓ Market score estimation passed")


class TestComplianceAdvisor:
    """Test Compliance Advisor Agent"""
    
    @pytest.fixture
    def compliance_advisor(self):
        return ComplianceAdvisor()
    
    def test_fallback_certs_solar(self, compliance_advisor):
        """Test fallback certifications for Solar domain"""
        certs = compliance_advisor._fallback_certs("Renewable Energy", "Solar")
        
        assert "IEC 61215" in certs
        assert "IEC 61730" in certs
        assert "BIS Certification" in certs
        assert len(certs) >= 4
        
        print(f"✓ Solar fallback certs: {certs}")
    
    def test_fallback_certs_wind(self, compliance_advisor):
        """Test fallback certifications for Wind domain"""
        certs = compliance_advisor._fallback_certs("Renewable Energy", "Wind")
        
        assert "IEC 61400-1" in certs
        assert "BIS Certification" in certs
        assert "CEA Approval" in certs
        
        print(f"✓ Wind fallback certs: {certs}")
    
    def test_fallback_certs_green_building(self, compliance_advisor):
        """Test fallback certifications for Green Buildings"""
        certs = compliance_advisor._fallback_certs("Buildings & Infrastructure", "Green Buildings")
        
        assert "BIS Certification" in certs
        assert "NBC Approval" in certs
        assert "GRIHA Rating" in certs or "IGBC Certification" in certs
        
        print(f"✓ Green building fallback certs: {certs}")
    
    def test_fallback_recommendations(self, compliance_advisor):
        """Test fallback recommendation generation"""
        missing_certs = ["IEC 61215", "BIS Certification", "MNRE Recognition"]
        recommendations = compliance_advisor._fallback_recommendations(missing_certs)
        
        assert len(recommendations) == 3
        assert any("IEC" in r for r in recommendations)
        assert any("BIS" in r for r in recommendations)
        assert any("MNRE" in r for r in recommendations)
        
        print(f"✓ Fallback recommendations: {recommendations}")
    
    def test_fallback_response_complete(self, compliance_advisor):
        """Test fallback response when all certs are available"""
        response = compliance_advisor._fallback_response(
            "Renewable Energy",
            "Solar",
            ["IEC 61215", "IEC 61730", "BIS Certification", "CEA Approval", "MNRE Recognition"]
        )
        
        assert response["approval_status"] == "Complete"
        assert len(response["missing_certifications"]) == 0
        
        print(f"✓ Complete compliance response: {response}")
    
    def test_fallback_response_pending(self, compliance_advisor):
        """Test fallback response when certs are missing"""
        response = compliance_advisor._fallback_response(
            "Renewable Energy",
            "Solar",
            ["IEC 61215"]  # Only one cert, missing others
        )
        
        assert response["approval_status"] == "Pending"
        assert len(response["missing_certifications"]) > 0
        
        print(f"✓ Pending compliance response: {response}")


class TestCommercializationAdvisor:
    """Test Commercialization Advisor Agent"""
    
    @pytest.fixture
    def commercialization_advisor(self):
        return CommercializationAdvisor()
    
    def test_license_determination_exclusive(self, commercialization_advisor):
        """Test exclusive license determination"""
        license_type = commercialization_advisor._determine_license(
            patent_status="Granted",
            manufacturing_readiness="Ready",
            trl_level=9
        )
        assert license_type == "Exclusive"
        print(f"✓ Exclusive license: {license_type}")
    
    def test_license_determination_semi_exclusive(self, commercialization_advisor):
        """Test semi-exclusive license determination"""
        license_type = commercialization_advisor._determine_license(
            patent_status="Granted",
            manufacturing_readiness="Scaling",
            trl_level=7
        )
        assert license_type == "Semi-Exclusive"
        print(f"✓ Semi-exclusive license: {license_type}")
    
    def test_license_determination_non_exclusive(self, commercialization_advisor):
        """Test non-exclusive license determination"""
        license_type = commercialization_advisor._determine_license(
            patent_status="Pending",
            manufacturing_readiness="Not Ready",
            trl_level=4
        )
        assert license_type == "Non-Exclusive"
        print(f"✓ Non-exclusive license: {license_type}")
    
    def test_tech_transfer_ready(self, commercialization_advisor):
        """Test tech transfer assessment for ready technology"""
        assessment = commercialization_advisor._assess_tech_transfer(
            trl_level=8,
            manufacturing_readiness="Ready"
        )
        
        assert assessment["possible"] is True
        assert assessment["timeline_months"] == 6
        assert len(assessment["requirements"]) >= 3
        
        print(f"✓ Tech transfer ready: {assessment}")
    
    def test_tech_transfer_development(self, commercialization_advisor):
        """Test tech transfer assessment for technology in development"""
        assessment = commercialization_advisor._assess_tech_transfer(
            trl_level=6,
            manufacturing_readiness="Scaling"
        )
        
        assert assessment["possible"] is True
        assert assessment["timeline_months"] == 12
        
        print(f"✓ Tech transfer development: {assessment}")
    
    def test_tech_transfer_not_ready(self, commercialization_advisor):
        """Test tech transfer assessment for not ready technology"""
        assessment = commercialization_advisor._assess_tech_transfer(
            trl_level=3,
            manufacturing_readiness="Not Ready"
        )
        
        assert assessment["possible"] is False
        assert assessment["timeline_months"] == 24
        
        print(f"✓ Tech transfer not ready: {assessment}")
    
    def test_market_readiness_high_trl(self, commercialization_advisor):
        """Test market readiness for high TRL"""
        readiness = commercialization_advisor._assess_market_readiness(9)
        assert readiness == "Ready for commercialization"
        print(f"✓ Market readiness high TRL: {readiness}")
    
    def test_market_readiness_medium_trl(self, commercialization_advisor):
        """Test market readiness for medium TRL"""
        readiness = commercialization_advisor._assess_market_readiness(7)
        assert readiness == "Near market-ready (6-12 months)"
        print(f"✓ Market readiness medium TRL: {readiness}")
    
    def test_market_readiness_low_trl(self, commercialization_advisor):
        """Test market readiness for low TRL"""
        readiness = commercialization_advisor._assess_market_readiness(3)
        assert readiness == "Early stage research (24+ months)"
        print(f"✓ Market readiness low TRL: {readiness}")
    
    def test_default_roadmap(self, commercialization_advisor):
        """Test default roadmap generation"""
        roadmap = commercialization_advisor._default_roadmap()
        
        assert len(roadmap) == 3
        assert all("Phase" in phase for phase in roadmap)
        
        print(f"✓ Default roadmap: {roadmap}")


class TestCitationVerifier:
    """Test Citation Verifier Agent"""
    
    @pytest.fixture
    def citation_verifier(self):
        return CitationVerifier()
    
    def test_citation_verifier_initialization(self, citation_verifier):
        """Test citation verifier initialization"""
        assert citation_verifier is not None
        assert citation_verifier.scraper is not None
        print(f"✓ Citation verifier initialized")


class TestComprehensiveAnalyzer:
    """Test Comprehensive Analyzer Agent"""
    
    @pytest.fixture
    def comprehensive_analyzer(self):
        return ComprehensiveAnalyzer()
    
    def test_fallback_recommendation_highly_recommended(self, comprehensive_analyzer):
        """Test fallback recommendation for highly recommended scenario"""
        fit = {
            "industry_fit": "HIGH",
            "score": 85.0,
            "confidence_score": 0.85,
            "risks": []
        }
        
        compliance = {
            "approval_status": "Complete",
            "missing_certifications": []
        }
        
        commercialization = {
            "recommended_license": "Exclusive"
        }
        
        result = comprehensive_analyzer._fallback_recommendation(fit, compliance, commercialization)
        
        assert result["overall_verdict"] == "HIGHLY RECOMMENDED"
        assert len(result["action_items"]) >= 3
        assert len(result["next_steps"]) >= 3
        
        print(f"✓ Highly recommended fallback: {result}")
    
    def test_fallback_recommendation_recommended(self, comprehensive_analyzer):
        """Test fallback recommendation for recommended scenario"""
        fit = {
            "industry_fit": "HIGH",
            "score": 75.0,
            "confidence_score": 0.75,
            "risks": ["Minor regulatory delays"]
        }
        
        compliance = {
            "approval_status": "Pending",
            "missing_certifications": ["ISO 9001:2015"]
        }
        
        commercialization = {
            "recommended_license": "Semi-Exclusive"
        }
        
        result = comprehensive_analyzer._fallback_recommendation(fit, compliance, commercialization)
        
        assert result["overall_verdict"] == "RECOMMENDED"
        
        print(f"✓ Recommended fallback: {result}")
    
    def test_fallback_recommendation_conditionally_recommended(self, comprehensive_analyzer):
        """Test fallback recommendation for conditionally recommended scenario"""
        fit = {
            "industry_fit": "MEDIUM",
            "score": 55.0,
            "confidence_score": 0.55,
            "risks": ["Regulatory uncertainty", "Market competition"]
        }
        
        compliance = {
            "approval_status": "Pending",
            "missing_certifications": ["BIS Certification", "CEA Approval", "MNRE Recognition"]
        }
        
        commercialization = {
            "recommended_license": "Non-Exclusive"
        }
        
        result = comprehensive_analyzer._fallback_recommendation(fit, compliance, commercialization)
        
        assert result["overall_verdict"] == "CONDITIONALLY RECOMMENDED"
        
        print(f"✓ Conditionally recommended fallback: {result}")
    
    def test_fallback_recommendation_not_recommended(self, comprehensive_analyzer):
        """Test fallback recommendation for not recommended scenario"""
        fit = {
            "industry_fit": "LOW",
            "score": 25.0,
            "confidence_score": 0.25,
            "risks": ["High regulatory barriers", "Low market demand"]
        }
        
        compliance = {
            "approval_status": "Pending",
            "missing_certifications": []  # No missing certs but low fit
        }
        
        commercialization = {
            "recommended_license": "Non-Exclusive"
        }
        
        result = comprehensive_analyzer._fallback_recommendation(fit, compliance, commercialization)
        
        assert result["overall_verdict"] == "NOT RECOMMENDED"
        
        print(f"✓ Not recommended fallback: {result}")


# Integration tests that test multiple agents together
class TestAgentIntegration:
    """Integration tests for agent workflows"""
    
    @pytest.mark.asyncio
    async def test_extraction_to_discovery_workflow(self):
        """Test workflow from extraction to technology discovery"""
        extractor = IndustryRequirementExtractor()
        
        query = "We need solar panel technology for commercial installation with TRL 8 and BIS certification."
        extracted = await extractor.extract(query)
        
        # Verify extraction worked
        assert extracted["domain"] in ["Renewable Energy", "Buildings & Infrastructure", "Industrial Production"]
        assert extracted["required_trl"] >= 1
        
        print(f"✓ Extraction to discovery workflow: {extracted}")
    
    @pytest.mark.asyncio
    async def test_compliance_to_commercialization_workflow(self):
        """Test workflow from compliance check to commercialization analysis"""
        compliance_advisor = ComplianceAdvisor()
        commercialization_advisor = CommercializationAdvisor()
        
        # Check compliance
        compliance_result = await compliance_advisor.check_compliance(
            domain="Renewable Energy",
            sub_domain="Solar",
            available_certifications=["IEC 61215"]
        )
        
        # Analyze commercialization
        commercialization_result = await commercialization_advisor.analyze(
            technology_name="Advanced Solar Panel",
            trl_level=8,
            patent_status="Granted",
            manufacturing_readiness="Ready",
            domain="Renewable Energy"
        )
        
        # Verify both agents returned results
        assert compliance_result["domain"] == "Renewable Energy"
        assert commercialization_result["recommended_license"] in ["Exclusive", "Semi-Exclusive", "Non-Exclusive"]
        
        print(f"✓ Compliance to commercialization workflow")
        print(f"  Compliance: {compliance_result['approval_status']}")
        print(f"  License: {commercialization_result['recommended_license']}")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
