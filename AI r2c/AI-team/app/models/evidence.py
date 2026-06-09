from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

from app.database import Base


class EvidenceSource(Base):
    """Evidence source for citation verification"""
    __tablename__ = "evidence_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(1000), nullable=True)
    source_type = Column(String(100), nullable=False)  # Patent, Government, News, Research
    extracted_text = Column(Text, nullable=False)
    verification_status = Column(String(50), nullable=False)  # verified, unverified, disputed
    content_hash = Column(String(255), unique=True, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
