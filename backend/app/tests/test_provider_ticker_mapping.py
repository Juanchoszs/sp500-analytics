from app.infrastructure.adapters.yahoo_adapter import YahooFinanceAdapter


def test_resolve_options_ticker_for_sp500_index():
    adapter = YahooFinanceAdapter()
    assert adapter._safe_float(550.25) == 550.25
    assert adapter._safe_float(None) == 0.0
