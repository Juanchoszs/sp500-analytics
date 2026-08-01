import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List, Optional

from app.domain.model.market import ExposureReport
from app.domain.model.analysis import (
    GammaAnalysis,
    DeltaAnalysis,
    OptionsAnalysis,
    VolatilityAnalysis,
    DealerAnalysis,
    DeltaHedgingStrength,
    YieldAnomalyReport,
    AnomalyItem,
)
from app.providers.base import OptionsChain


class AnalysisStrategy(ABC):
    """Base strategy for different types of analysis."""
    
    @abstractmethod
    def analyze(self, *args, **kwargs) -> Any:
        """Execute the analysis strategy."""
        pass


class GammaAnalysisStrategy(AnalysisStrategy):
    """Strategy for gamma exposure analysis."""
    
    def analyze(self, report: ExposureReport) -> GammaAnalysis:
        spot = report.spot_price
        zg = report.zero_gamma
        
        # Calcular distancia al flip
        dist_pct = None
        is_close = False
        if zg:
            dist_pct = ((spot - zg) / spot) * 100
            is_close = abs(dist_pct) <= 1.0
            
        # Determinar régimen
        if zg is not None:
            regime = "positive" if spot > zg else "negative"
        else:
            regime = "positive" if report.net_gamma_exposure >= 0 else "negative"
            
        if regime == "positive":
            desc = "Régimen de Gamma Positiva. Los Dealers están posicionados largos en gamma neto."
            behavior = "Las coberturas de los dealers actúan como un amortiguador (compran caídas y venden subidas), lo que reduce la volatilidad realizada y favorece movimientos de reversión a la media dentro del rango delimitado por el Put Wall y el Call Wall."
            risks = [
                "Baja volatilidad que reduce la prima de las opciones (decaimiento por Theta acelerado).",
                "Efecto 'magneto' o 'pinning' en niveles de alta concentración de Gamma (como el Call Wall o Max Pain) al aproximarse el vencimiento."
            ]
        else:
            desc = "Régimen de Gamma Negativa. Los Dealers están posicionados cortos en gamma neto."
            behavior = "Las coberturas de los dealers son desestabilizadoras (venden caídas para cubrir deltas cortos de puts, y compran subidas), lo que tiende a amplificar los movimientos del precio y aumentar la volatilidad intradía."
            risks = [
                "Aceleración de caídas rápidas si el precio rompe a la baja niveles de soporte clave (ej. Put Wall).",
                "Riesgo de brechas rápidas (gaps) y volatilidad descontrolada, ya que los dealers persiguen la dirección del precio."
            ]
            
        return GammaAnalysis(
            net_gamma_exposure=report.net_gamma_exposure,
            call_wall=report.call_wall,
            put_wall=report.put_wall,
            gamma_wall=report.gamma_wall,
            zero_gamma=zg,
            gamma_flip_distance_pct=dist_pct,
            is_gamma_flip_close=is_close,
            regime_type=regime,
            description=desc,
            risks=risks,
            expected_behavior=behavior
        )


class DeltaAnalysisStrategy(AnalysisStrategy):
    """Strategy for delta exposure analysis."""
    
    def analyze(self, report: ExposureReport) -> DeltaAnalysis:
        net_dex = report.net_delta_exposure
        spot = report.spot_price
        c_multiplier = 100
        
        best_call_strike = None
        best_put_strike = None
        max_call_dex_val = 0.0
        max_put_dex_val = 0.0
        
        for s in report.strikes:
            c_dex = s.call_delta * s.call_oi * c_multiplier * spot
            p_dex = abs(s.put_delta * s.put_oi * c_multiplier * spot)
            
            if c_dex > max_call_dex_val:
                max_call_dex_val = c_dex
                best_call_strike = s.strike
            if p_dex > max_put_dex_val:
                max_put_dex_val = p_dex
                best_put_strike = s.strike
                
        threshold = 0.05 * (max_call_dex_val + max_put_dex_val + 1.0)

        # Clasificar dominancia de delta según el marco teórico MenthorQ
        if net_dex < -threshold:
            regime = "call_dominated"
            desc = "Estructura de Delta dominada por Calls. El sesgo de delta neto del dealer es negativo (corto delta)."
            pressure = "Los Creadores de Mercado (Dealers) están posicionados cortos en delta por la venta neta de calls al público. Conforme el subyacente sube, la cobertura delta obliga a los dealers a comprar más subyacente, generando un flujo compradora de apoyo."
        elif net_dex > threshold:
            regime = "put_dominated"
            desc = "Estructura de Delta dominada por Puts. El sesgo de delta neto del dealer es positivo (largo delta)."
            pressure = "Los Creadores de Mercado (Dealers) están posicionados largos en delta por la venta neta de puts al público. Ante movimientos bajistas del subyacente, las deltas de puts aumentan, obligando a los dealers a vender el subyacente para rebalancear, acelerando la presión vendedora."
        else:
            regime = "neutral"
            desc = "Estructura de Delta equilibrada. El sesgo direccional de delta entre Calls y Puts se mantiene en rango de neutralidad."
            pressure = "La presión de cobertura de delta por parte de los dealers es simétrica. El precio no experimenta un sesgo forzado por rebalanceo de deltas de opciones."
            
        return DeltaAnalysis(
            net_delta_exposure=net_dex,
            call_dex_wall=best_call_strike,
            put_dex_wall=best_put_strike,
            regime_type=regime,
            description=desc,
            hedging_pressure=pressure
        )


class OptionsAnalysisStrategy(AnalysisStrategy):
    """Strategy for options flow analysis."""
    
    def analyze(self, report: ExposureReport) -> OptionsAnalysis:
        pc_oi = report.put_call_oi_ratio
        pc_vol = report.put_call_volume_ratio
        high_liq = report.high_liquidity_strikes
        
        # Clasificación del Régimen de Opciones
        if pc_oi > 1.2:
            regime = "put_dominated"
            sentiment = "Sentimiento del mercado cauteloso o abiertamente bajista. La acumulación de contratos Put en el Open Interest supera significativamente a los de Call, denotando una alta demanda de coberturas de cartera (hedging protectivo) o especulación bajista."
        elif pc_oi < 0.75:
            regime = "call_dominated"
            sentiment = "Sentimiento del mercado optimista o alcista. El Open Interest muestra un claro sesgo hacia contratos Call, lo que refleja un posicionamiento mayoritariamente alcista y un apetito especulativo por apalancarse en la subida del SPY."
        else:
            regime = "neutral"
            sentiment = "Sentimiento del mercado neutral y balanceado. El posicionamiento en opciones muestra una distribución equitativa entre coberturas bajistas y apuestas alcistas, lo que sugiere indecisión o consolidación en el corto plazo."
            
        # Formatear zonas de liquidez
        zones = f"Los strikes con mayor concentración transaccional y de acumulación histórica son: {', '.join(map(str, high_liq))}. Estos niveles actuarán como zonas de soporte o resistencia psicológica de alta fricción debido al flujo constante de coberturas."
        
        return OptionsAnalysis(
            put_call_oi_ratio=pc_oi,
            put_call_volume_ratio=pc_vol,
            high_liquidity_strikes=high_liq,
            regime_type=regime,
            sentiment_description=sentiment,
            liquidity_zones=zones
        )


class VolatilityAnalysisStrategy(AnalysisStrategy):
    """Strategy for volatility analysis."""
    
    def analyze(self, chain: OptionsChain, report: ExposureReport, vix_data: Dict[str, Any], T: float) -> VolatilityAnalysis:
        spot = chain.spot_price
        vix_current = vix_data.get("current", 15.0)
        vix_history = vix_data.get("history", [vix_current])
        
        # Calcular IV Rank e IV Percentile del VIX
        if vix_history:
            vix_min = min(vix_history)
            vix_max = max(vix_history)
            vix_range = vix_max - vix_min
            vix_rank = ((vix_current - vix_min) / vix_range * 100) if vix_range > 0 else 50.0
            
            below_count = sum(1 for v in vix_history if v < vix_current)
            vix_percentile = (below_count / len(vix_history) * 100)
        else:
            vix_min = 10.0
            vix_max = 30.0
            vix_rank = 50.0
            vix_percentile = 50.0
            
        # Calcular ATM IV de SPY
        closest_call = min(chain.calls, key=lambda c: abs(c.strike - spot)) if chain.calls else None
        closest_put = min(chain.puts, key=lambda p: abs(p.strike - spot)) if chain.puts else None
        
        atm_iv = 0.15
        if closest_call:
            atm_iv = closest_call.implied_volatility
            
        # 1. Expected Move basado en IV
        T_adjusted = max(T, 1.0 / 365.0)
        em_iv = spot * atm_iv * math.sqrt(T_adjusted)
        
        # 2. Expected Move basado en Straddle ATM
        em_straddle = em_iv
        if closest_call and closest_put:
            c_mid = (closest_call.bid + closest_call.ask) / 2.0
            p_mid = (closest_put.bid + closest_put.ask) / 2.0
            if c_mid <= 0:
                c_mid = closest_call.last_price
            if p_mid <= 0:
                p_mid = closest_put.last_price
            
            straddle_price = c_mid + p_mid
            if straddle_price > 0:
                em_straddle = straddle_price * 0.85
                
        # Usamos el esperado por Straddle si es viable y la expiración es corta
        em_used = em_straddle if (T * 365.0 <= 7.0) else em_iv
        
        lower_bound = spot - em_used
        upper_bound = spot + em_used
        
        # Clasificar régimen de volatilidad
        if vix_current > 20.0 or vix_percentile > 75.0:
            regime = "high_volatility"
            desc = f"Régimen de Alta Volatilidad. El VIX actual en {vix_current:.2f} se encuentra en el percentil {vix_percentile:.1f}% de su rango anual. Las primas de opciones están infladas, lo que sugiere un entorno de incertidumbre y mayor riesgo de cola."
        elif vix_current < 14.0 or vix_percentile < 25.0:
            regime = "low_volatility"
            desc = f"Régimen de Baja Volatilidad (Complacencia). El VIX actual en {vix_current:.2f} se ubica en el percentil {vix_percentile:.1f}% del rango anual. Las opciones están baratas, indicando calma en el mercado y un sesgo ordenado."
        else:
            regime = "neutral"
            desc = f"Régimen de Volatilidad Moderada o Normal. El VIX en {vix_current:.2f} cotiza en su percentil de equilibrio anual ({vix_percentile:.1f}%), reflejando expectativas de movimiento estándar."
            
        return VolatilityAnalysis(
            vix_current=vix_current,
            vix_rank=vix_rank,
            vix_percentile=vix_percentile,
            atm_iv=atm_iv,
            expected_move_iv=em_iv,
            expected_move_straddle=em_straddle,
            expected_move_used=em_used,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            regime_type=regime,
            description=desc,
            historical_vix_min=vix_min,
            historical_vix_max=vix_max
        )


class DealerAnalysisStrategy(AnalysisStrategy):
    """Strategy for dealer positioning analysis."""
    
    def analyze(self, report: ExposureReport) -> DealerAnalysis:
        net_gex = report.net_gamma_exposure
        net_dex = report.net_delta_exposure
        
        # Régimen de Gamma del Dealer
        if net_gex >= 0:
            gamma_regime = "long_gamma"
            style = "mean_reversion"
            desc = "Los Dealers se encuentran teóricamente en posición de 'Long Gamma' agregada."
            impact = "El comportamiento de cobertura (hedging) de los creadores de mercado consiste en vender cuando el subyacente sube y comprar cuando baja para mantener sus carteras neutrales de delta. Esta dinámica actúa como un amortiguador de la volatilidad del mercado, favoreciendo la consolidación del SPY cerca de los niveles de alta concentración de interés (como Max Pain)."
        else:
            gamma_regime = "short_gamma"
            style = "momentum_following"
            desc = "Los Dealers se encuentran teóricamente en posición de 'Short Gamma' agregada."
            impact = "El comportamiento de cobertura obliga a los creadores de mercado a vender a medida que el precio baja y comprar a medida que el precio sube para ajustar sus coberturas. Este flujo de rebalanceo es dinámicamente pro-cíclico y amplifica la volatilidad existente. Puede generar aceleraciones bruscas si se superan soportes de volumen (Put Walls)."
            
        # Régimen de Delta del Dealer
        delta_regime = "long_delta" if net_dex >= 0 else "short_delta"
        
        return DealerAnalysis(
            net_gamma_exposure=net_gex,
            net_delta_exposure=net_dex,
            dealer_gamma_regime=gamma_regime,
            dealer_delta_regime=delta_regime,
            hedging_style=style,
            description=desc,
            hedging_impact=impact
        )


class HedgingStrengthStrategy(AnalysisStrategy):
    """Strategy for delta hedging strength analysis."""
    
    def analyze(self, report: ExposureReport, T: float) -> DeltaHedgingStrength:
        spot = report.spot_price if report.spot_price > 0 else 1.0
        
        # 1. Componente Delta (OI x Delta)
        total_dex_abs = sum(abs(s.delta_exposure) for s in report.strikes) or 1.0
        net_dex_magnitude = abs(report.net_delta_exposure)
        dex_factor = min(100.0, (net_dex_magnitude / (total_dex_abs + 1e-5)) * 100.0 * 2.5)

        # 2. Componente Gamma (Aceleración de rebalanceo)
        total_gex_abs = sum(abs(s.gamma_exposure) for s in report.strikes) or 1.0
        net_gex_magnitude = abs(report.net_gamma_exposure)
        gex_factor = min(100.0, (net_gex_magnitude / (total_gex_abs + 1e-5)) * 100.0 * 2.5)

        # 3. Componente Distancia al Spot (Strikes ATM pesan más)
        atm_exposure = sum(
            abs(s.delta_exposure) + abs(s.gamma_exposure)
            for s in report.strikes
            if abs(s.strike - spot) / spot <= 0.015  # +/-1.5% del spot
        )
        total_exposure = (total_dex_abs + total_gex_abs) or 1.0
        distance_factor = min(100.0, (atm_exposure / total_exposure) * 100.0 * 2.0)

        # 4. Componente Tiempo al vencimiento
        days = max(T * 365.0, 0.5)
        time_factor = min(100.0, max(10.0, 100.0 * math.exp(-days / 14.0)))

        # 5. Componente Liquidez (Volumen / OI Ratio)
        total_vol = sum(s.call_volume + s.put_volume for s in report.strikes)
        total_oi = sum(s.call_oi + s.put_oi for s in report.strikes) or 1
        vol_oi_ratio = total_vol / total_oi
        liquidity_factor = min(100.0, vol_oi_ratio * 100.0 * 3.0)

        # Score Ponderado (0 - 100)
        score = (
            dex_factor * 0.30 +
            gex_factor * 0.25 +
            distance_factor * 0.20 +
            time_factor * 0.15 +
            liquidity_factor * 0.10
        )
        score = round(min(100.0, max(0.0, score)), 1)

        # Clasificación
        if score < 20.0:
            classification = "Very Weak"
            desc = "Intensidad de Cobertura Muy Débil. Los dealers tienen un sesgo de delta mínimo y escasa urgencia de rebalanceo."
        elif score < 40.0:
            classification = "Weak"
            desc = "Intensidad de Cobertura Débil. Los flujos de hedging son moderados y no dominan la dinámica intradía del precio."
        elif score < 60.0:
            classification = "Neutral"
            desc = "Intensidad de Cobertura Neutral. Flujo equilibrado de rebalanceo delta/gamma por parte de creadores de mercado."
        elif score < 80.0:
            classification = "Strong"
            desc = "Intensidad de Cobertura Fuerte. Alta concentración de riesgo delta/gamma cerca del spot obliga a rebalanceos constantes."
        else:
            classification = "Very Strong"
            desc = "Intensidad de Cobertura Muy Fuerte. Gamma explosion y/o desbalance severo de delta exige cobertura agresiva por los dealers."

        factors = {
            "delta_exposure_factor": round(dex_factor, 1),
            "gamma_exposure_factor": round(gex_factor, 1),
            "spot_proximity_factor": round(distance_factor, 1),
            "expiry_time_factor": round(time_factor, 1),
            "liquidity_flow_factor": round(liquidity_factor, 1),
        }

        return DeltaHedgingStrength(
            score=score,
            classification=classification,
            net_dex=report.net_delta_exposure,
            net_gex=report.net_gamma_exposure,
            factors=factors,
            description=desc,
        )


class AnalysisService:
    """Unified service for all market analysis operations."""
    
    def __init__(self):
        self.gamma_strategy = GammaAnalysisStrategy()
        self.delta_strategy = DeltaAnalysisStrategy()
        self.options_strategy = OptionsAnalysisStrategy()
        self.volatility_strategy = VolatilityAnalysisStrategy()
        self.dealer_strategy = DealerAnalysisStrategy()
        self.hedging_strategy = HedgingStrengthStrategy()
    
    def analyze_gamma(self, report: ExposureReport) -> GammaAnalysis:
        """Execute gamma analysis using the gamma strategy."""
        return self.gamma_strategy.analyze(report)
    
    def analyze_delta(self, report: ExposureReport) -> DeltaAnalysis:
        """Execute delta analysis using the delta strategy."""
        return self.delta_strategy.analyze(report)
    
    def analyze_options(self, report: ExposureReport) -> OptionsAnalysis:
        """Execute options analysis using the options strategy."""
        return self.options_strategy.analyze(report)
    
    def analyze_volatility(
        self,
        chain: OptionsChain,
        report: ExposureReport,
        vix_data: Dict[str, Any],
        T: float
    ) -> VolatilityAnalysis:
        """Execute volatility analysis using the volatility strategy."""
        return self.volatility_strategy.analyze(chain, report, vix_data, T)
    
    def analyze_dealer(self, report: ExposureReport) -> DealerAnalysis:
        """Execute dealer analysis using the dealer strategy."""
        return self.dealer_strategy.analyze(report)
    
    def analyze_hedging_strength(self, report: ExposureReport, T: float) -> DeltaHedgingStrength:
        """Execute hedging strength analysis using the hedging strategy."""
        return self.hedging_strategy.analyze(report, T)
    
    def analyze_all(
        self,
        chain: OptionsChain,
        report: ExposureReport,
        vix_data: Dict[str, Any],
        T: float,
        include_hedging_strength: bool = True
    ) -> Dict[str, Any]:
        """
        Execute all analysis strategies and return consolidated results.
        
        Args:
            chain: Options chain data
            report: Exposure report
            vix_data: VIX historical and current data
            T: Time to expiry in years
            include_hedging_strength: Whether to include hedging strength analysis
            
        Returns:
            Dictionary containing all analysis results
        """
        results = {
            "gamma": self.analyze_gamma(report),
            "delta": self.analyze_delta(report),
            "options": self.analyze_options(report),
            "volatility": self.analyze_volatility(chain, report, vix_data, T),
            "dealer": self.analyze_dealer(report),
        }
        
        if include_hedging_strength:
            results["hedging_strength"] = self.analyze_hedging_strength(report, T)
        
        return results
