import io
from types import SimpleNamespace

from app.analytics.docx_generator import generate_docx_report


def _make_report_dict():
    return {
        "ticker": "SPY",
        "expiration": "2026-07-24",
        "fetched_at": "2026-07-24T12:00:00Z",
        "scores": {"bullish_score": 60, "bearish_score": 30, "risk_score": 12},
        "gamma_analysis": {"expected_behavior": "Neutral"},
        "delta_analysis": {"hedging_pressure": "Moderate"},
        "dealer_analysis": {"dealer_gamma_regime": "long_gamma", "hedging_impact": "low"},
        "options_analysis": {"liquidity_zones": "Zona A, Zona B", "sentiment_description": "Levemente alcista"},
        "narrative": "# INFORME\nLínea 1\n- Punto A\n- Punto B",
        "scenarios": {
            "principal": {"name": "Base", "probability_pct": 50, "confidence": "Alta", "narrative": "Escenario base.", "supporting_factors": ["Factor 1"], "invalidation_conditions": ["Inv 1"]},
            "alternative": {"name": "Alt", "probability_pct": 30, "confidence": "Media", "narrative": "Escenario alterno.", "supporting_factors": [], "invalidation_conditions": []},
            "risk": {"name": "Riesgo", "probability_pct": 20, "confidence": "Baja", "narrative": "Escenario de riesgo.", "supporting_factors": [], "invalidation_conditions": []},
        },
        "volatility_analysis": {"description": "Volatilidad baja"},
    }


def _make_report_obj_from_dict(d: dict):
    # Convert nested dict into SimpleNamespace recursively to simulate Pydantic-like object
    def conv(x):
        if isinstance(x, dict):
            ns = SimpleNamespace()
            for k, v in x.items():
                setattr(ns, k, conv(v))
            return ns
        if isinstance(x, list):
            return [conv(i) for i in x]
        return x

    return conv(d)


def _make_exposure():
    return {
        "spot_price": 400.0,
        "net_gamma_exposure": 123456.0,
        "net_delta_exposure": -65432.0,
        "call_wall": 410.0,
        "put_wall": 390.0,
        "zero_gamma": 405.0,
        "max_pain": 402.0,
        "put_call_oi_ratio": 0.45,
        "put_call_volume_ratio": 0.52,
        "strikes": [
            {"strike": 390.0, "gamma_exposure": -1000, "call_delta_exposure": 10, "put_delta_exposure": -20, "call_oi": 100, "put_oi": 80, "call_volume": 50, "put_volume": 40},
            {"strike": 400.0, "gamma_exposure": 2000, "call_delta_exposure": 30, "put_delta_exposure": -10, "call_oi": 200, "put_oi": 90, "call_volume": 150, "put_volume": 60},
        ],
    }


def test_generate_docx_with_dict_and_object():
    report_dict = _make_report_dict()
    exposure = _make_exposure()

    # 1) Dict input
    buf = generate_docx_report(report_dict, exposure, exposure, chart_source="^GSPC")
    assert isinstance(buf, io.BytesIO)
    b = buf.getvalue()
    assert len(b) > 1000

    # 2) Object-like input (Pydantic-like)
    report_obj = _make_report_obj_from_dict(report_dict)
    buf2 = generate_docx_report(report_obj, exposure, exposure, chart_source="^GSPC")
    assert isinstance(buf2, io.BytesIO)
    b2 = buf2.getvalue()
    assert len(b2) > 1000

    # 3) Chart source with explicit conversion ratio
    buf3 = generate_docx_report(report_dict, exposure, exposure, chart_source="^GSPC", chart_ratio=10.03)
    assert isinstance(buf3, io.BytesIO)
    b3 = buf3.getvalue()
    assert len(b3) > 1000

    import zipfile
    with zipfile.ZipFile(io.BytesIO(b3)) as z:
        assert any(b"^GSPC" in z.read(name) for name in z.namelist() if name.endswith("document.xml"))


if __name__ == "__main__":
    test_generate_docx_with_dict_and_object()
    print("Docx generator tests passed")
