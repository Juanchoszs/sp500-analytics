from dataclasses import dataclass
from typing import Any

@dataclass
class ConfidenceDetails:
    level: str  # "Alta" | "Media" | "Baja"
    consistency_score: float  # 0.0 a 1.0
    factors: list[str]
    conflicting_factors: list[str]

class ConfidenceEngine:
    @staticmethod
    def calculate_confidence(
        spot: float,
        zg: float | None,
        net_gex: float,
        net_dex: float,
        pc_oi: float,
        pc_vol: float,
        vix: float,
        bullish_score: float,
        bearish_score: float
    ) -> ConfidenceDetails:
        factors = []
        conflicting = []
        
        # 1. Congruencia Direccional de Scores
        # Si un score domina fuertemente al otro, hay alta convicción direccional
        score_diff = abs(bullish_score - bearish_score)
        if score_diff >= 30:
            factors.append("Fuerte divergencia direccional entre sesgo alcista y bajista (consenso direccional claro)")
        else:
            conflicting.append("Scores de mercado (Bullish/Bearish) equilibrados, sugiriendo indecisión estructural")
            
        # 2. Congruencia Gamma y Posición de Spot
        is_above_zg = zg is not None and spot > zg
        is_gex_positive = net_gex > 0
        
        if is_above_zg == is_gex_positive:
            factors.append("Consistencia entre la posición del precio sobre Zero Gamma y el signo de GEX Neto")
        else:
            conflicting.append("Inconsistencia: El precio cotiza de un lado del Zero Gamma, pero el GEX Neto agregado muestra el signo contrario")
            
        # 3. Alineación Delta y Gamma
        # Positivo / Positivo o Negativo / Negativo
        if (net_gex >= 0 and net_dex >= 0) or (net_gex < 0 and net_dex < 0):
            factors.append("Alineación de flujo: Cobertura de Gamma y Delta apuntan en la misma dirección microestructural")
        else:
            conflicting.append("Fricción de flujo: Exposición neta de Gamma y Delta en direcciones opuestas (ej. dealers cortos de delta pero largos de gamma)")
            
        # 4. Comportamiento del VIX y el régimen de Gamma
        # En Gamma Positiva, el VIX debería estar bajo y decayendo.
        # En Gamma Negativa, el VIX suele repuntar.
        if net_gex >= 0 and vix < 18.0:
            factors.append("Entorno de baja volatilidad (VIX < 18) compatible con el régimen de Long Gamma amortiguador")
        elif net_gex < 0 and vix > 18.0:
            factors.append("Volatilidad elevada (VIX > 18) compatible con el régimen de Short Gamma desestabilizador")
        else:
            conflicting.append(f"Discrepancia de volatilidad: VIX en {vix:.1f} no se corresponde con el régimen de {'Long' if net_gex >= 0 else 'Short'} Gamma")
            
        # 5. Alineación de Ratios Put/Call de OI y Volumen
        # Ambos arriba de 1.0 (bajista) o ambos abajo de 0.85 (alcista)
        if (pc_oi >= 1.0 and pc_vol >= 1.0) or (pc_oi <= 0.85 and pc_vol <= 0.85):
            factors.append("Convergencia entre el volumen intradía y el Open Interest acumulado en los ratios Put/Call")
        else:
            conflicting.append("Divergencia operativa: El volumen intradía muestra un sesgo de opciones distinto al Open Interest histórico")

        # 6. Proximidad a la zona de Flip
        if zg is not None:
            zg_dist = abs(spot - zg) / spot
            if zg_dist <= 0.0075:
                conflicting.append("El precio spot está extremadamente cerca de Zero Gamma (Flip Zone), aumentando la inestabilidad de las lecturas")
            else:
                factors.append("Precio spot cotiza con un margen de seguridad cómodo respecto al nivel de Gamma Flip")

        # Calcular score de consistencia
        total_checks = len(factors) + len(conflicting)
        score = len(factors) / total_checks if total_checks > 0 else 0.5
        
        if score >= 0.70:
            level = "Alta"
        elif score >= 0.40:
            level = "Media"
        else:
            level = "Baja"
            
        return ConfidenceDetails(
            level=level,
            consistency_score=round(score * 100, 1),
            factors=factors,
            conflicting_factors=conflicting
        )
