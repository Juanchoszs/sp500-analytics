from dataclasses import dataclass
from app.domain.model.market import ExposureReport

@dataclass
class DeltaAnalysis:
    net_delta_exposure: float
    call_dex_wall: float | None
    put_dex_wall: float | None
    regime_type: str  # "call_dominated" | "put_dominated" | "neutral"
    description: str
    hedging_pressure: str

class DeltaAnalyzer:
    @staticmethod
    def analyze(report: ExposureReport) -> DeltaAnalysis:
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
            # Dealer Net DEX es negativo -> Dealers están cortos de delta (cubriendo calls de clientes)
            regime = "call_dominated"
            desc = "Estructura de Delta dominada por Calls. El sesgo de delta neto del dealer es negativo (corto delta)."
            pressure = "Los Creadores de Mercado (Dealers) están posicionados cortos en delta por la venta neta de calls al público. Conforme el subyacente sube, la cobertura delta obliga a los dealers a comprar más subyacente, generando un flujo compradora de apoyo."
        elif net_dex > threshold:
            # Dealer Net DEX es positivo -> Dealers están largos de delta (cubriendo puts de clientes)
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
