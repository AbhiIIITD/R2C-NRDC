import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routes import company_router, technology_router, report_router, health_router, evidence_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up SUTRA AI Agents API")
    try:
        await init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning(f"Database initialization skipped (may already exist): {str(e)}")
    yield
    logger.info("Shutting down SUTRA AI Agents API")


app = FastAPI(
    title="SUTRA AI Agents API",
    description="6 AI Agents for Industry Requirement Extraction, Technology Discovery, Fit Evaluation, Compliance, Commercialization, and Citation Verification",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 3))
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


app.include_router(health_router)
app.include_router(company_router)
app.include_router(technology_router)
app.include_router(report_router)
app.include_router(evidence_router)


@app.get("/")
async def root():
    return {
        "service": "SUTRA AI Agents API",
        "version": "1.0.0",
        "status": "running",
        "llm_provider": settings.llm_provider,
        "endpoints": {
            "health": "/health/",
            "companies": "/company/register",
            "technologies": "/technology/register",
            "reports": "/report/generate",
        },
    }
