"""
Módulo centralizado de conversión SPY -> ^GSPC.

Regla cardinal:
- Toda la analítica de opciones (griegos, OI, volumen, walls, gex, dex) se calcula sobre SPY.
- Todas las respuestas destinadas a la visualización se convierten dinámicamente usando:
    ratio = GSPC / SPY
- Los valores de strikes, spot, walls y exposiciones se ajustan a la escala de ^GSPC.
"""
from typing import Any, Dict, List, Optional


def calculate_index_ratio(spy_spot: float, gspc_price: float) -> float:
    if spy_spot <= 0 or gspc_price <= 0:
        return 1.0
    return gspc_price / spy_spot


def convert_strike(strike: float, ratio: float) -> float:
    return round(strike * ratio, 2)


def convert_exposure_dict(exposure_data: Dict[str, Any], ratio: float, index_price: float) -> Dict[str, Any]:
    """
    Convierte una respuesta de exposición (ExposureResponse en dict) de escala SPY a escala ^GSPC.
    """
    converted = dict(exposure_data)
    converted["display_ticker"] = "^GSPC"
    converted["underlying_ticker"] = exposure_data.get("ticker", "SPY")
    converted["index_ticker"] = "^GSPC"
    converted["index_price"] = index_price
    converted["index_ratio"] = ratio

    # Convertir spot price
    if exposure_data.get("spot_price") is not None:
        converted["spot_price"] = round(exposure_data["spot_price"] * ratio, 2)
        converted["spot_price_spy"] = exposure_data["spot_price"]

    # Convertir niveles clave (walls, zero gamma, max pain)
    for key in ("call_wall", "put_wall", "gamma_wall", "zero_gamma", "max_pain"):
        val = exposure_data.get(key)
        if val is not None:
            converted[key] = round(val * ratio, 2)
            converted[f"{key}_spy"] = val
            converted[f"{key}_index"] = round(val * ratio, 2)

    # Net exposures
    if exposure_data.get("net_delta_exposure") is not None:
        converted["net_delta_exposure"] = exposure_data["net_delta_exposure"] * ratio
    if exposure_data.get("net_gamma_exposure") is not None:
        converted["net_gamma_exposure"] = exposure_data["net_gamma_exposure"] * ratio * ratio

    # High liquidity strikes
    if "high_liquidity_strikes" in exposure_data and exposure_data["high_liquidity_strikes"]:
        converted["high_liquidity_strikes"] = [
            round(k * ratio, 2) for k in exposure_data["high_liquidity_strikes"]
        ]

    # Pinning probability dict
    if "pinning_probability" in exposure_data and exposure_data["pinning_probability"]:
        converted["pinning_probability"] = {
            str(round(float(k) * ratio, 2)): v
            for k, v in exposure_data["pinning_probability"].items()
        }

    # Convertir strikes de la cadena
    if "strikes" in exposure_data:
        converted_strikes = []
        for s in exposure_data["strikes"]:
            s_dict = dict(s) if hasattr(s, "model_dump") or hasattr(s, "dict") else dict(s)
            spy_strike = s_dict.get("strike", 0.0)
            s_dict["strike"] = round(spy_strike * ratio, 2)
            s_dict["strike_spy"] = spy_strike

            if s_dict.get("delta_exposure") is not None:
                s_dict["delta_exposure"] = s_dict["delta_exposure"] * ratio
            if s_dict.get("call_delta_exposure") is not None:
                s_dict["call_delta_exposure"] = s_dict["call_delta_exposure"] * ratio
            if s_dict.get("put_delta_exposure") is not None:
                s_dict["put_delta_exposure"] = s_dict["put_delta_exposure"] * ratio
            if s_dict.get("gamma_exposure") is not None:
                s_dict["gamma_exposure"] = s_dict["gamma_exposure"] * ratio * ratio
            if s_dict.get("call_gamma_exposure") is not None:
                s_dict["call_gamma_exposure"] = s_dict["call_gamma_exposure"] * ratio * ratio
            if s_dict.get("put_gamma_exposure") is not None:
                s_dict["put_gamma_exposure"] = s_dict["put_gamma_exposure"] * ratio * ratio

            converted_strikes.append(s_dict)
        converted["strikes"] = converted_strikes

    return converted
