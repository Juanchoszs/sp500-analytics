from dataclasses import dataclass
from app.domain.model.market import ExposureReport

@dataclass
class OptionsAnalysis:
    put_call_oi_ratio: float
    put_call_volume_ratio: float
    high_liquidity_strikes: list[float]
    regime_type: str  # "call_dominated" | "put_dominated" | "neutral"
    sentiment_description: str
    liquidity_zones: str

class OptionsAnalyzer:
    @staticmethod
    def analyze(report: ExposureReport) -> OptionsAnalysis:
        pc_oi = report.put_call_oi_ratio
        pc_vol = report.put_call_volume_ratio
        high_liq = report.high_liquidity_strikes
        
        # Clasificación del Régimen de Opciones
        if pc_oi > 1.2:
            regime = "put_dominated"
            sentiment = "Sentimiento del mercado cauteloso o abiertamente bajista. La acumulación de contratos Put en el Open Interest supera significativamente a los de Call, denotando una alta demanda de coberturas de cartera (hedging protectivo) o especulación bajista."
        elif pc_oi < 0.75:
            regime = "call_dominated"
            sentiment = "Sentimiento del mercado optimista o alcista. El Open Interest muestra un claro sesgo hacia contratos Call, lo que refleja un posicionamiento mayoritariamente alcista y un apetito especulativo por apalancarse en la subida del SPY."
        else:
            regime = "neutral"
            sentiment = "Sentimiento del mercado neutral y balanceado. El posicionamiento en opciones muestra una distribución equitativa entre coberturas bajistas y apuestas alcistas, lo que sugiere indecisión o consolidación en el corto plazo."
            
        # Formatear zonas de liquidez
        zones = f"Los strikes con mayor concentración transaccional y de acumulación histórica son: {', '.join(map(str, high_liq))}. Estos niveles actuarán como zonas de soporte o resistencia psicológica de alta fricción debido al flujo constante de coberturas."
        
        return OptionsAnalysis(
            put_call_oi_ratio=pc_oi,
            put_call_volume_ratio=pc_vol,
            high_liquidity_strikes=high_liq,
            regime_type=regime,
            sentiment_description=sentiment,
            liquidity_zones=zones
        )
