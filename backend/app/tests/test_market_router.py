"""
Tests for market router endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import date
from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_provider():
    """Mock provider for testing."""
    provider = Mock()
    provider.get_spot_price.return_value = 550.0
    provider.get_expirations.return_value = [date(2025, 1, 24), date(2025, 1, 31)]
    return provider


def test_get_price(mock_provider):
    """Test price endpoint."""
    with patch('app.routers.market.get_provider', return_value=mock_provider):
        response = client.get("/api/v1/price?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "SPY"
        assert data["price"] == 550.0
        assert "fetched_at" in data


def test_get_expirations(mock_provider):
    """Test expirations endpoint."""
    with patch('app.routers.market.get_provider', return_value=mock_provider):
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
