from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class CompanyProfile(Base):
    """Company profile model"""
    __tablename__ = "company_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), index=True, nullable=False)
    sector = Column(String(100), nullable=False)
    sub_sector = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    company_size = Column(String(50), nullable=False)  # Small, Medium, Large
    business_objective = Column(Text, nullable=True)
    technology_interest = Column(Text, nullable=True)
    contact_details = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requirements = relationship(
        "IndustryRequirement",
        back_populates="company",
        cascade="all, delete-orphan"
    )
