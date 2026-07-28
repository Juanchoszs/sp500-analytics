from dataclasses import dataclass
from app.domain.model.market import ExposureReport

@dataclass
class DealerAnalysis:
    net_gamma_exposure: float
    net_delta_exposure: float
    dealer_gamma_regime: str  # "long_gamma" | "short_gamma"
    dealer_delta_regime: str  # "long_delta" | "short_delta"
    hedging_style: str        # "mean_reversion" | "momentum_following"
    description: str
    hedging_impact: str

class DealerAnalyzer:
    @staticmethod
    def analyze(report: ExposureReport) -> DealerAnalysis:
        net_gex = report.net_gamma_exposure
        net_dex = report.net_delta_exposure
        
        # Régimen de Gamma del Dealer
        if net_gex >= 0:
            gamma_regime = "long_gamma"
            style = "mean_reversion"
            desc = "Los Dealers se encuentran teóricamente en posición de 'Long Gamma' agregada."
            impact = "El comportamiento de cobertura (hedging) de los creadores de mercado consiste en vender cuando el subyacente sube y comprar cuando baja para mantener sus carteras neutrales de delta. Esta dinámica actúa como un amortiguador de la volatilidad del mercado, favoreciendo la consolidación del SPY cerca de los niveles de alta concentración de interés (como Max Pain)."
        else:
            gamma_regime = "short_gamma"
            style = "momentum_following"
            desc = "Los Dealers se encuentran teóricamente en posición de 'Short Gamma' agregada."
            impact = "El comportamiento de cobertura obliga a los creadores de mercado a vender a medida que el precio baja y comprar a medida que el precio sube para ajustar sus coberturas. Este flujo de rebalanceo es dinámicamente pro-cíclico y amplifica la volatilidad existente. Puede generar aceleraciones bruscas si se superan soportes de volumen (Put Walls)."
            
        # Régimen de Delta del Dealer
        delta_regime = "long_delta" if net_dex >= 0 else "short_delta"
        
        return DealerAnalysis(
            net_gamma_exposure=net_gex,
            net_delta_exposure=net_dex,
            dealer_gamma_regime=gamma_regime,
            dealer_delta_regime=delta_regime,
            hedging_style=style,
            description=desc,
            hedging_impact=impact
        )
