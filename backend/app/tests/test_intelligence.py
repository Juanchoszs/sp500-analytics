from datetime import date
from app.providers.base import OptionsChain, OptionQuote
from app.domain.application.services import MarketAnalyzerService
build_exposure_report = MarketAnalyzerService.build_exposure_report
from app.analytics.gamma_analyzer import GammaAnalyzer
from app.analytics.delta_analyzer import DeltaAnalyzer
from app.analytics.options_analyzer import OptionsAnalyzer
from app.analytics.volatility_analyzer import VolatilityAnalyzer
from app.analytics.dealer_analyzer import DealerAnalyzer
from app.analytics.score_engine import ScoreEngine
from app.analytics.confidence_engine import ConfidenceEngine
from app.analytics.scenario_engine import ScenarioEngine
from app.analytics.narrative_engine import NarrativeEngine
from app.analytics.query_engine import QueryEngine

def test_intelligence_engine_calculation():
    # 1. Crear datos de opciones mockeados (SPY a $550, Call Wall en 560, Put Wall en 540)
    spot = 550.0
    expiration = date(2026, 7, 24)
    
    # 3 contratos call, 3 put
    calls = [
        OptionQuote(strike=540.0, bid=11.0, ask=11.2, last_price=11.1, volume=100, open_interest=1000, implied_volatility=0.14, contract_type="call", in_the_money=True),
        OptionQuote(strike=550.0, bid=3.4, ask=3.6, last_price=3.5, volume=500, open_interest=5000, implied_volatility=0.12, contract_type="call", in_the_money=False),
        OptionQuote(strike=560.0, bid=0.2, ask=0.3, last_price=0.25, volume=1000, open_interest=20000, implied_volatility=0.11, contract_type="call", in_the_money=False)

    ]
    puts = [
        OptionQuote(strike=540.0, bid=0.1, ask=0.2, last_price=0.15, volume=2000, open_interest=15000, implied_volatility=0.16, contract_type="put", in_the_money=False),
        OptionQuote(strike=550.0, bid=3.1, ask=3.3, last_price=3.2, volume=400, open_interest=4000, implied_volatility=0.13, contract_type="put", in_the_money=True),
        OptionQuote(strike=560.0, bid=10.5, ask=10.7, last_price=10.6, volume=50, open_interest=500, implied_volatility=0.15, contract_type="put", in_the_money=True)
    ]
    
    chain = OptionsChain(
        underlying="SPY",
        expiration=expiration,
        spot_price=spot,
        calls=calls,
        puts=puts,
        fetched_at="2026-07-20T12:00:00Z"
    )
    
    # 2. Generar el reporte de exposición base
    report = build_exposure_report(chain, date(2026, 7, 20))
    assert report.spot_price == spot
    assert report.call_wall == 560.0
    assert report.put_wall == 540.0


    
    # 3. Validar analizadores unitarios
    gamma_res = GammaAnalyzer.analyze(report)
    delta_res = DeltaAnalyzer.analyze(report)
    options_res = OptionsAnalyzer.analyze(report)
    
    # Mock VIX data
    vix_data = {
        "current": 13.5,
        "history": [12.0, 13.0, 14.0, 15.0, 16.0, 13.5, 13.0]
    }
    T = (expiration - date(2026, 7, 20)).days / 365.0
    vol_res = VolatilityAnalyzer.analyze(chain, report, vix_data, T)
    dealer_res = DealerAnalyzer.analyze(report)
    
    assert vol_res.vix_current == 13.5
    assert vol_res.expected_move_used > 0
    assert dealer_res.dealer_gamma_regime in ["long_gamma", "short_gamma"]
    
    # 4. Validar Score Engine
    scores_res = ScoreEngine.calculate_scores(
        report=report,
        vix_current=vol_res.vix_current,
        vix_percentile=vol_res.vix_percentile,
        vix_rank=vol_res.vix_rank,
        net_gex=gamma_res.net_gamma_exposure,
        net_dex=delta_res.net_delta_exposure
    )
    assert 0 <= scores_res.bullish_score <= 100
    assert 0 <= scores_res.bearish_score <= 100
    assert 0 <= scores_res.volatility_score <= 100
    
    # 5. Validar Confidence Engine
    confidence_res = ConfidenceEngine.calculate_confidence(
        spot=spot,
        zg=gamma_res.zero_gamma,
        net_gex=gamma_res.net_gamma_exposure,
        net_dex=delta_res.net_delta_exposure,
        pc_oi=options_res.put_call_oi_ratio,
        pc_vol=options_res.put_call_volume_ratio,
        vix=vol_res.vix_current,
        bullish_score=scores_res.bullish_score,
        bearish_score=scores_res.bearish_score
    )
    assert confidence_res.level in ["Alta", "Media", "Baja"]
    
    # 6. Validar Scenario Engine
    scenarios_res = ScenarioEngine.generate_scenarios(
        spot=spot,
        gamma=gamma_res,
        delta=delta_res,
        vol=vol_res,
        confidence=confidence_res,
        bullish_score=scores_res.bullish_score,
        bearish_score=scores_res.bearish_score
    )
    assert scenarios_res.principal.name != ""
    assert scenarios_res.alternative.name != ""
    assert scenarios_res.risk.name != ""
    
    # 7. Validar Query Engine
    context = {
        "spot": spot,
        "gamma": gamma_res,
        "delta": delta_res,
        "options": options_res,
        "vol": vol_res,
        "dealer": dealer_res,
        "scores": scores_res,
        "confidence": confidence_res,
        "max_pain": report.max_pain
    }
    answer_res = QueryEngine.answer_question("why_rising", context)
    assert answer_res["question_key"] == "why_rising"
    assert answer_res["answer"] != ""
    
    # 8. Validar Narrative Engine
    narrative_res = NarrativeEngine.generate_report(
        ticker="SPY",
        spot=spot,
        expiration_str="2026-07-24",
        gamma=gamma_res,
        delta=delta_res,
        options=options_res,
        vol=vol_res,
        dealer=dealer_res,
        scores=scores_res,
        confidence=confidence_res,
        max_pain=report.max_pain
    )

    assert "# INFORME" in narrative_res
