"""
Tests for market router endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import date
import app.providers
from app.main import app
from app.providers.base import OptionsChain, OptionQuote

client = TestClient(app)


@pytest.fixture
def mock_provider():
    """Mock provider for testing."""
    provider = Mock()
    provider.get_spot_price.return_value = 550.0
    provider.get_expirations.return_value = [date(2025, 1, 24), date(2025, 1, 31)]
    
    chain = OptionsChain(
        underlying="SPY",
        expiration=date(2025, 1, 24),
        spot_price=550.0,
        calls=[
            OptionQuote(strike=550.0, bid=5.0, ask=5.5, last_price=5.2, volume=100, open_interest=1000, implied_volatility=0.2, contract_type="call", in_the_money=False),
            OptionQuote(strike=560.0, bid=1.0, ask=1.5, last_price=1.2, volume=50, open_interest=500, implied_volatility=0.22, contract_type="call", in_the_money=False),
        ],
        puts=[
            OptionQuote(strike=540.0, bid=1.0, ask=1.5, last_price=1.2, volume=50, open_interest=500, implied_volatility=0.22, contract_type="put", in_the_money=False),
            OptionQuote(strike=550.0, bid=5.0, ask=5.5, last_price=5.2, volume=100, open_interest=1000, implied_volatility=0.2, contract_type="put", in_the_money=False),
        ],
        fetched_at="2025-01-24T12:00:00Z"
    )
    provider.get_options_chain.return_value = chain
    provider.get_index_price.return_value = 5500.0
    provider.get_yield_data.return_value = {
        "tnx": 4.25,
        "irx": 4.50,
        "fvx": 4.10,
        "tyx": 4.45,
        "hyg": 76.50,
        "lqd": 108.20,
    }
    provider.get_vix_data.return_value = {
        "current": 15.0,
        "history": [14.0, 14.5, 15.0, 15.5, 16.0],
        "percentile": 35.0,
        "vix_rank": 30.0
    }
    return provider


@pytest.fixture(autouse=True)
def setup_mock_provider(mock_provider):
    """Auto-patch the global provider instance so all backend modules get the mock."""
    with patch('app.providers._provider_instance', mock_provider):
        yield mock_provider


def test_get_price():
    """Test price endpoint."""
    response = client.get("/api/v1/price?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert data["price"] == 550.0
    assert "fetched_at" in data


def test_get_expirations():
    """Test expirations endpoint."""
    response = client.get("/api/v1/expirations?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert "expirations" in data
    assert len(data["expirations"]) > 0


def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_get_options():
    """Test options endpoint."""
    response = client.get("/api/v1/options?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert "calls" in data
    assert "puts" in data
    assert len(data["calls"]) > 0


def test_get_greeks():
    """Test greeks endpoint."""
    response = client.get("/api/v1/greeks?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert "strikes" in data


def test_get_exposure():
    """Test exposure endpoint (gex/dex)."""
    response = client.get("/api/v1/gex?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert "net_gamma_exposure" in data
    assert "net_delta_exposure" in data


def test_get_max_pain():
    """Test max pain endpoint."""
    response = client.get("/api/v1/maxpain?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert "max_pain" in data


def test_get_heatmap():
    """Test heatmap endpoint."""
    response = client.get("/api/v1/heatmap?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "SPY"
    assert "cells" in data


def test_get_intelligence():
    """Test intelligence endpoint."""
    response = client.get("/api/v1/intelligence?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert "market_regime" in data or "summary" in data or "gamma_analysis" in data


def test_get_hedging_strength():
    """Test hedging strength endpoint."""
    response = client.get("/api/v1/hedging-strength?ticker=SPY")
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "classification" in data


def test_get_yield_anomaly():
    """Test yield anomaly endpoint."""
    response = client.get("/api/v1/yield-anomaly")
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "expected_direction" in data


