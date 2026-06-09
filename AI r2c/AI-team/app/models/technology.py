from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from datetime import datetime

from app.database import Base


class TechnologyProfile(Base):
    __tablename__ = "technology_profiles"

    id = Column(Integer, primary_key=True, index=True)
    technology_name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=False)
    domain = Column(String(100), index=True, nullable=False)
    sub_domain = Column(String(100), index=True, nullable=False)

    # Maturity
    trl_level = Column(Integer, nullable=False)
    technology_readiness_status = Column(String(50), nullable=False)

    # Intellectual Property
    patent_status = Column(String(50), nullable=False)
    patent_number = Column(String(100), nullable=True)
    patent_owner = Column(String(255), nullable=True)

    # Manufacturing
    manufacturing_readiness = Column(String(50), nullable=False)
    manufacturing_location = Column(String(255), nullable=True)
    manufacturing_capacity = Column(String(100), nullable=True)

    # Market
    market_potential = Column(String(100), nullable=True)
    market_demand = Column(String(50), nullable=True)
    estimated_market_size = Column(String(100), nullable=True)

    # Deployment
    scalability = Column(String(50), nullable=False)
    deployment_timeline = Column(String(100), nullable=True)
    license_available = Column(Integer, default=0)

    # Keywords and certifications
    keywords = Column(Text, nullable=True)
    certifications_available = Column(JSON, default=list)
    certifications_required = Column(JSON, default=list)

    # Vector embedding (JSON array of floats)
    embedding_vector = Column("embedding_vector", JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
