from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

from app.database import Base


class CertificationProfile(Base):
    """Certification tracking model"""
    __tablename__ = "certification_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, nullable=False)
    certification_name = Column(String(255), nullable=False)
    certification_body = Column(String(255), nullable=False)
    certification_status = Column(String(50), nullable=False)  # Required, Available, Missing
    compliance_domain = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
