import math
from dataclasses import dataclass
from datetime import date
from typing import Any
from app.providers.base import OptionsChain
from app.domain.model.market import ExposureReport

@dataclass
class VolatilityAnalysis:
    vix_current: float
    vix_rank: float          # 0 a 100
    vix_percentile: float    # 0 a 100
    atm_iv: float
    expected_move_iv: float
    expected_move_straddle: float
    expected_move_used: float  # el seleccionado para los límites
    lower_bound: float
    upper_bound: float
    regime_type: str  # "high_volatility" | "low_volatility" | "neutral"
    description: str
    historical_vix_min: float
    historical_vix_max: float

class VolatilityAnalyzer:
    @staticmethod
    def analyze(chain: OptionsChain, report: ExposureReport, vix_data: dict[str, Any], T: float) -> VolatilityAnalysis:
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
        # Buscamos el strike más cercano al spot
        closest_call = min(chain.calls, key=lambda c: abs(c.strike - spot)) if chain.calls else None
        closest_put = min(chain.puts, key=lambda p: abs(p.strike - spot)) if chain.puts else None
        
        atm_iv = 0.15
        if closest_call:
            atm_iv = closest_call.implied_volatility
            
        # 1. Expected Move basado en IV
        # Si T es muy pequeño (0DTE), asumimos al menos 1 día para no colapsar la fórmula
        T_adjusted = max(T, 1.0 / 365.0)
        em_iv = spot * atm_iv * math.sqrt(T_adjusted)
        
        # 2. Expected Move basado en Straddle ATM (heuresis de opciones)
        em_straddle = em_iv
        if closest_call and closest_put:
            c_mid = (closest_call.bid + closest_call.ask) / 2.0
            p_mid = (closest_put.bid + closest_put.ask) / 2.0
            # Si los midpoints no son válidos, usamos los last prices
            if c_mid <= 0:
                c_mid = closest_call.last_price
            if p_mid <= 0:
                p_mid = closest_put.last_price
            
            straddle_price = c_mid + p_mid
            if straddle_price > 0:
                em_straddle = straddle_price * 0.85
                
        # Usamos el esperado por Straddle si es viable y la expiración es corta (<= 7 días)
        # ya que es más reactivo a la microestructura del mercado de opciones a corto plazo.
        # De lo contrario usamos el de la fórmula de IV estándar.
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
