from dataclasses import dataclass
from typing import Any
from app.analytics.gamma_analyzer import GammaAnalysis
from app.analytics.delta_analyzer import DeltaAnalysis
from app.analytics.volatility_analyzer import VolatilityAnalysis
from app.analytics.confidence_engine import ConfidenceDetails

@dataclass
class Scenario:
    name: str
    confidence: str
    probability_pct: float
    narrative: str
    supporting_factors: list[str]
    invalidation_conditions: list[str]
    probability_boosters: list[str]
    probability_decliners: list[str]

@dataclass
class ScenarioCollection:
    principal: Scenario
    alternative: Scenario
    risk: Scenario

class ScenarioEngine:
    @staticmethod
    def generate_scenarios(
        spot: float,
        gamma: GammaAnalysis,
        delta: DeltaAnalysis,
        vol: VolatilityAnalysis,
        confidence: ConfidenceDetails,
        bullish_score: float,
        bearish_score: float
    ) -> ScenarioCollection:
        
        # Determinar el tipo de régimen general
        is_positive_gamma = gamma.regime_type == "positive"
        is_bullish = bullish_score > bearish_score
        
        # 1. ESCENARIO PRINCIPAL
        if is_positive_gamma:
            if is_bullish:
                # Escenario Positivo-Alcista
                sc_name = "Consolidación Alcista Ordenada (Grind-up)"
                sc_prob = 65.0
                sc_narrative = (
                    "Los datos favorecen un escenario de movimiento pausado y ascendente. Al estar en territorio "
                    "de Gamma Positiva, las coberturas estabilizadoras de los Dealers actuarán como amortiguadores "
                    "en los retrocesos, permitiendo al precio desplazarse lentamente hacia el Call Wall. Los retrocesos "
                    "serán de corta duración y propensos a ser absorbidos rápidamente."
                )
                sc_factors = [
                    "Spot cotiza por encima del nivel de Gamma Flip (Zero Gamma).",
                    "Net GEX positivo que obliga a los dealers a comprar caídas.",
                    "Bajo nivel de estrés medido por el VIX."
                ]
                sc_invalid = [
                    "Pérdida y cierre intradía por debajo del Zero Gamma.",
                    "Pico repentino en el VIX superando los 18 puntos.",
                    "Aumento masivo de volumen transaccionado en opciones Put ATM."
                ]
                sc_boosters = [
                    "Flujo continuo de compra de calls de strikes superiores (roll up).",
                    "Apertura del SPY con brechas al alza sobre niveles locales de resistencia."
                ]
                sc_decliners = [
                    "Estancamiento del volumen transaccional.",
                    "Desviación del spot por debajo del nivel de Max Pain."
                ]
            else:
                # Escenario Positivo-Neutral/Bajista
                sc_name = "Magnetización hacia Max Pain"
                sc_prob = 60.0
                sc_narrative = (
                    "La estructura observada sugiere un mercado lateralizado y magnético. Con Gamma Positiva neta, "
                    "el precio tiene dificultades para desarrollar tendencias limpias. Se prevé que el SPY gravite "
                    "hacia la zona de Max Pain, donde la fricción de coberturas inmovilizará el precio."
                )
                sc_factors = [
                    "Net GEX positivo y concentrado cerca del spot.",
                    "Equilibrio relativo entre el Bullish y Bearish score.",
                    "Cercanía del precio actual a la zona de Max Pain."
                ]
                sc_invalid = [
                    "Ruptura violenta del rango estrecho por un catalizador externo.",
                    "Desplazamiento del spot a una distancia superior al Expected Move."
                ]
                sc_boosters = [
                    "Aproximación al día de vencimiento de las opciones (efecto pin de expiración).",
                    "Reducción persistente del volumen de mercado."
                ]
                sc_decliners = [
                    "Aumento de la volatilidad implícita en la curva skew.",
                    "Ventas institucionales detectadas en bloques."
                ]
        else:
            # Negative Gamma
            if bearish_score > 55.0:
                # Escenario Negativo-Bajista
                sc_name = "Presión Bajista y Expansión de Volatilidad"
                sc_prob = 60.0
                sc_narrative = (
                    "El escenario con mayor respaldo es de volatilidad expansiva con sesgo a la baja. Al cotizar "
                    "en territorio de Gamma Negativa, los Dealers se verán obligados a vender a medida que el precio caiga, "
                    "lo que acelera la tendencia. Si el SPY perfora soportes técnicos locales, el movimiento bajista "
                    "puede ganar velocidad rápidamente hacia el Put Wall."
                )
                sc_factors = [
                    "Precio por debajo de Zero Gamma (régimen de cobertura pro-cíclico).",
                    "Net DEX negativo indicando dominancia de Puts.",
                    "El VIX cotiza al alza o en percentiles altos."
                ]
                sc_invalid = [
                    "Recuperación limpia y cierre sostenido sobre el Zero Gamma.",
                    "Relajamiento rápido del VIX bajo el percentil 40."
                ]
                sc_boosters = [
                    "Perforación intradía del Put Wall.",
                    "Pánico comprador de coberturas Put de último minuto."
                ]
                sc_decliners = [
                    "Absorción institucional mediante compras en bloques en zonas de soporte histórico.",
                    "Ventas de pánico exhaustivas de opciones Put (Put short covering)."
                ]
            else:
                # Escenario Negativo-Volátil de Rango
                sc_name = "Oscilaciones de Rango Amplio (Volatilidad de Doble Vía)"
                sc_prob = 55.0
                sc_narrative = (
                    "La estructura sugiere un escenario de alta volatilidad bidireccional. La Gamma Negativa neta "
                    "indica que los movimientos alcistas y bajistas serán amplificados por coberturas dinámicas, "
                    "pero la falta de una tendencia delta única favorece oscilaciones erráticas dentro de los límites "
                    "del Expected Move."
                )
                sc_factors = [
                    "Net GEX negativo pero balance de DEX moderadamente neutral.",
                    "Cotización en la frontera del nivel de Gamma Flip.",
                    "VIX en niveles de alerta (17-21)."
                ]
                sc_invalid = [
                    "El spot se establece firmemente lejos del nivel de Zero Gamma.",
                    "Compresión drástica del VIX."
                ]
                sc_boosters = [
                    "Aumento del volumen intradiario en ambos extremos de la cadena.",
                    "Aperturas con gaps significativos en el SPY."
                ]
                sc_decliners = [
                    "El precio se ancla cerca de un nivel de alta liquidez estática."
                ]

        # 2. ESCENARIO ALTERNATIVO
        if is_positive_gamma:
            alt_name = "Falsa Ruptura y Reversión Rápida"
            alt_prob = 25.0
            alt_narrative = (
                "Un intento de breakout del Call Wall o Put Wall es rápidamente rechazado. Las coberturas "
                "de los Dealers forzarán la reversión hacia el centro del rango, frustrando a los operadores de breakout."
            )
            alt_factors = [
                "Dealers muy largos en Gamma en los strikes exteriores.",
                "Falta de volumen real para sostener el movimiento tras el testeo inicial."
            ]
            alt_invalid = [
                "Aumento de volumen masivo que absorba completamente la gamma de los Dealers y la empuje más allá."
            ]
        else:
            alt_name = "Short Squeeze Violento por Re-cobertura"
            alt_prob = 30.0
            alt_narrative = (
                "Si el spot rebota y supera levemente un nivel de fricción, los Dealers, que están cortos de delta "
                "en calls o necesitan deshacer coberturas cortas de puts, se verán obligados a comprar masivamente "
                "el subyacente, desatando un alza rápida y agresiva (squeeze)."
            )
            alt_factors = [
                "Dealers muy cortos en calls ATM o ligeramente OTM.",
                "Rebote rápido en el Put Wall acompañado de relajamiento del VIX."
            ]
            alt_invalid = [
                "Pérdida de soportes clave y reanudación de la presión bajista."
            ]

        # 3. ESCENARIO DE RIESGO
        if is_positive_gamma:
            risk_name = "Cruce del Gamma Flip y Desplome Acelerado"
            risk_prob = 10.0 if is_bullish else 15.0
            risk_narrative = (
                "El precio sufre una caída repentina debido a un shock macro, cruzando a la baja el nivel de Zero Gamma. "
                "Esto transforma instantáneamente el régimen del mercado de Positive Gamma (estabilizador) a Negative Gamma "
                "(amplificador), provocando que las coberturas de los dealers se vuelvan vendedoras y aceleren la caída."
            )
            risk_factors = [
                "El spot cotiza a menos del 1.5% del Zero Gamma.",
                "Acumulación silenciosa de coberturas Put fuera del dinero (OTM)."
            ]
            risk_invalid = [
                "El Zero Gamma se desplaza significativamente a la baja alejándose del spot.",
                "Fuerte soporte institucional y compras en bloque protegiendo la zona límite."
            ]
        else:
            risk_name = "Cascada de Cobertura Bajista (Gamma Collapse)"
            risk_prob = 15.0 if is_bullish else 25.0
            risk_narrative = (
                "El spot penetra decisivamente el Put Wall en régimen de Gamma Negativa. Los Dealers entran en un "
                "espiral de rebalanceo de deltas cortos de puts vendidos al público, vendiendo de forma automática "
                "el subyacente SPY en grandes cantidades. Esto genera una cascada bajista con pánico en la curva de volatilidad."
            )
            risk_factors = [
                "Cotización por debajo del Put Wall.",
                "VIX perforando al alza niveles de resistencia históricos de corto plazo.",
                "Volumen concentrado en puts OTM en rápida valorización."
            ]
            risk_invalid = [
                "Recuperación inmediata e intradía sobre el nivel del Put Wall."
            ]

        # Definir los boosters/decliners por defecto para alternativos/riesgo para evitar listas vacías
        alt_boosters = ["Incremento de volumen a favor de la reversión."]
        alt_decliners = ["Persistencia direccional del flujo."]
        risk_boosters = ["Noticias macroeconómicas de alto impacto negativo.", "Apertura con gap bajista."]
        risk_decliners = ["Intervención institucional de soporte.", "Estabilización del VIX."]

        return ScenarioCollection(
            principal=Scenario(
                name=sc_name,
                confidence=confidence.level,
                probability_pct=sc_prob,
                narrative=sc_narrative,
                supporting_factors=sc_factors,
                invalidation_conditions=sc_invalid,
                probability_boosters=sc_boosters,
                probability_decliners=sc_decliners
            ),
            alternative=Scenario(
                name=alt_name,
                confidence=confidence.level,
                probability_pct=alt_prob,
                narrative=alt_narrative,
                supporting_factors=alt_factors,
                invalidation_conditions=alt_invalid,
                probability_boosters=alt_boosters,
                probability_decliners=alt_decliners
            ),
            risk=Scenario(
                name=risk_name,
                confidence=confidence.level,
                probability_pct=risk_prob,
                narrative=risk_narrative,
                supporting_factors=risk_factors,
                invalidation_conditions=risk_invalid,
                probability_boosters=risk_boosters,
                probability_decliners=risk_decliners
            )
        )
