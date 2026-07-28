from typing import Any

class QueryEngine:
    @staticmethod
    def list_supported_questions() -> list[dict[str, str]]:
        return [
            {
                "key": "why_rising",
                "label": "¿Por qué el precio está subiendo?",
                "category": "Dirección"
            },
            {
                "key": "why_falling_fast",
                "label": "¿Por qué cayó tan rápido?",
                "category": "Dirección"
            },
            {
                "key": "why_sideways",
                "label": "¿Por qué el mercado está lateral?",
                "category": "Dirección"
            },
            {
                "key": "why_vol_increasing",
                "label": "¿Por qué aumentó la volatilidad?",
                "category": "Volatilidad"
            },
            {
                "key": "what_dealers_doing",
                "label": "¿Qué están haciendo los dealers?",
                "category": "Microestructura"
            },
            {
                "key": "what_options_indicate",
                "label": "¿Qué indican las opciones?",
                "category": "Microestructura"
            }
        ]

    @staticmethod
    def answer_question(question_key: str, context: dict[str, Any]) -> dict[str, Any]:
        spot = context.get("spot", 0.0)
        gamma = context.get("gamma")  # GammaAnalysis
        delta = context.get("delta")  # DeltaAnalysis
        options = context.get("options")  # OptionsAnalysis
        vol = context.get("vol")  # VolatilityAnalysis
        dealer = context.get("dealer")  # DealerAnalysis
        scores = context.get("scores")  # IntelligenceScores
        confidence = context.get("confidence")  # ConfidenceDetails

        answer = ""
        justification_data = {}

        if question_key == "why_rising":
            # Justificación objetiva de subida
            reasons = []
            is_above_zg = gamma.regime_type == "positive"
            is_call_dominated = delta.regime_type == "call_dominated" or options.regime_type == "call_dominated"
            
            if is_above_zg:
                reasons.append(
                    f"El SPY cotiza sobre el nivel de Gamma Flip (${gamma.zero_gamma:.2f}) en régimen de **Gamma Positiva**. "
                    "En este estado, las coberturas de los dealers amortiguan los retrocesos y apoyan la estabilidad del precio."
                )
            if is_call_dominated:
                reasons.append(
                    f"El flujo de Delta neto es positivo (Net DEX: ${delta.net_delta_exposure:,.2f}), indicando una fuerte compra "
                    "de calls por parte de los participantes de opciones, lo que obliga a los dealers a comprar subyacente para cubrirse."
                )
            if options.put_call_volume_ratio < 0.85:
                reasons.append(
                    f"El Put/Call Volume Ratio intradía está bajo ({options.put_call_volume_ratio:.2f}), confirmando que la actividad "
                    "de transacciones del día favorece la compra de opciones alcistas Call sobre Puts bajistas."
                )
            if spot > (report_max_pain := context.get("max_pain", 0.0)):
                reasons.append(
                    f"El precio se encuentra sobre el strike de Max Pain (${report_max_pain:.2f}), lo que reduce el arrastre magnético "
                    "de las coberturas hacia niveles inferiores."
                )

            if not reasons:
                reasons.append(
                    "Aunque el precio sube, la estructura de opciones no muestra un sesgo alcista extremo. "
                    "El movimiento podría estar guiado por flujos fuera de opciones (equity directo) o coberturas neutrales de corto plazo."
                )

            answer = (
                "La subida del precio está respaldada microestructuralmente por los siguientes factores objetivos:\n\n"
                + "\n".join([f"- {r}" for r in reasons])
            )
            justification_data = {
                "net_gex": gamma.net_gamma_exposure,
                "net_dex": delta.net_delta_exposure,
                "put_call_volume_ratio": options.put_call_volume_ratio,
                "spot_vs_zero_gamma": spot - (gamma.zero_gamma or 0)
            }

        elif question_key == "why_falling_fast":
            # Justificación objetiva de caídas rápidas
            reasons = []
            is_below_zg = gamma.regime_type == "negative"
            is_put_dominated = delta.regime_type == "put_dominated" or options.regime_type == "put_dominated"
            
            if is_below_zg:
                reasons.append(
                    f"El SPY cotiza por debajo del nivel de Gamma Flip (${gamma.zero_gamma:.2f}) en régimen de **Gamma Negativa**. "
                    "Las coberturas de los dealers en este régimen son pro-cíclicas: a medida que el precio baja, se ven obligados "
                    "a vender subyacente de forma automática para mantener la neutralidad de delta, acelerando la velocidad de caída."
                )
            if is_put_dominated:
                reasons.append(
                    f"Existe dominancia de Puts en la estructura de Delta (Net DEX: ${delta.net_delta_exposure:,.2f}), reflejando "
                    "que el mercado está sumamente desbalanceado hacia coberturas de protección que presionan al subyacente."
                )
            if vol.vix_current > 18.0:
                reasons.append(
                    f"El índice de volatilidad VIX está elevado ({vol.vix_current:.2f}), incrementando el valor implícito de los puts "
                    "y expandiendo el Expected Move, lo que ensancha los rangos operativos de caída."
                )
            if gamma.put_wall and spot < gamma.put_wall:
                reasons.append(
                    f"El precio ha penetrado a la baja el Put Wall (${gamma.put_wall:.2f}), el soporte de mayor interés abierto, "
                    "desatando cierres de posiciones y ventas de pánico por parte de creadores de mercado."
                )

            if not reasons:
                reasons.append(
                    "La estructura actual de opciones no presenta un sesgo bajista extremo consolidado. "
                    "La velocidad de la caída puede deberse a factores macroeconómicos externos o desbalances de liquidez en el libro de órdenes (market microstructure)."
                )

            answer = (
                "La aceleración de las caídas se encuentra justificada microestructuralmente por:\n\n"
                + "\n".join([f"- {r}" for r in reasons])
            )
            justification_data = {
                "net_gex": gamma.net_gamma_exposure,
                "net_dex": delta.net_delta_exposure,
                "vix": vol.vix_current,
                "spot_vs_put_wall": spot - (gamma.put_wall or 0)
            }

        elif question_key == "why_sideways":
            reasons = []
            is_positive_gamma = gamma.regime_type == "positive"
            is_near_max_pain = abs(spot - (context.get("max_pain", 0.0))) / spot <= 0.0075
            
            if is_positive_gamma:
                reasons.append(
                    f"El SPY opera en régimen de **Gamma Positiva** (Net GEX: ${gamma.net_gamma_exposure:,.2f}), lo que obliga "
                    "a los dealers a actuar como estabilizadores (compran cuando baja, venden cuando sube), 'anclando' el precio "
                    "e impidiendo el desarrollo de tendencias intradiarias."
                )
            if is_near_max_pain:
                reasons.append(
                    f"El spot cotiza extremadamente cerca del nivel de Max Pain (${context.get('max_pain', 0.0):.2f}). Este strike "
                    "ejerce una fuerte atracción de vencimiento (efecto magneto) que inmoviliza el precio."
                )
            if vol.vix_current < 14.0:
                reasons.append(
                    f"La baja volatilidad reflejada en el VIX ({vol.vix_current:.2f}, percentil {vol.vix_percentile:.1f}%) "
                    "indica un bajo nivel de demanda de coberturas Put OTM de pánico, reduciendo la amplitud operativa."
                )

            if not reasons:
                reasons.append(
                    "Los niveles estructurales de opciones no muestran un anclaje extremo directo. "
                    "El comportamiento lateral puede deberse a la espera de eventos macro clave o equilibrio temporal en el libro de órdenes."
                )

            answer = (
                "El comportamiento lateral-consolidado del SPY se debe a:\n\n"
                + "\n".join([f"- {r}" for r in reasons])
            )
            justification_data = {
                "net_gex": gamma.net_gamma_exposure,
                "vix": vol.vix_current,
                "spot_vs_max_pain": spot - (context.get("max_pain", 0.0))
            }

        elif question_key == "why_vol_increasing":
            reasons = []
            is_below_zg = gamma.regime_type == "negative"
            
            if is_below_zg:
                reasons.append(
                    f"El cruce del precio por debajo de Zero Gamma (${gamma.zero_gamma:.2f}) ha activado el régimen de **Gamma Negativa**. "
                    "El hedging dinámico de los dealers ahora persigue la volatilidad del precio en lugar de apaciguarla."
                )
            if vol.vix_current > vol.historical_vix_min * 1.5:
                reasons.append(
                    f"El VIX cotiza en {vol.vix_current:.2f}, reflejando un encarecimiento generalizado de las primas de opciones "
                    "por el aumento del skew (demanda de puts protectivos sobre calls)."
                )
            if options.put_call_volume_ratio > 1.25:
                reasons.append(
                    f"El ratio de volumen Put/Call intradía es alto ({options.put_call_volume_ratio:.2f}), mostrando que el flujo transaccional "
                    "de coberturas agresivas Put está empujando al alza la volatilidad implícita."
                )

            if not reasons:
                reasons.append(
                    "Los datos de la cadena de opciones no muestran un aumento drástico en la volatilidad implícita de los strikes más transaccionados."
                )

            answer = (
                "El aumento de la volatilidad implícita y realizada se justifica por:\n\n"
                + "\n".join([f"- {r}" for r in reasons])
            )
            justification_data = {
                "vix": vol.vix_current,
                "vix_percentile": vol.vix_percentile,
                "put_call_volume_ratio": options.put_call_volume_ratio
            }

        elif question_key == "what_dealers_doing":
            style = "cobertura pasiva estabilizadora (comprar bajo, vender alto)" if dealer.hedging_style == "mean_reversion" else "cobertura activa pro-cíclica (vender caídas, comprar subidas)"
            answer = (
                f"De acuerdo con el posicionamiento neto estimado, los Dealers se encuentran en régimen de **{dealer.dealer_gamma_regime.upper()}**.\n\n"
                f"- **Acción de Cobertura:** Actualmente están realizando {style}.\n"
                f"- **Lado del Flujo:** Al estar expuestos a un Net Gamma neto de ${dealer.net_gamma_exposure:,.2f}, si el precio del SPY sube, los dealers "
                f"{'venden acciones/futuros para recolectar ganancias de delta' if dealer.dealer_gamma_regime == 'long_gamma' else 'compran subyacente para evitar pérdidas de gamma corto'}. "
                f"Si el precio baja, {'compran subyacente para cubrir deltas' if dealer.dealer_gamma_regime == 'long_gamma' else 'venden subyacente de forma agresiva para rebalancear su exposición'}.\n"
                f"- **Presión de Delta:** El delta exposure de los Dealers se estima en ${dealer.net_delta_exposure:,.2f}."
            )
            justification_data = {
                "dealer_gamma_regime": dealer.dealer_gamma_regime,
                "dealer_delta_regime": dealer.dealer_delta_regime,
                "net_gex": dealer.net_gamma_exposure,
                "net_dex": dealer.net_delta_exposure
            }

        elif question_key == "what_options_indicate":
            answer = (
                f"El análisis de la cadena completa de opciones indica un sentimiento **{options.regime_type.upper()}** general:\n\n"
                f"- **Ratio de Interés Abierto:** El Put/Call OI Ratio es de **{options.put_call_oi_ratio:.2f}**, lo que refleja {options.sentiment_description.split('.')[0].lower()}.\n"
                f"- **Flujo Intradía:** El Put/Call Volume Ratio está en **{options.put_call_volume_ratio:.2f}**, señalando la dirección de los flujos de dinero del día.\n"
                f"- **Expected Move:** La estructura de precios de opciones de corto plazo delimita una fluctuación esperada de **+/- ${vol.expected_move_used:.2f}** para este vencimiento, "
                f"estableciendo los límites teóricos del día en **${vol.lower_bound:.2f}** a la baja y **${vol.upper_bound:.2f}** al alza.\n"
                f"- **Zonas de Absorción:** Las mayores concentraciones se encuentran en el Call Wall (${gamma.call_wall:.2f}) y el Put Wall (${gamma.put_wall:.2f})."
            )
            justification_data = {
                "put_call_oi": options.put_call_oi_ratio,
                "put_call_volume": options.put_call_volume_ratio,
                "expected_move": vol.expected_move_used,
                "high_liquidity_strikes": options.high_liquidity_strikes
            }

        else:
            answer = "Pregunta no soportada por el motor de inteligencia."

        return {
            "question_key": question_key,
            "answer": answer,
            "justification_data": justification_data,
            "confidence": confidence.level
        }
