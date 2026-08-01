"""
Shared constants used across the application.
Centralizing constants makes it easier to maintain consistency and update values.
"""

# Options contract multiplier
CONTRACT_MULTIPLIER = 100

# Cache TTL values (in seconds)
DEFAULT_TTL_OPTIONS = 300  # 5 minutes for options data
DEFAULT_TTL_PRICE = 60    # 1 minute for price data
DEFAULT_TTL_VIX = 60      # 1 minute for VIX data
DEFAULT_TTL_ANALYSIS = 600  # 10 minutes for analysis results

# Analysis thresholds
STD_DEV_THRESHOLD = 2.0  # Standard deviation threshold for anomaly detection
GAMMA_FLIP_THRESHOLD = 1.0  # Percentage threshold for gamma flip proximity
DELTA_THRESHOLD = 0.05  # Threshold for delta dominance classification

# Market timezone
MARKET_TIMEZONE = "America/New_York"

# Supported tickers
SUPPORTED_INDEX_TICKERS = {"^GSPC", "^DJI", "^IXIC", "^RUT"}
SUPPORTED_ETF_TICKERS = {"SPY", "DIA", "QQQ", "IWM"}

# Hedging strength classification thresholds
HEDGING_STRENGTH_THRESHOLDS = {
    "very_weak": 20.0,
    "weak": 40.0,
    "neutral": 60.0,
    "strong": 80.0,
}

# Volatility regime thresholds
VOLATILITY_HIGH_THRESHOLD = 20.0
VOLATILITY_LOW_THRESHOLD = 14.0
VIX_PERCENTILE_HIGH = 75.0
VIX_PERCENTILE_LOW = 25.0

# Options flow thresholds
PUT_CALL_OI_HIGH = 1.2
PUT_CALL_OI_LOW = 0.75

# Time thresholds for expected move calculation
EXPECTED_MOVE_SHORT_TERM_DAYS = 7  # Use straddle-based expected move for <= 7 days

# Default risk-free rate and dividend yield (for Black-Scholes)
DEFAULT_RISK_FREE_RATE = 0.05  # 5%
DEFAULT_DIVIDEND_YIELD = 0.012  # 1.2% (approximate for SPY)
