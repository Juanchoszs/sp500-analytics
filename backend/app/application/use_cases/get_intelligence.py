from datetime import date, datetime
from typing import Any, Optional
import logging

from app.domain.service.analysis_service import AnalysisService
from app.domain.service.ticker_service import TickerService
from app.domain.application.services import MarketAnalyzerService
from app.analytics.market_analyzer import MarketAnalyzer
from app.analytics.query_engine import QueryEngine
from app.analytics.query_cache import query_cache
from app.analytics.score_engine import ScoreEngine
from app.analytics.confidence_engine import ConfidenceEngine
from app.analytics.rule_engine import RuleEngine
from app.analytics.scenario_engine import ScenarioEngine
from app.analytics.narrative_engine import NarrativeEngine
from app.providers.base import DataProvider

logger = logging.getLogger("app.use_cases.get_intelligence")


class GetIntelligenceUseCase:
    """Use case for generating comprehensive market intelligence reports."""
    
    def __init__(self):
        self.analysis_service = AnalysisService()
    
    def execute(
        self,
        ticker: str,
        expiration: date,
        provider: DataProvider,
        enrich_with_index: bool = True
    ) -> dict[str, Any]:
        """
        Generate comprehensive intelligence report for a ticker and expiration.
        
        Args:
            ticker: Ticker symbol
            expiration: Expiration date
            provider: Data provider instance
            enrich_with_index: Whether to enrich with index data
            
        Returns:
            Dictionary containing comprehensive analysis results
        """
        # Normalize ticker for options data
        options_ticker = TickerService.normalize_for_options_data(ticker)
        
        # Generate intelligence report using the existing analyzer
        report = MarketAnalyzer.generate_intelligence_report(options_ticker, expiration)
        
        # Convert to dict if needed
        report_dict = report.model_dump() if hasattr(report, 'model_dump') else report
        
        # Enrich with index data if requested and ticker is SPY
        if enrich_with_index and ticker.upper() == "SPY":
            try:
                from app.routers.helpers import enrich_with_index_data
                spy_price = report_dict.get("spot_price", 0)
                report_dict = enrich_with_index_data(report_dict, ticker, spy_price, provider)

                if "index_ratio" in report_dict:
                    gamma = report_dict.get("gamma_analysis") or {}
                    if isinstance(gamma, dict):
                        for level_key in ("call_wall", "put_wall", "zero_gamma"):
                            val = gamma.get(level_key)
                            if val is not None:
                                report_dict[f"{level_key}_index"] = round(val * report_dict["index_ratio"], 2)
            except Exception as e:
                logger.exception("Failed to enrich with index data for %s: %s", ticker, e)
        
        return report_dict
    
    def answer_question(
        self,
        question_key: str,
        ticker: str,
        expiration: date,
        provider: DataProvider
    ) -> dict[str, Any]:
        """
        Answer a specific question about market conditions.
        
        Args:
            question_key: Key identifying the question to answer
            ticker: Ticker symbol
            expiration: Expiration date
            provider: Data provider instance
            
        Returns:
            Dictionary containing answer and justification data
        """
        exp_str = expiration.strftime("%Y-%m-%d")
        
        # Check cache first
        cached_response = query_cache.get(question_key, ticker, exp_str)
        if cached_response:
            logger.info("Cache hit for query: %s, ticker: %s, expiration: %s", question_key, ticker, exp_str)
            return cached_response
        
        # Generate response
        logger.info("Cache miss for query: %s, ticker: %s, expiration: %s", question_key, ticker, exp_str)
        report = self.execute(ticker, expiration, provider, enrich_with_index=True)
        answer_dict = QueryEngine.answer_question(question_key, report["query_context"])
        
        # Cache the response
        answer_dict["ticker"] = ticker
        query_cache.set(question_key, ticker, exp_str, answer_dict)
        
        return answer_dict
    
    def list_supported_questions(self) -> list[str]:
        """Get list of supported questions."""
        return QueryEngine.list_supported_questions()
