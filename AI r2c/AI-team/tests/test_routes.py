import pytest


@pytest.mark.asyncio
async def test_register_company(client, db_session):
    payload = {
        "company_name": "Test Corp",
        "sector": "Renewable Energy",
        "sub_sector": "Solar",
        "location": "Mumbai",
        "company_size": "Medium",
    }
    response = await client.post("/company/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Test Corp"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_get_company_not_found(client):
    response = await client.get("/company/999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_company(client, db_session):
    from app.models.company import CompanyProfile
    company = CompanyProfile(
        company_name="Test Corp",
        sector="Renewable Energy",
        sub_sector="Solar",
        location="Mumbai",
        company_size="Medium",
    )
    db_session.add(company)
    db_session.commit()

    response = await client.get(f"/company/{company.id}")
    assert response.status_code == 200
    assert response.json()["company_name"] == "Test Corp"


@pytest.mark.asyncio
async def test_register_technology(client, db_session):
    payload = {
        "technology_name": "Solar Panel X",
        "description": "High efficiency solar panel technology",
        "domain": "Renewable Energy",
        "sub_domain": "Solar",
        "trl_level": 7,
        "technology_readiness_status": "Validated",
        "patent_status": "Granted",
        "manufacturing_readiness": "Ready",
        "scalability": "High",
        "keywords": "solar, photovoltaic, renewable",
    }
    response = await client.post("/technology/register", json=payload)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_technology_not_found(client):
    response = await client.get("/technology/999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_compliance_check(client, db_session):
    from app.models.technology import TechnologyProfile
    tech = TechnologyProfile(
        technology_name="Test Tech",
        description="Test",
        domain="Industrial Production",
        sub_domain="Industrial Automation",
        trl_level=6,
        technology_readiness_status="Validated",
        patent_status="Pending",
        manufacturing_readiness="Scaling",
        scalability="Medium",
    )
    db_session.add(tech)
    db_session.commit()

    response = await client.post("/technology/compliance", json={"technology_id": tech.id})
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "Industrial Production"
    assert len(data["required_certifications"]) > 0


@pytest.mark.asyncio
async def test_license_analysis(client, db_session):
    from app.models.technology import TechnologyProfile
    tech = TechnologyProfile(
        technology_name="Test Tech",
        description="Test",
        domain="Renewable Energy",
        sub_domain="Solar",
        trl_level=8,
        technology_readiness_status="Validated",
        patent_status="Granted",
        manufacturing_readiness="Ready",
        scalability="High",
    )
    db_session.add(tech)
    db_session.commit()

    response = await client.post("/technology/license", json={"technology_id": tech.id})
    assert response.status_code == 200
    data = response.json()
    assert "recommended_license" in data
    assert "deployment_roadmap" in data
