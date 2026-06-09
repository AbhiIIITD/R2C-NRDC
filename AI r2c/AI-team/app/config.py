from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/sutra_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM Provider Selection: "gemini", "openai", "anthropic", "groq"
    llm_provider: str = "gemini"

    # Gemini
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-pro"
    embedding_model: str = "models/embedding-001"

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # Anthropic
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Groq
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"

    # Cache
    cache_ttl: int = 3600
    cache_max_size: int = 1000

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
