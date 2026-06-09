import logging
from sqlalchemy import text
from fastapi import APIRouter, HTTPException

from app.services.cache_service import CacheService
from app.database import engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    try:
        cache_service = CacheService()
        cache_health = await cache_service.health_check()

        return {
            "status": "healthy",
            "database": "connected",
            "cache": "connected" if cache_health else "disconnected",
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/ready")
async def readiness_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {"ready": False, "error": str(e)}
