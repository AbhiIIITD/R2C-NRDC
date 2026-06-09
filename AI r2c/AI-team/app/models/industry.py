from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class IndustryRequirement(Base):
    """Industry requirement model"""
    __tablename__ = "industry_requirements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company_profiles.id", ondelete="CASCADE"), nullable=False)
    
    # Requirement details
    problem_statement = Column(Text, nullable=False)
    technology_needed = Column(String(255), nullable=False)
    domain = Column(String(100), index=True, nullable=False)
    sub_domain = Column(String(100), nullable=False)
    keywords = Column(Text, nullable=True)
    
    # Requirements
    required_trl = Column(Integer, nullable=False)
    deployment_scale = Column(String(50), nullable=False)  # Small, Medium, Large
    budget = Column(String(100), nullable=True)
    timeline = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("CompanyProfile", back_populates="requirements")
