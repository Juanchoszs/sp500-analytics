from dataclasses import dataclass
from typing import List, Dict, Any
from app.providers import get_provider


@dataclass
class AnomalyItem:
    category: str       # "Yield Curve Distortion" | "Credit Spread Dislocation" | "Seasonal Anomaly" | "Cross Currency Basis" | "New Issue Premium"
    severity: str       # "Low" | "Medium" | "High" | "Critical"
    score: float        # 0 - 100
    description: str
    impact: str


@dataclass
class YieldAnomalyReport:
    score: float                  # 0 - 100
    expected_direction: str       # "Bullish" | "Bearish" | "Neutral"
    confidence: str               # "Low" | "Medium" | "High"
    curve_spread_2_10: float      # 10Y - 2Y (approx 10Y - 13W or 10Y - 5Y)
    credit_spread_ratio: float    # HYG / LQD ratio
    anomalies: List[Dict[str, Any]]
    summary: str


class YieldAnomalyAnalyzer:
    @staticmethod
    def analyze() -> YieldAnomalyReport:
        provider = get_provider()
        raw_data = provider.get_yield_data()

        tnx = raw_data.get("tnx") or 4.25
        irx = raw_data.get("irx") or 4.50
        fvx = raw_data.get("fvx") or 4.10
        tyx = raw_data.get("tyx") or 4.45
        hyg = raw_data.get("hyg") or 76.50
        lqd = raw_data.get("lqd") or 108.20

        anomalies: List[AnomalyItem] = []
        scores: List[float] = []

        # 1. Distorsión de Curva de Rendimiento (Yield Curve Distortion)
        # Inversión 10Y vs 3M (TNX - IRX)
        spread_10_3m = tnx - irx
        if spread_10_3m < -0.5:
            anomalies.append(AnomalyItem(
                category="Yield Curve Distortion",
                severity="High",
                score=85.0,
                description=f"Inversión severa de la curva de tipos (10Y - 3M: {spread_10_3m:.2f}%).",
                impact="Históricamente antecede desaceleración económica y contracción de múltiplos bursátiles."
            ))
            scores.append(85.0)
        elif spread_10_3m < 0.0:
            anomalies.append(AnomalyItem(
                category="Yield Curve Distortion",
                severity="Medium",
                score=60.0,
                description=f"Inversión moderada de la curva de tipos (10Y - 3M: {spread_10_3m:.2f}%).",
                impact="Indica cautela en los mercados de renta fija y endurecimiento de condiciones crediticias."
            ))
            scores.append(60.0)
        else:
            scores.append(20.0)

        # 2. Dislocación de Spreads de Crédito (Credit Spread Dislocation)
        credit_ratio = hyg / (lqd if lqd > 0 else 1.0)
        if credit_ratio < 0.68:
            anomalies.append(AnomalyItem(
                category="Credit Spread Dislocations",
                severity="High",
                score=78.0,
                description=f"Divergencia bajista en crédito corporativo (Ratio HYG/LQD en {credit_ratio:.3f}).",
                impact="Aumento en el costo de deuda de alto riesgo que suele presionar a la baja las valoraciones accionarias."
            ))
            scores.append(78.0)
        elif credit_ratio > 0.73:
            anomalies.append(AnomalyItem(
                category="Credit Spread Dislocations",
                severity="Low",
                score=30.0,
                description=f"Apetito de riesgo elevado en crédito (Ratio HYG/LQD en {credit_ratio:.3f}).",
                impact="Condiciones crediticias relajadas que respaldan valoraciones de renta variable."
            ))
            scores.append(30.0)
        else:
            scores.append(45.0)

        # 3. Anomalías Estacionales (Seasonal Anomalies)
        # Tasa corta (IRX) alta vs Tasa larga (TYX)
        if irx > tyx:
            anomalies.append(AnomalyItem(
                category="Seasonal Anomalies",
                severity="Medium",
                score=55.0,
                description=f"Tasa de descuento de corto plazo ({irx:.2f}%) excede la tasa a 30 años ({tyx:.2f}%).",
                impact="Genera distorsiones en el costo del dinero estacional de tesorerías corporativas."
            ))
            scores.append(55.0)
        else:
            scores.append(15.0)

        # 4. Cross Currency Basis (Estructura de tasa vs liquidez)
        if abs(tnx - fvx) < 0.05:
            anomalies.append(AnomalyItem(
                category="Cross Currency Basis",
                severity="Low",
                score=40.0,
                description="Aplanamiento extremo en el tramo 5Y-10Y de Treasuries.",
                impact="Fricciones menores en la liquidez de arbitraje de divisas y swap spreads."
            ))
            scores.append(40.0)
        else:
            scores.append(20.0)

        # 5. New Issue Premium (Prima de emisión de primarios)
        if spread_10_3m < -0.2 and credit_ratio < 0.70:
            anomalies.append(AnomalyItem(
                category="New Issue Premium",
                severity="High",
                score=80.0,
                description="Concesión elevada exigida en nuevas emisiones de deuda corporativa.",
                impact="Los inversionistas exigen mayores cupones para absorber nueva oferta de bonos."
            ))
            scores.append(80.0)
        else:
            scores.append(25.0)

        # Score Agregado de Anomalía (0 - 100)
        overall_score = sum(scores) / len(scores) if scores else 30.0
        overall_score = round(min(100.0, max(0.0, overall_score)), 1)

        # Dirección Esperada del Mercado
        if overall_score >= 65.0:
            expected_direction = "Bearish"
            summary = "Severas distorsiones en tasas y crédito sugieren presión bajista sobre el riesgo accionario."
        elif overall_score <= 35.0:
            expected_direction = "Bullish"
            summary = "Estructura de tasas y spreads de crédito saludable; sin anomalías macro significativas."
        else:
            expected_direction = "Neutral"
            summary = "Condiciones mixtas en el mercado de renta fija y crédito. Sesgo macro neutral."

        # Nivel de Confianza
        high_severity_count = sum(1 for a in anomalies if a.severity in ("High", "Critical"))
        if high_severity_count >= 2 or len(anomalies) >= 4:
            confidence = "High"
        elif len(anomalies) >= 2:
            confidence = "Medium"
        else:
            confidence = "Low"

        anomalies_dicts = [
            {
                "category": a.category,
                "severity": a.severity,
                "score": a.score,
                "description": a.description,
                "impact": a.impact,
            }
            for a in anomalies
        ]

        return YieldAnomalyReport(
            score=overall_score,
            expected_direction=expected_direction,
            confidence=confidence,
            curve_spread_2_10=round(spread_10_3m, 2),
            credit_spread_ratio=round(credit_ratio, 3),
            anomalies=anomalies_dicts,
            summary=summary,
        )
