from app.routes.company import router as company_router
from app.routes.technology import router as technology_router
from app.routes.report import router as report_router
from app.routes.health import router as health_router
from app.routes.evidence import router as evidence_router

__all__ = [
    "company_router",
    "technology_router",
    "report_router",
    "health_router",
    "evidence_router",
]
