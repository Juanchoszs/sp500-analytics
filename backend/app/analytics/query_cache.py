from typing import Any
from datetime import datetime, timedelta
import hashlib


class QueryCache:
    """Cache for query responses with intelligent invalidation."""
    
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._cache: dict[str, tuple[dict[str, Any], datetime]] = {}
    
    def _generate_key(self, question_key: str, ticker: str, expiration: str) -> str:
        """Generate cache key from query parameters."""
        key_str = f"{question_key}:{ticker}:{expiration}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, question_key: str, ticker: str, expiration: str) -> dict[str, Any] | None:
        """Get cached response if valid."""
        key = self._generate_key(question_key, ticker, expiration)
        
        if key not in self._cache:
            return None
        
        response, timestamp = self._cache[key]
        
        # Check if cache is expired
        if datetime.now() - timestamp > timedelta(seconds=self.ttl):
            del self._cache[key]
            return None
        
        return response
    
    def set(self, question_key: str, ticker: str, expiration: str, response: dict[str, Any]):
        """Cache a response."""
        key = self._generate_key(question_key, ticker, expiration)
        self._cache[key] = (response, datetime.now())
    
    def invalidate_ticker(self, ticker: str):
        """Invalidate all cache entries for a specific ticker."""
        keys_to_delete = []
        for key in self._cache:
            # Check if ticker is part of the key (simple check)
            # In production, could store ticker separately for more efficient lookup
            cached_data, _ = self._cache[key]
            if cached_data.get("ticker") == ticker:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self._cache[key]
    
    def clear(self):
        """Clear all cache entries."""
        self._cache.clear()
    
    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "ttl_seconds": self.ttl
        }


# Global cache instance
query_cache = QueryCache(ttl_seconds=300)
