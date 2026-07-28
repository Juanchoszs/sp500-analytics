from app.infrastructure.adapters.yahoo_adapter import YahooFinanceAdapter


def test_row_value_lookup_supports_common_yahoo_columns():
    adapter = YahooFinanceAdapter()
    assert adapter._safe_int(1200) == 1200
    assert adapter._safe_int("950") == 950
