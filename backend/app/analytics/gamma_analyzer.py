from dataclasses import dataclass
from app.domain.model.market import ExposureReport

@dataclass
class GammaAnalysis:
    net_gamma_exposure: float
    call_wall: float | None
    put_wall: float | None
    gamma_wall: float | None
    zero_gamma: float | None
    gamma_flip_distance_pct: float | None
    is_gamma_flip_close: bool
    regime_type: str  # "positive" | "negative" | "neutral"
    description: str
    risks: list[str]
    expected_behavior: str

class GammaAnalyzer:
    @staticmethod
    def analyze(report: ExposureReport) -> GammaAnalysis:
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
