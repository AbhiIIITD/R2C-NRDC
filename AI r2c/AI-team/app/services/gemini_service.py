import logging
from typing import Any, Dict, List

from app.services.llm_service import llm_service, AIServiceError

logger = logging.getLogger(__name__)


class GeminiService:
    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        return await llm_service.generate_text(prompt, temperature, max_tokens)

    async def generate_json(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> Dict[str, Any]:
        return await llm_service.generate_json(prompt, temperature, max_tokens)

    async def analyze_with_citations(
        self,
        prompt: str,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        citation_prompt = f"""{prompt}

IMPORTANT: In your response, include a "citations" field with source attributions.
Format: {{"answer": "...", "citations": [{{"source": "...", "url": "...", "evidence": "..."}}]}}"""
        return await self.generate_json(citation_prompt, temperature=temperature)
