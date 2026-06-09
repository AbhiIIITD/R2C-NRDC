import redis
import json
import logging
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class CacheServiceError(Exception):
    """Custom exception for cache service errors"""
    pass


class CacheService:
    """Redis-based caching service"""
    
    def __init__(self):
        try:
            self.client = redis.from_url(settings.redis_url)
            self.ttl = settings.cache_ttl
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.client = None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            if self.client is None:
                return False
            
            ttl = ttl or self.ttl
            json_value = json.dumps(value)
            self.client.setex(key, ttl, json_value)
            return True
        except Exception as e:
            logger.error(f"Error setting cache: {str(e)}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.client is None:
                return None
            
            value = self.client.get(key)
            if value is None:
                return None
            
            return json.loads(value)
        except Exception as e:
            logger.error(f"Error getting cache: {str(e)}")
            return None
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if self.client is None:
                return False
            
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting cache: {str(e)}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            if self.client is None:
                return 0
            
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache pattern: {str(e)}")
            return 0
    
    async def health_check(self) -> bool:
        """Check Redis connection health"""
        try:
            if self.client is None:
                return False
            
            return self.client.ping()
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return False
