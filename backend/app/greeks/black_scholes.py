"""
Black-Scholes-Merton implementado desde cero (sin librerías de pricing).
Incluye dividend yield continuo (q), relevante para SPY porque el ETF
reparte dividendos trimestrales que afectan el precio "justo" de las
opciones.

Nota de precisión: SPY tiene opciones de estilo americano. Black-Scholes
asume estilo europeo. Para calls sobre un activo que paga dividendos
bajos y puts fuera del dinero, la diferencia es pequeña; para puts ITM
profundos la aproximación puede subestimar el valor por el ejercicio
temprano. Es la misma simplificación que usan la mayoría de las
calculadoras públicas de GEX, y se documenta aquí explícitamente en vez
de esconderla.
"""
import math
from dataclasses import dataclass


def _norm_cdf(x: float) -> float:
    """N(x): función de distribución acumulada normal estándar."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    """phi(x): función de densidad normal estándar."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


@dataclass
class Greeks:
    delta: float
    gamma: float
    vega: float   # sensibilidad a un cambio de 1 punto porcentual (1.00 -> 1%) en IV
    theta: float  # decaimiento diario (ya dividido entre 365)
    rho: float
    price: float  # precio teórico BSM, útil para comparar contra el mercado


def _d1_d2(S: float, K: float, T: float, r: float, q: float, sigma: float) -> tuple[float, float]:
    if T <= 0 or sigma <= 0:
        # Contrato en/después de vencimiento, o IV inválida/nula: no hay
        # sensibilidad temporal que calcular de forma estable.
        raise ValueError("T y sigma deben ser positivos para Black-Scholes")
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return d1, d2


def compute_greeks(
    spot: float,
    strike: float,
    time_to_expiry_years: float,
    risk_free_rate: float,
    dividend_yield: float,
    implied_vol: float,
    option_type: str,  # "call" | "put"
) -> Greeks:
    S, K, T, r, q, sigma = spot, strike, time_to_expiry_years, risk_free_rate, dividend_yield, implied_vol

    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        # Contrato prácticamente sin vida útil o IV no disponible: los
        # griegos no son numéricamente estables. Devolvemos ceros en vez
        # de propagar un NaN/infinito que rompería los agregados de GEX/DEX.
        return Greeks(delta=0.0, gamma=0.0, vega=0.0, theta=0.0, rho=0.0, price=max(0.0, S - K) if option_type == "call" else max(0.0, K - S))

    d1, d2 = _d1_d2(S, K, T, r, q, sigma)
    disc_q = math.exp(-q * T)
    disc_r = math.exp(-r * T)
    nd1 = _norm_pdf(d1)

    # Gamma y Vega son idénticos para call y put (propiedad de BSM)
    gamma = (disc_q * nd1) / (S * sigma * math.sqrt(T))
    vega = (S * disc_q * nd1 * math.sqrt(T)) / 100.0  # por 1 punto porcentual de IV

    if option_type == "call":
        delta = disc_q * _norm_cdf(d1)
        price = S * disc_q * _norm_cdf(d1) - K * disc_r * _norm_cdf(d2)
        theta_annual = (
            -(S * disc_q * nd1 * sigma) / (2 * math.sqrt(T))
            - r * K * disc_r * _norm_cdf(d2)
            + q * S * disc_q * _norm_cdf(d1)
        )
        rho = (K * T * disc_r * _norm_cdf(d2)) / 100.0
    elif option_type == "put":
        delta = disc_q * (_norm_cdf(d1) - 1.0)
        price = K * disc_r * _norm_cdf(-d2) - S * disc_q * _norm_cdf(-d1)
        theta_annual = (
            -(S * disc_q * nd1 * sigma) / (2 * math.sqrt(T))
            + r * K * disc_r * _norm_cdf(-d2)
            - q * S * disc_q * _norm_cdf(-d1)
        )
        rho = (-K * T * disc_r * _norm_cdf(-d2)) / 100.0
    else:
        raise ValueError("option_type debe ser 'call' o 'put'")

    theta_daily = theta_annual / 365.0

    return Greeks(
        delta=delta, gamma=gamma, vega=vega, theta=theta_daily, rho=rho, price=price
    )
