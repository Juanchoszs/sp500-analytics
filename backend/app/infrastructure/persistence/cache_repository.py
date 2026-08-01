from datetime import date
from typing import Optional, Dict, Any

from app.domain.repository.market_repository import MarketRepository
from app.domain.repository.analysis_repository import AnalysisRepository
from app.domain.model.market import ExposureReport
from app.providers.base import OptionsChain
from app.providers import get_provider
from app.cache import cached


class CacheMarketRepository(MarketRepository):
    """Implementation of MarketRepository using in-memory cache."""
    
    def __init__(self):
        self._provider = None
    
    def _get_provider(self):
        """Lazy load provider."""
        if self._provider is None:
            self._provider = get_provider()
        return self._provider
    
    def get_options_chain(self, ticker: str, expiration: date) -> OptionsChain:
        """Retrieve options chain with caching."""
        provider = self._get_provider()
        cache_key = f"options_chain:{ticker}:{expiration}"
        
        def factory():
            return provider.get_options_chain(ticker, expiration)
        
        return cached(cache_key, ttl=300, factory=factory)  # 5 minutes TTL
    
    def get_exposure_report(self, ticker: str, expiration: date) -> ExposureReport:
        """Retrieve or compute exposure report."""
        from app.domain.application.services import MarketAnalyzerService
        
        chain = self.get_options_chain(ticker, expiration)
        return MarketAnalyzerService.build_exposure_report(chain, date.today())
    
    def cache_exposure_report(self, report: ExposureReport) -> None:
        """Cache an exposure report for future use."""
        cache_key = f"exposure_report:{report.underlying}:{report.expiration}"
        # Use the existing cache mechanism
        def factory():
            return report
        cached(cache_key, ttl=600, factory=factory)  # 10 minutes TTL
    
    def get_cached_exposure_report(self, ticker: str, expiration: date) -> Optional[ExposureReport]:
        """Retrieve cached exposure report if available."""
        from app.cache import _ttl_buckets, _bucket_locks
        
        cache_key = f"exposure_report:{ticker}:{expiration}"
        ttl = 600
        bucket, lock = _bucket_for_ttl(ttl)
        
        with lock:
            if cache_key in bucket:
                return bucket[cache_key]
        return None
    
    def get_vix_data(self) -> dict:
        """Retrieve VIX data with caching."""
        provider = self._get_provider()
        cache_key = "vix_data"
        
        def factory():
            return provider.get_vix_data()
        
        return cached(cache_key, ttl=60, factory=factory)  # 1 minute TTL
    
    def get_historical_data(self, ticker: str, period: str, interval: str) -> dict:
        """Retrieve historical price data with caching."""
        provider = self._get_provider()
        cache_key = f"historical_data:{ticker}:{period}:{interval}"
        
        def factory():
            return provider.get_historical_data(ticker, period, interval)
        
        return cached(cache_key, ttl=300, factory=factory)  # 5 minutes TTL


class CacheAnalysisRepository(AnalysisRepository):
    """Implementation of AnalysisRepository using in-memory cache."""
    
    def __init__(self):
        self._cache: Dict[str, Any] = {}
    
    def save_comprehensive_analysis(self, analysis: Any) -> None:
        """Save a comprehensive analysis result."""
        from app.domain.model.analysis import ComprehensiveAnalysis
        
        if not isinstance(analysis, ComprehensiveAnalysis):
            return
        
        cache_key = f"analysis:{analysis.ticker}:{analysis.expiration}"
        self._cache[cache_key] = analysis
    
    def get_comprehensive_analysis(self, ticker: str, expiration: date) -> Optional[Any]:
        """Retrieve a comprehensive analysis if available."""
        cache_key = f"analysis:{ticker}:{expiration}"
        return self._cache.get(cache_key)
    
    def save_yield_anomaly_report(self, report: Any) -> None:
        """Save a yield anomaly report."""
        from app.domain.model.analysis import YieldAnomalyReport
        
        if not isinstance(report, YieldAnomalyReport):
            return
        
        # Extract ticker from historical context
        ticker = report.historical_context.get("ticker", "unknown")
        cache_key = f"yield_anomaly:{ticker}"
        self._cache[cache_key] = report
    
    def get_yield_anomaly_report(self, ticker: str) -> Optional[Any]:
        """Retrieve a yield anomaly report if available."""
        cache_key = f"yield_anomaly:{ticker}"
        return self._cache.get(cache_key)
    
    def get_analysis_history(self, ticker: str, limit: int = 10) -> list:
        """Retrieve historical analysis results for a ticker."""
        # Filter cache entries for this ticker
        history = []
        for key, value in self._cache.items():
            if key.startswith(f"analysis:{ticker}:"):
                history.append(value)
                if len(history) >= limit:
                    break
        return history
    
    def invalidate_cache(self, ticker: str, expiration: Optional[date] = None) -> None:
        """Invalidate cached analysis data for a ticker."""
        if expiration:
            cache_key = f"analysis:{ticker}:{expiration}"
            if cache_key in self._cache:
                del self._cache[cache_key]
        else:
            # Invalidate all entries for this ticker
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(f"analysis:{ticker}:")]
            for key in keys_to_delete:
                del self._cache[key]


# Helper function for cache buckets
def _bucket_for_ttl(ttl: int):
    from app.cache import _ttl_buckets, _bucket_locks, _global_cache_lock
    from cachetools import TTLCache
    from threading import Lock
    
    with _global_cache_lock:
        if ttl not in _ttl_buckets:
            _ttl_buckets[ttl] = TTLCache(maxsize=256, ttl=ttl)
            _bucket_locks[ttl] = Lock()
        return _ttl_buckets[ttl], _bucket_locks[ttl]
