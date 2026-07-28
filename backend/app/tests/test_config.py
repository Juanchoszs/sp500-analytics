from app.config import Settings


def test_default_ticker_uses_spy():
    settings = Settings(_env_file=None)
    assert settings.default_ticker == "SPY"
