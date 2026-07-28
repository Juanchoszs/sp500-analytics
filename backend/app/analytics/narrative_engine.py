from app.analytics.gamma_analyzer import GammaAnalysis
from app.analytics.delta_analyzer import DeltaAnalysis
from app.analytics.options_analyzer import OptionsAnalysis
from app.analytics.volatility_analyzer import VolatilityAnalysis
from app.analytics.dealer_analyzer import DealerAnalysis
from app.analytics.score_engine import IntelligenceScores
from app.analytics.confidence_engine import ConfidenceDetails

class NarrativeEngine:
    @staticmethod
    def generate_report(
        ticker: str,
        spot: float,
        expiration_str: str,
        gamma: GammaAnalysis,
        delta: DeltaAnalysis,
        options: OptionsAnalysis,
        vol: VolatilityAnalysis,
        dealer: DealerAnalysis,
        scores: IntelligenceScores,
        confidence: ConfidenceDetails,
        max_pain: float | None
    ) -> str:

        
        # Clasificaciones de régimen
        gamma_regime = "Gamma Positiva" if gamma.regime_type == "positive" else "Gamma Negativa"
        dealer_gamma = "Comprador (Long Gamma)" if dealer.dealer_gamma_regime == "long_gamma" else "Vendedor (Short Gamma)"
        bias = "Alcista (Bullish)" if scores.bullish_score > scores.bearish_score + 10 else ("Bajista (Bearish)" if scores.bearish_score > scores.bullish_score + 10 else "Neutral / Lateral")
        
        ticker_label = "S&P 500" if ticker == "^GSPC" else ticker
        report = f"""# INFORME DE INTELIGENCIA CUANTITATIVA: ESTRUCTURA DE OPCIONES DEL {ticker}
**Vencimiento de Referencia:** {expiration_str} | **Precio Spot:** ${spot:.2f}
*Documento preparado por el Motor de Inteligencia Cuantitativa. Nivel de Confianza General: **{confidence.level}** ({confidence.consistency_score}% de consistencia).*

---

### I. RESUMEN EJECUTIVO
La estructura microestructural del {ticker_label} a fecha actual muestra un sesgo predominante clasificado como **{bias}**. El mercado opera actualmente bajo un régimen de **{gamma_regime}**, lo que influye de manera determinante en el comportamiento de los creadores de mercado (Dealers) y en la dinámica de precios intradiaria. Con el VIX cotizando en **{vol.vix_current:.2f}** (percentil anual del {vol.vix_percentile:.1f}%), las condiciones generales de volatilidad implícita favorecen un escenario de **{vol.description.split('.')[0]}**.

---

### II. SESGO DEL MERCADO & PUNTUACIONES CUANTITATIVAS
Nuestros modelos de puntuación sintetizan múltiples variables objetivas de la cadena de opciones para estimar la dirección de la menor resistencia:

*   **Bullish Score: {scores.bullish_score}/100**
    *   *Razonamiento:* {scores.explanations['bullish_score']}
*   **Bearish Score: {scores.bearish_score}/100**
    *   *Razonamiento:* {scores.explanations['bearish_score']}
*   **Volatility Score: {scores.volatility_score}/100**
    *   *Razonamiento:* {scores.explanations['volatility_score']}
*   **Dealer Support Score: {scores.dealer_support_score}/100**
    *   *Razonamiento:* {scores.explanations['dealer_support_score']}

---

### III. ESTADO DE LOS DEALERS Y FLUJOS DE COBERTURA (HEDGING)
El posicionamiento estimado de los Dealers se clasifica como **{dealer.dealer_gamma_regime.upper()}** y **{dealer.dealer_delta_regime.upper()}**.
*   **Estilo de Cobertura Activo:** {dealer.description}
*   **Impacto Esperado:** {dealer.hedging_impact}
*   **Métrica de Soporte:** El ratio de soporte del Dealer se ubica en **{scores.dealer_support_score:.1f}/100**. En caso de que se presente flujo de venta en el subyacente, la estructura de opciones {"sugiere que los Dealers actuarán como compradores de soporte de forma pasiva debido a su exposición de Gamma" if dealer.dealer_gamma_regime == "long_gamma" else "indica un alto riesgo de que los Dealers aceleren la liquidación para cubrir sus delta exposures, exacerbando la caída"}.

---

### IV. ANÁLISIS ESTRUCTURAL DE GAMMA Y DELTA
La distribución de Gamma y Delta neto a través de la cadena de opciones del {ticker_label} revela fronteras clave de mercado:

*   **Régimen de Gamma:** {gamma.description}
*   **Nivel de Gamma Flip (Zero Gamma):** **${gamma.zero_gamma if gamma.zero_gamma else "N/A"}**. El precio actual se encuentra a una distancia de **{f"{gamma.gamma_flip_distance_pct:.2f}%" if gamma.gamma_flip_distance_pct is not None else "N/A"}** de este nivel. {"La cercanía al flip sugiere fragilidad estructural y un alto riesgo de transición a régimen de volatilidad expansiva si se vulnera." if gamma.is_gamma_flip_close else "El margen actual de seguridad indica que el régimen de estabilidad es, por el momento, robusto."}
*   **Delta Net Exposure:** La exposición neta de delta se ubica en **${scores.trend_strength:.1f}% de concentración unidireccional**. {delta.description}

---

### V. INTERPRETACIÓN DE NIVELES CLAVE DEL MERCADO
*   **Call Wall (Muro de Calls): ${gamma.call_wall if gamma.call_wall else "N/A"}**
    *   *Significado:* Representa el strike con la mayor concentración de Gamma positiva generada por calls.
    *   *Comportamiento esperado:* Actúa como una resistencia magnética muy fuerte. A medida que el precio se acerca a este nivel, los dealers venden subyacente para cubrir su delta largo, lo que frena las alzas a menos que ocurra una oleada masiva de compras (Gamma Squeeze).
*   **Put Wall (Muro de Puts): ${gamma.put_wall if gamma.put_wall else "N/A"}**
    *   *Significado:* Strike con la mayor concentración de Gamma acumulada en opciones Put.
    *   *Comportamiento esperado:* Funciona como el soporte definitivo del día. Si se perfora bajo régimen de Gamma Negativa, los dealers venderán subyacente de forma agresiva para cubrir sus puts ITM, catalizando caídas rápidas.
*   **Zero Gamma / Gamma Flip: ${gamma.zero_gamma if gamma.zero_gamma else "N/A"}**
    *   *Significado:* El umbral de precio donde la exposición neta de Gamma de los creadores de mercado cruza de positiva a negativa.
    *   *Comportamiento esperado:* Actúa como un pivote de volatilidad. Por encima de este nivel, el mercado experimenta reversión a la media; por debajo, se desatan dinámicas pro-cíclicas que expanden los rangos de movimiento.
*   **Expected Move (Movimiento Esperado): +/- ${vol.expected_move_used:.2f} (${vol.lower_bound:.2f} - ${vol.upper_bound:.2f})**
    *   *Significado:* El rango de fluctuación estándar implícito en los precios de opciones.
    *   *Comportamiento esperado:* Existe una probabilidad estadística del ~68% de que el precio del {ticker_label} finalice la sesión dentro de estos límites. Operar fuera de este rango denota anomalía extrema o ruptura de alta volatilidad.
*   **Max Pain (Dolor Máximo): ${max_pain if max_pain is not None else "N/A"}**
    *   *Significado:* El strike en el cual el valor conjunto de las opciones Calls y Puts al vencimiento expira con el menor valor intrínseco.

    *   *Comportamiento esperado:* Ejerce fuerza gravitacional sobre el precio del {ticker_label} al acercarse la expiración, ya que es el nivel que maximiza el beneficio neto para los emisores (vendedores) de contratos.

---

### VI. EXPECTATIVAS DE VOLATILIDAD Y SENTIMIENTO
El análisis combinado de volatilidad implícita y ratios transaccionales muestra:
*   **Régimen de Volatilidad:** {vol.description}
*   **Put/Call Ratio de Open Interest:** **{options.put_call_oi_ratio:.2f}** ({options.sentiment_description})
*   **Put/Call Ratio de Volumen:** **{options.put_call_volume_ratio:.2f}** (indicador de flujo de cobertura intradía rápido).
*   **Concentración de Liquidez:** {options.liquidity_zones}

---

### VII. CONCLUSIONES Y ESCENARIO OPERATIVO
La estructura actual del mercado de opciones del {ticker_label} sugiere un sesgo **{bias.lower()}** respaldado por un nivel de confianza **{confidence.level.lower()}**. Operadores e inversores institucionales vigilan atentamente el nivel de **${gamma.zero_gamma if gamma.zero_gamma else "N/A"}** como el pivote decisivo de la sesión. Mientras el precio se mantenga por encima de este nivel, la cobertura estabilizadora de los Dealers favorece compras en los retrocesos técnicos. Una pérdida sistemática del soporte Zero Gamma alertará de un cambio estructural hacia volatilidad amplificada e incremento de coberturas bajistas cortas de delta.
"""
        return report
