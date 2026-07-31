from datetime import date
from typing import Any
from app.providers import get_provider
from app.domain.application.services import MarketAnalyzerService, _years_to_expiry
from app.analytics.gamma_analyzer import GammaAnalyzer
from app.analytics.delta_analyzer import DeltaAnalyzer
from app.analytics.options_analyzer import OptionsAnalyzer
from app.analytics.volatility_analyzer import VolatilityAnalyzer
from app.analytics.dealer_analyzer import DealerAnalyzer
from app.analytics.rule_engine import RuleEngine
from app.analytics.score_engine import ScoreEngine
from app.analytics.confidence_engine import ConfidenceEngine
from app.analytics.scenario_engine import ScenarioEngine
from app.analytics.narrative_engine import NarrativeEngine

class MarketAnalyzer:
    @staticmethod
    def generate_intelligence_report(ticker: str, expiration: date) -> dict[str, Any]:
        provider = get_provider()
        
        # 1. Obtener datos crudos
        chain = provider.get_options_chain(ticker, expiration)
        vix_data = provider.get_vix_data()
        
        # 2. Calcular griegas y exposiciones agrupadas
        today = date.today()
        T = _years_to_expiry(expiration, today)
        report = MarketAnalyzerService.build_exposure_report(chain, today)
        
        # 3. Invocar sub-analizadores unitarios
        gamma_analysis = GammaAnalyzer.analyze(report)
        delta_analysis = DeltaAnalyzer.analyze(report)
        options_analysis = OptionsAnalyzer.analyze(report)
        vol_analysis = VolatilityAnalyzer.analyze(chain, report, vix_data, T)
        dealer_analysis = DealerAnalyzer.analyze(report)
        
        # 4. Calcular puntuaciones y scores
        scores = ScoreEngine.calculate_scores(
            report=report,
            vix_current=vol_analysis.vix_current,
            vix_percentile=vol_analysis.vix_percentile,
            vix_rank=vol_analysis.vix_rank,
            net_gex=gamma_analysis.net_gamma_exposure,
            net_dex=delta_analysis.net_delta_exposure
        )
        
        # 5. Estimar confianza del análisis
        confidence = ConfidenceEngine.calculate_confidence(
            spot=chain.spot_price,
            zg=gamma_analysis.zero_gamma,
            net_gex=gamma_analysis.net_gamma_exposure,
            net_dex=delta_analysis.net_delta_exposure,
            pc_oi=options_analysis.put_call_oi_ratio,
            pc_vol=options_analysis.put_call_volume_ratio,
            vix=vol_analysis.vix_current,
            bullish_score=scores.bullish_score,
            bearish_score=scores.bearish_score
        )
        
        # 6. Evaluar regímenes activos
        regimes = RuleEngine.evaluate_regimes(
            spot=chain.spot_price,
            T=T,
            gamma=gamma_analysis,
            delta=delta_analysis,
            options=options_analysis,
            vol=vol_analysis,
            dealer=dealer_analysis,
            max_pain=report.max_pain,
            call_wall=report.call_wall,
            put_wall=report.put_wall
        )

        
        # 7. Generar escenarios
        scenarios = ScenarioEngine.generate_scenarios(
            spot=chain.spot_price,
            gamma=gamma_analysis,
            delta=delta_analysis,
            vol=vol_analysis,
            confidence=confidence,
            bullish_score=scores.bullish_score,
            bearish_score=scores.bearish_score
        )
        
        # 8. Redactar narrativa institucional en lenguaje natural
        narrative_engine = NarrativeEngine()
        narrative = narrative_engine.generate_report(
            ticker=ticker,
            spot=chain.spot_price,
            expiration_str=expiration.strftime("%Y-%m-%d"),
            gamma=gamma_analysis,
            delta=delta_analysis,
            options=options_analysis,
            vol=vol_analysis,
            dealer=dealer_analysis,
            scores=scores,
            confidence=confidence,
            max_pain=report.max_pain,
            include_evidence=True
        )

        
        # Estructura del contexto para el resolutor de preguntas (QueryEngine)
        # para que pueda ser guardado o usado en llamadas directas
        query_context = {
            "spot": chain.spot_price,
            "gamma": gamma_analysis,
            "delta": delta_analysis,
            "options": options_analysis,
            "vol": vol_analysis,
            "dealer": dealer_analysis,
            "scores": scores,
            "confidence": confidence,
            "max_pain": report.max_pain
        }
        
        return {
            "ticker": ticker,
            "expiration": expiration.strftime("%Y-%m-%d"),
            "spot_price": chain.spot_price,
            "fetched_at": chain.fetched_at,
            "gamma_analysis": gamma_analysis,
            "delta_analysis": delta_analysis,
            "options_analysis": options_analysis,
            "volatility_analysis": vol_analysis,
            "dealer_analysis": dealer_analysis,
            "scores": scores,
            "confidence": confidence,
            "regimes": regimes,
            "scenarios": scenarios,
            "narrative": narrative,
            "query_context": query_context
        }
