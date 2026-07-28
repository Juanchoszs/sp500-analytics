from dataclasses import dataclass
from typing import Any
from app.analytics.gamma_analyzer import GammaAnalysis
from app.analytics.delta_analyzer import DeltaAnalysis
from app.analytics.options_analyzer import OptionsAnalysis
from app.analytics.volatility_analyzer import VolatilityAnalysis
from app.analytics.dealer_analyzer import DealerAnalysis

@dataclass
class RegimeDetails:
    name: str
    active: bool
    description: str
    characteristics: list[str]
    risks: list[str]
    expected_behavior: str
    confidence: str  # "Alta" | "Media" | "Baja"

class RuleEngine:
    @staticmethod
    def evaluate_regimes(
        spot: float,
        T: float,
        gamma: GammaAnalysis,
        delta: DeltaAnalysis,
        options: OptionsAnalysis,
        vol: VolatilityAnalysis,
        dealer: DealerAnalysis,
        max_pain: float | None = None,
        call_wall: float | None = None,
        put_wall: float | None = None
    ) -> list[RegimeDetails]:
        regimes = []
        
        # 1. Positive Gamma
        active_pos_gamma = gamma.regime_type == "positive"
        regimes.append(RegimeDetails(
            name="Positive Gamma",
            active=active_pos_gamma,
            description="El mercado se encuentra en zona de Gamma neta positiva, donde las opciones Call acumuladas dominan o compensan los niveles de Put.",
            characteristics=["Volatilidad comprimida.", "Velocidad de movimiento de precio moderada.", "Soportes y resistencias estables."],
            risks=["Decaimiento temporal acelerado.", "Consolidación prolongada y falta de tendencia definida."],
            expected_behavior="Reversión a la media e intradías pausados. El precio tiende a gravitar hacia los núcleos de liquidez (Call Wall / Max Pain).",
            confidence="Alta" if (active_pos_gamma and vol.vix_current < 18.0) else "Media"
        ))
        
        # 2. Negative Gamma
        active_neg_gamma = gamma.regime_type == "negative"
        regimes.append(RegimeDetails(
            name="Negative Gamma",
            active=active_neg_gamma,
            description="El mercado cotiza en territorio de Gamma neta negativa, usualmente por debajo del nivel de Gamma Flip (Zero Gamma).",
            characteristics=["Volatilidad intradía ensanchada.", "Aceleración de caídas.", "Rebalanceos de cobertura agresivos."],
            risks=["Brechas rápidas del precio en apertura o cierres (gaps).", "Mayor riesgo de colapso si se rompen niveles como el Put Wall."],
            expected_behavior="Desplazamientos rápidos del precio en ambas direcciones. Aumento de la volatilidad realizada intradía.",
            confidence="Alta" if (active_neg_gamma and vol.vix_current > 18.0) else "Media"
        ))

        # 3. Call Dominated
        active_call_dom = delta.regime_type == "call_dominated" or options.regime_type == "call_dominated"
        regimes.append(RegimeDetails(
            name="Call Dominated",
            active=active_call_dom,
            description="Estructura de contratos marcadamente sesgada hacia la compra de opciones de compra (Calls).",
            characteristics=["Put/Call ratio bajo.", "Fuerza compradora en deltas netos.", "Dealers con exposición corta de delta."],
            risks=["Riesgo de 'unwinding' (cierre rápido de llamadas) si el precio se estanca.", "Sobrecarga de primas."],
            expected_behavior="Soporte alcista dinámico (squeeze) siempre y cuando el precio se mantenga por encima de las zonas de soporte clave.",
            confidence="Alta" if (active_call_dom and delta.net_delta_exposure > 0) else "Media"
        ))

        # 4. Put Dominated
        active_put_dom = delta.regime_type == "put_dominated" or options.regime_type == "put_dominated"
        regimes.append(RegimeDetails(
            name="Put Dominated",
            active=active_put_dom,
            description="La cadena de opciones presenta una densa acumulación de contratos de venta (Puts).",
            characteristics=["Put/Call ratio elevado.", "Sensibilidad a la baja del delta neto.", "Dealers con cobertura delta larga."],
            risks=["Presión de venta constante por rebalanceo.", "Facilidad de pánico ante noticias macro bajistas."],
            expected_behavior="Presión de venta persistente si el precio cae por debajo del spot de inicio de sesión.",
            confidence="Alta" if (active_put_dom and delta.net_delta_exposure < 0) else "Media"
        ))

        # 5. Dealer Long Gamma
        active_dl_gamma = dealer.dealer_gamma_regime == "long_gamma"
        regimes.append(RegimeDetails(
            name="Dealer Long Gamma",
            active=active_dl_gamma,
            description="Los creadores de mercado se benefician de la estabilidad del precio al tener gamma neta a favor.",
            characteristics=["Flujo de cobertura estabilizador.", "Venden al alza, compran a la baja.", "Comportamiento amortiguador."],
            risks=["Ausencia de movimientos tendenciales limpios.", "Margen de ganancia acotado para compradores de opciones."],
            expected_behavior="La volatilidad implícita tiende a decaer. Los rangos operativos diarios se achican y respetan soportes técnicos.",
            confidence="Alta" if active_dl_gamma else "Media"
        ))

        # 6. Dealer Short Gamma
        active_ds_gamma = dealer.dealer_gamma_regime == "short_gamma"
        regimes.append(RegimeDetails(
            name="Dealer Short Gamma",
            active=active_ds_gamma,
            description="Los creadores de mercado están expuestos a pérdidas exponenciales en movimientos rápidos del SPY.",
            characteristics=["Flujo de cobertura amplificador (pro-cíclico).", "Venden a la baja, compran al alza.", "Pánico de cobertura."],
            risks=["Movimientos intempestivos.", "Deslizamiento (slippage) alto en coberturas intradía."],
            expected_behavior="Aceleración de cualquier ruptura o tendencia. Un mercado veloz con velas de rango amplio.",
            confidence="Alta" if active_ds_gamma else "Media"
        ))

        # 7. Trend Friendly
        # Se activa si estamos en Short Gamma (movimiento veloz) o en un Call Dominated con Gamma flip lejano
        active_trend = (dealer.dealer_gamma_regime == "short_gamma") or (delta.regime_type == "call_dominated" and not gamma.is_gamma_flip_close)
        regimes.append(RegimeDetails(
            name="Trend Friendly",
            active=active_trend,
            description="Estructura propicia para el desarrollo de tendencias intradiarias sostenidas sin reversiones a la media inmediatas.",
            characteristics=["Menor fricción en los extremos.", "Flujo unidireccional persistente."],
            risks=["Rápida pérdida si se opera contra-tendencia.", "Volatilidad que puede sacudir paradas de pérdidas (stop losses)."],
            expected_behavior="Expansión del rango diario. Los retrocesos son cortos y rápidamente absorbidos en favor de la tendencia.",
            confidence="Media" if active_trend else "Baja"
        ))

        # 8. Mean Reversion
        active_mean_rev = dealer.dealer_gamma_regime == "long_gamma" and vol.vix_current < 16.0
        regimes.append(RegimeDetails(
            name="Mean Reversion",
            active=active_mean_rev,
            description="Las fuerzas del mercado favorecen la oscilación del precio dentro de un canal definido y la vuelta al promedio.",
            characteristics=["El precio respeta las colas de distribución.", "Baja volatilidad intradía."],
            risks=["Quedarse atrapado esperando rupturas falsas.", "Erosión sistemática de primas."],
            expected_behavior="Rechazos limpios de las bandas externas (walls) y retorno hacia el centro de gravedad (Max Pain / ATM).",
            confidence="Alta" if active_mean_rev else "Media"
        ))

        # 9. High Volatility
        active_high_vol = vol.regime_type == "high_volatility"
        regimes.append(RegimeDetails(
            name="High Volatility",
            active=active_high_vol,
            description="Las expectativas de volatilidad futura se encuentran infladas.",
            characteristics=["VIX elevado.", "Expected Move expandido.", "Riesgo macro percibido."],
            risks=["Movimientos rápidos difíciles de gestionar.", "Aumento de márgenes de garantía por el bróker."],
            expected_behavior="Oscilaciones amplias, brechas de apertura significativas y primas de opciones caras.",
            confidence="Alta" if active_high_vol else "Media"
        ))

        # 10. Low Volatility
        active_low_vol = vol.regime_type == "low_volatility"
        regimes.append(RegimeDetails(
            name="Low Volatility",
            active=active_low_vol,
            description="Entorno de mercado calmado y complaciente con bajas expectativas de riesgo inminente.",
            characteristics=["VIX bajo.", "Expected Move acotado.", "Desplazamiento lento y ordenado."],
            risks=["Falsa sensación de seguridad (riesgo de cisne negro silencioso).", "Primas baratas pero con decaimiento theta lento."],
            expected_behavior="Movimiento lateral-alcista lento (grind up), ideal para estrategias de venta de volatilidad o compra de opciones direccionales baratas.",
            confidence="Alta" if active_low_vol else "Media"
        ))

        # 11. Pinning Risk
        # Alta concentración cerca del spot + expiración cercana (T <= 2 días) + Long Gamma
        is_near_max_pain = abs(spot - (max_pain or spot)) / spot <= 0.0075
        active_pinning = (dealer.dealer_gamma_regime == "long_gamma") and (T * 365.0 <= 2.0) and is_near_max_pain
        regimes.append(RegimeDetails(
            name="Pinning Risk",
            active=active_pinning,
            description="Riesgo de que el precio sea 'magnetizado' y expire exactamente en el strike de mayor dolor (Max Pain) o Call/Put Wall.",
            characteristics=["Agotamiento de la liquidez direccional.", "Oscilación mínima en las últimas horas del vencimiento.", "Dealers neutrales inmovilizando el precio."],
            risks=["Pérdida rápida de prima en la última sesión para compradores de opciones direccionales de expiración corta."],
            expected_behavior="El precio del SPY converge gradualmente y se estanca en el nivel de concentración de volumen en la sesión de vencimiento.",
            confidence="Alta" if (active_pinning and T * 365.0 <= 1.0) else "Media"
        ))

        # 12. Breakout Risk
        # Spot cerca de un wall + Short Gamma
        near_wall = False
        if call_wall and abs(spot - call_wall) / spot <= 0.01:
            near_wall = True
        if put_wall and abs(spot - put_wall) / spot <= 0.01:
            near_wall = True
            
        active_breakout = (dealer.dealer_gamma_regime == "short_gamma") and near_wall
        regimes.append(RegimeDetails(
            name="Breakout Risk",
            active=active_breakout,
            description="Estructura propensa a rupturas violentas de niveles clave de soporte o resistencia.",
            characteristics=["Precio al borde de muros de volumen.", "Presión de cobertura a punto de desatar flujos forzados."],
            risks=["Brechas de precio instantáneas.", "Pérdida rápida si se está posicionado en contra del flujo vendedor/comprador de rebalanceo."],
            expected_behavior="Si el precio vulnera el nivel crítico (ej. Call Wall), se activará una cascada de compras/ventas de los dealers que disparará el precio en la dirección de la ruptura.",
            confidence="Alta" if active_breakout else "Media"
        ))
        
        return regimes
