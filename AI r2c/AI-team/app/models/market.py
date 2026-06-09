from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from datetime import datetime

from app.database import Base


class MarketProfile(Base):
    """Market data model"""
    __tablename__ = "market_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, nullable=False)
    market_segment = Column(String(255), nullable=False)
    market_size = Column(String(100), nullable=True)
    market_growth_rate = Column(Float, nullable=True)
    demand_level = Column(String(50), nullable=False)  # High, Medium, Low
    competitive_landscape = Column(Text, nullable=True)
    adoption_barriers = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
