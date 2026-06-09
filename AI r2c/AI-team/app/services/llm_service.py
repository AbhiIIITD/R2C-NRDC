import os
import json
import logging
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    pass


class LLMProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        ...

    @abstractmethod
    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        ...

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        ...


class GeminiProvider(LLMProvider):
    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        self.genai = genai
        self.model_name = settings.gemini_model
        self.embedding_model = settings.embedding_model

    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        model = self.genai.GenerativeModel(self.model_name)
        response = model.generate_content(
            prompt,
            generation_config=self.genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text

    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        json_prompt = f"""{prompt}

IMPORTANT: Respond with VALID JSON ONLY. Do not include any markdown, code blocks, or explanations."""
        text = await self.generate_text(json_prompt, temperature=temperature, max_tokens=max_tokens)
        return self._parse_json(text)

    async def generate_embedding(self, text: str) -> List[float]:
        result = self.genai.embed_content(model=self.embedding_model, content=text)
        return result["embedding"]

    @staticmethod
    def _parse_json(text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())


class OpenAIProvider(LLMProvider):
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model or "gpt-4o"

    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        # Use max_completion_tokens for newer models (gpt-5.5, gpt-4o+)
        param = "max_completion_tokens" if self.model.startswith(("gpt-5", "gpt-4o")) else "max_tokens"
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            param: max_tokens,
        }
        # Only add temperature if model supports it (not all models do)
        if not self.model.startswith("gpt-5"):
            kwargs["temperature"] = temperature
        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        # Use max_completion_tokens for newer models (gpt-5.5, gpt-4o+)
        param = "max_completion_tokens" if self.model.startswith(("gpt-5", "gpt-4o")) else "max_tokens"
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            param: max_tokens,
            "response_format": {"type": "json_object"},
        }
        # Only add temperature if model supports it (not all models do)
        if not self.model.startswith("gpt-5"):
            kwargs["temperature"] = temperature
        response = await self.client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content or "{}"
        return json.loads(text)

    async def generate_embedding(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model=settings.openai_embedding_model or "text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding


class AnthropicProvider(LLMProvider):
    def __init__(self):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model or "claude-sonnet-4-20250514"

    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        json_prompt = f"""{prompt}

Respond with valid JSON only inside <json> tags."""
        text = await self.generate_text(json_prompt, temperature=temperature, max_tokens=max_tokens)
        import re
        match = re.search(r'<json>(.*?)</json>', text, re.DOTALL)
        if match:
            return json.loads(match.group(1).strip())
        return json.loads(text.strip())

    async def generate_embedding(self, text: str) -> List[float]:
        raise NotImplementedError("Anthropic does not provide embedding API")


class GroqProvider(LLMProvider):
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = settings.groq_model or "llama-3.3-70b-versatile"

    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a JSON-only assistant. Respond with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        text = response.choices[0].message.content or "{}"
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())

    async def generate_embedding(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model="mxbai-embed-large-v1",
            input=text,
        )
        return response.data[0].embedding


class LLMService:
    def __init__(self):
        self._provider: Optional[LLMProvider] = None

    @property
    def provider(self) -> LLMProvider:
        if self._provider is None:
            self._provider = self._create_provider()
        return self._provider

    def _create_provider(self) -> LLMProvider:
        provider_name = settings.llm_provider.lower()
        if provider_name == "openai":
            return OpenAIProvider()
        elif provider_name == "anthropic":
            return AnthropicProvider()
        elif provider_name == "groq":
            return GroqProvider()
        elif provider_name == "gemini":
            return GeminiProvider()
        else:
            logger.warning(f"Unknown provider '{provider_name}', falling back to Gemini")
            return GeminiProvider()

    async def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        return await self.provider.generate_text(prompt, temperature, max_tokens)

    async def generate_json(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> Dict[str, Any]:
        return await self.provider.generate_json(prompt, temperature, max_tokens)

    async def generate_embedding(self, text: str) -> List[float]:
        return await self.provider.generate_embedding(text)


llm_service = LLMService()
