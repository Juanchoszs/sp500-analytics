import math
from dataclasses import dataclass
from typing import Dict, Any
from app.domain.model.market import ExposureReport


@dataclass
class DeltaHedgingStrength:
    score: float             # 0 a 100
    classification: str     # Very Weak | Weak | Neutral | Strong | Very Strong
    net_dex: float
    net_gex: float
    factors: Dict[str, float]
    description: str


class HedgingStrengthAnalyzer:
    @staticmethod
    def analyze(report: ExposureReport, T: float) -> DeltaHedgingStrength:
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

        # 4. Componente Tiempo al vencimiento (0DTE/cercano acelera el hedging por Gamma explosion)
        days = max(T * 365.0, 0.5)
        # Menos días -> mayor factor de urgencia
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
