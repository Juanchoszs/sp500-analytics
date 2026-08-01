from abc import ABC, abstractmethod
from datetime import date
from typing import Optional, List
from app.domain.model.analysis import (
    ComprehensiveAnalysis,
    YieldAnomalyReport,
    AnalysisScores,
    AnalysisConfidence,
)


class AnalysisRepository(ABC):
    """Repository interface for analysis data operations."""
    
    @abstractmethod
    def save_comprehensive_analysis(self, analysis: ComprehensiveAnalysis) -> None:
        """Save a comprehensive analysis result."""
        pass
    
    @abstractmethod
    def get_comprehensive_analysis(self, ticker: str, expiration: date) -> Optional[ComprehensiveAnalysis]:
        """Retrieve a comprehensive analysis if available."""
        pass
    
    @abstractmethod
    def save_yield_anomaly_report(self, report: YieldAnomalyReport) -> None:
        """Save a yield anomaly report."""
        pass
    
    @abstractmethod
    def get_yield_anomaly_report(self, ticker: str) -> Optional[YieldAnomalyReport]:
        """Retrieve a yield anomaly report if available."""
        pass
    
    @abstractmethod
    def get_analysis_history(self, ticker: str, limit: int = 10) -> List[ComprehensiveAnalysis]:
        """Retrieve historical analysis results for a ticker."""
        pass
    
    @abstractmethod
    def invalidate_cache(self, ticker: str, expiration: Optional[date] = None) -> None:
        """Invalidate cached analysis data for a ticker."""
        pass
