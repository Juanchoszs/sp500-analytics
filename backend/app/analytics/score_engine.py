from dataclasses import dataclass
from typing import Any
from app.domain.model.market import ExposureReport

@dataclass
class IntelligenceScores:
    bullish_score: float
    bearish_score: float
    volatility_score: float
    dealer_support_score: float
    gamma_strength: float
    trend_strength: float
    risk_score: float
    explanations: dict[str, str]

class ScoreEngine:
    @staticmethod
    def calculate_scores(
        report: ExposureReport,
        vix_current: float,
        vix_percentile: float,
        vix_rank: float,
        net_gex: float,
        net_dex: float
    ) -> IntelligenceScores:
        spot = report.spot_price
        zg = report.zero_gamma
        max_pain = report.max_pain
        pc_oi = report.put_call_oi_ratio
        pc_vol = report.put_call_volume_ratio
        
        explanations = {}
        
        # Auxiliares de límites
        def clip(val, lo, hi):
            return max(lo, min(hi, val))
            
        # 1. BULLISH SCORE
        # - Spot > Zero Gamma (20%)
        # - Spot > Max Pain (15%)
        # - PCR OI bajo (15%) -> PCR de 0.4 es ideal (100%), PCR >= 1.8 es bajista (0%)
        # - PCR Vol bajo (15%) -> PCR de 0.4 es ideal (100%), PCR >= 1.8 es bajista (0%)
        # - DEX neto positivo (20%)
        # - Cercanía al Call Wall vs Put Wall (15%)
        b1 = 1.0 if (zg is not None and spot > zg) else 0.5
        b2 = 1.0 if (max_pain is not None and spot > max_pain) else 0.0
        
        # PCR OI de 0.4 a 1.8
        pcr_oi_factor = 1.0 - ((clip(pc_oi, 0.4, 1.8) - 0.4) / 1.4)
        pcr_vol_factor = 1.0 - ((clip(pc_vol, 0.4, 1.8) - 0.4) / 1.4)
        
        # DEX neto (normalizado contra el volumen total)
        total_dex_abs = sum(abs(s.delta_exposure) for s in report.strikes) or 1.0
        dex_factor = (net_dex / total_dex_abs + 1.0) / 2.0  # escala de 0 a 1
        
        # Paredes
        call_wall = report.call_wall or spot * 1.05
        put_wall = report.put_wall or spot * 0.95
        dist_to_call = abs(call_wall - spot)
        dist_to_put = abs(put_wall - spot)
        total_wall_dist = dist_to_call + dist_to_put or 1.0
        wall_factor = dist_to_put / total_wall_dist  # 1.0 si está en el Call Wall, 0.0 si está en el Put Wall
        
        bullish = (b1 * 0.20 + b2 * 0.15 + pcr_oi_factor * 0.15 + pcr_vol_factor * 0.15 + dex_factor * 0.20 + wall_factor * 0.15) * 100
        bullish = round(clip(bullish, 0.0, 100.0), 1)
        
        explanations["bullish_score"] = (
            f"Calculado combinando: Spot sobre Zero Gamma ({b1*100:.0f}%), "
            f"Spot sobre Max Pain ({b2*100:.0f}%), Put/Call OI Ratio del {pc_oi:.2f} ({pcr_oi_factor*100:.0f}% bullish), "
            f"Put/Call Vol Ratio del {pc_vol:.2f} ({pcr_vol_factor*100:.0f}% bullish), "
            f"Delta neto sesgado a favor de Calls ({dex_factor*100:.0f}%) y proximidad relativa al Call Wall ({wall_factor*100:.0f}%)."
        )

        # 2. BEARISH SCORE
        # Inverso del bullish score pero calibrado para penalizaciones directas:
        # - Spot < Zero Gamma (20%)
        # - Spot < Max Pain (15%)
        # - PCR OI alto (15%)
        # - PCR Vol alto (15%)
        # - DEX neto negativo (20%)
        # - Cercanía al Put Wall (15%)
        be1 = 1.0 if (zg is not None and spot < zg) else 0.5
        be2 = 1.0 if (max_pain is not None and spot < max_pain) else 0.0
        be_pcr_oi = (clip(pc_oi, 0.4, 1.8) - 0.4) / 1.4
        be_pcr_vol = (clip(pc_vol, 0.4, 1.8) - 0.4) / 1.4
        be_dex = 1.0 - dex_factor
        be_wall = 1.0 - wall_factor
        
        bearish = (be1 * 0.20 + be2 * 0.15 + be_pcr_oi * 0.15 + be_pcr_vol * 0.15 + be_dex * 0.20 + be_wall * 0.15) * 100
        bearish = round(clip(bearish, 0.0, 100.0), 1)
        
        explanations["bearish_score"] = (
            f"Calculado combinando: Spot bajo Zero Gamma ({be1*100:.0f}%), "
            f"Spot bajo Max Pain ({be2*100:.0f}%), Put/Call OI alto ({be_pcr_oi*100:.0f}%), "
            f"Put/Call Vol alto ({be_pcr_vol*100:.0f}%), Delta neto negativo ({be_dex*100:.0f}%) "
            f"y proximidad al Put Wall ({be_wall*100:.0f}%)."
        )

        # 3. VOLATILITY SCORE
        # - VIX actual escalado 10-30 (40%)
        # - Percentil del VIX (30%)
        # - VIX Rank (20%)
        # - Cercanía a Zero Gamma (donde el flip desestabiliza) (10%)
        vix_scaled = (clip(vix_current, 10.0, 30.0) - 10.0) / 20.0
        
        zg_dist_factor = 0.0
        if zg:
            # Si estamos a menos de 0.5% del Zero Gamma, sumamos 100% de este factor. Si estamos a más del 3%, 0%.
            pct_dist = abs(spot - zg) / spot
            zg_dist_factor = 1.0 - (clip(pct_dist, 0.005, 0.03) - 0.005) / 0.025
            
        volatility = (vix_scaled * 0.40 + (vix_percentile / 100.0) * 0.30 + (vix_rank / 100.0) * 0.20 + zg_dist_factor * 0.10) * 100
        volatility = round(clip(volatility, 0.0, 100.0), 1)
        
        explanations["volatility_score"] = (
            f"Calculado combinando: Valor actual del VIX en {vix_current:.2f} ({vix_scaled*100:.0f}% de la escala normalizada), "
            f"Percentil del VIX ({vix_percentile:.1f}%), IV Rank ({vix_rank:.1f}%) "
            f"y proximidad al nivel de Gamma Flip (factor de fricción: {zg_dist_factor*100:.0f}%)."
        )

        # 4. DEALER SUPPORT SCORE
        # Si Net GEX es negativo, el soporte es cero. Si es positivo, medimos su fuerza
        # comparándolo con la suma absoluta de GEX.
        total_gex_abs = sum(abs(s.gamma_exposure) for s in report.strikes) or 1.0
        gex_ratio = net_gex / total_gex_abs
        
        # Adicionalmente, si el spot está sobre el Zero Gamma y lejos del Put Wall, los dealers proveen buen soporte
        support = 0.0
        if net_gex > 0:
            support = gex_ratio * 100.0
            # Si el VIX es bajo, el soporte se percibe más estable
            vix_cushion = 1.0 - (clip(vix_current, 12.0, 25.0) - 12.0) / 13.0
            support = support * 0.7 + vix_cushion * 30.0
            
        support = round(clip(support, 0.0, 100.0), 1)
        
        explanations["dealer_support_score"] = (
            f"Calculado mediante el ratio de Gamma Positiva Neta del {gex_ratio*100:.1f}% contra la Gamma Total, "
            f"amortiguado por la estabilidad del VIX ({vix_current:.2f}). Valores altos indican que las coberturas "
            f"de los Dealers actuarán como un fuerte colchón de soporte comprador en las caídas."
        )

        # 5. GAMMA STRENGTH
        # Proporción unidireccional de Gamma. Si Net GEX = Sum(abs(GEX)), entonces Gamma Strength = 100 (toda la gamma va en un sentido).
        # Si Net GEX = 0 por cancelación, es 0.
        gamma_strength = (abs(net_gex) / total_gex_abs) * 100
        gamma_strength = round(clip(gamma_strength, 0.0, 100.0), 1)
        
        explanations["gamma_strength"] = (
            f"Representa el grado de alineación unidireccional de la Gamma de opciones ({gamma_strength:.1f}%). "
            f"Un valor alto indica que el posicionamiento de Gamma está altamente concentrado de un solo lado (Calls o Puts), "
            f"lo que reduce la ambigüedad en los flujos de cobertura de los creadores de mercado."
        )

        # 6. TREND STRENGTH
        # Proporción unidireccional de Delta y baja volatilidad.
        trend_strength = (abs(net_dex) / total_dex_abs) * 100
        # Ajustamos a la baja si la volatilidad es muy alta (tendencias inestables)
        vix_penalty = 1.0 - (clip(vix_current, 15.0, 30.0) - 15.0) / 15.0
        trend_strength = trend_strength * vix_penalty
        trend_strength = round(clip(trend_strength, 0.0, 100.0), 1)
        
        explanations["trend_strength"] = (
            f"Indica la persistencia direccional de las coberturas de Delta ({trend_strength:.1f}%), "
            f"ajustada por penalización de volatilidad del VIX. Valores altos sugieren un entorno despejado "
            f"para el desarrollo de movimientos continuos de mediano plazo sin reversiones abruptas."
        )

        # 7. RISK SCORE
        # - Negative Gamma (30%)
        # - VIX Percentile (30%)
        # - Cercanía al Put Wall (20%)
        # - Cercanía al Zero Gamma (20%)
        r1 = 1.0 if (zg is not None and spot < zg) else 0.0
        r2 = vix_percentile / 100.0
        
        # Proximidad al Put Wall (si estamos encima o por debajo del Put Wall, riesgo máximo)
        put_wall_dist_pct = abs(spot - put_wall) / spot
        r3 = 1.0 - clip(put_wall_dist_pct / 0.03, 0.0, 1.0)  # 1.0 si está a 0% de distancia, 0.0 si está a >=3%
        
        # Proximidad a Zero Gamma
        r4 = zg_dist_factor
        
        risk = (r1 * 0.30 + r2 * 0.30 + r3 * 0.20 + r4 * 0.20) * 100
        risk = round(clip(risk, 0.0, 100.0), 1)
        
        explanations["risk_score"] = (
            f"Puntuación agregada de riesgo del sistema ({risk:.1f}%). Compuesta por: "
            f"Cotización en régimen de Gamma Negativa ({r1*100:.0f}%), percentil de estrés del VIX ({vix_percentile:.1f}%), "
            f"proximidad al Put Wall ({r3*100:.0f}%) y cercanía al nivel de Gamma Flip Zero Gamma ({r4*100:.0f}%)."
        )
        
        return IntelligenceScores(
            bullish_score=bullish,
            bearish_score=bearish,
            volatility_score=volatility,
            dealer_support_score=support,
            gamma_strength=gamma_strength,
            trend_strength=trend_strength,
            risk_score=risk,
            explanations=explanations
        )
