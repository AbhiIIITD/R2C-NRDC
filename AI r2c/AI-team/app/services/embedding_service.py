import math
import logging
from typing import List

from app.services.llm_service import llm_service, AIServiceError

logger = logging.getLogger(__name__)


class EmbeddingServiceError(Exception):
    pass


class EmbeddingService:
    async def generate_embedding(self, text: str) -> List[float]:
        try:
            return await llm_service.generate_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise EmbeddingServiceError(f"Failed to generate embedding: {str(e)}")

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        try:
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm_vec1 = math.sqrt(sum(a * a for a in vec1))
            norm_vec2 = math.sqrt(sum(b * b for b in vec2))
            if norm_vec1 == 0 or norm_vec2 == 0:
                return 0.0
            return dot_product / (norm_vec1 * norm_vec2)
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {str(e)}")
            return 0.0

    async def similarity_search(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[dict],
        top_k: int = 5,
    ) -> List[dict]:
        try:
            similarities = []
            for candidate in candidate_embeddings:
                similarity = self.cosine_similarity(
                    query_embedding,
                    candidate.get("embedding", []),
                )
                similarities.append({
                    **candidate,
                    "similarity_score": similarity,
                })
            similarities.sort(key=lambda x: x["similarity_score"], reverse=True)
            return similarities[:top_k]
        except Exception as e:
            logger.error(f"Error in similarity search: {str(e)}")
            raise EmbeddingServiceError(f"Similarity search failed: {str(e)}")
