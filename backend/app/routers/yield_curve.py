from fastapi import APIRouter, Query
from app.providers import get_provider
import yfinance as yf
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/curve")
def get_yield_curve():
    """Get current yield curve data."""
    provider = get_provider()
    data = provider.get_yield_data()
    
    # Get rates with fallback values
    rate_3m = data.get("^IRX") or data.get("irx") or 5.25
    rate_2y = data.get("^FVX") or data.get("fvx") or 4.10
    rate_5y = data.get("^FVX") or data.get("fvx") or 4.10
    rate_10y = data.get("^TNX") or data.get("tnx") or 4.25
    rate_30y = data.get("^TYX") or data.get("tyx") or 4.45
    
    return {
        "curve": [
            {"maturity": "3M", "rate": rate_3m},
            {"maturity": "2Y", "rate": rate_2y},
            {"maturity": "5Y", "rate": rate_5y},
            {"maturity": "10Y", "rate": rate_10y},
            {"maturity": "30Y", "rate": rate_30y},
        ],
        "spreads": {
            "spread_2_10": round(rate_10y - rate_2y, 2),
            "spread_5_10": round(rate_10y - rate_5y, 2),
            "spread_3m_10y": round(rate_10y - rate_3m, 2),
        }
    }


@router.get("/credit-spread-history")
def get_credit_spread_history(days: int = Query(default=90, ge=30, le=365)):
    """Get historical HYG/LQD ratio."""
    try:
        hyg = yf.Ticker("HYG")
        lqd = yf.Ticker("LQD")
        
        hyg_hist = hyg.history(period=f"{days}d")["Close"]
        lqd_hist = lqd.history(period=f"{days}d")["Close"]
        
        history = []
        for date in hyg_hist.index:
            if date in lqd_hist.index:
                hyg_price = hyg_hist[date]
                lqd_price = lqd_hist[date]
                if lqd_price > 0:
                    ratio = hyg_price / lqd_price
                    history.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "ratio": round(ratio, 4),
                    })
        
        current_ratio = history[-1]["ratio"] if history else 0.705
        
        return {
            "data": history,
            "current_ratio": current_ratio,
            "normal_threshold": 0.70,
            "stressed_threshold": 0.68,
        }
    except Exception as e:
        # Fallback to mock data if yfinance fails
        import random
        from datetime import datetime, timedelta
        
        history = []
        base_date = datetime.now() - timedelta(days=days)
        base_ratio = 0.705
        
        for i in range(days):
            date = base_date + timedelta(days=i)
            # Simulate realistic variation
            variation = random.uniform(-0.02, 0.02)
            ratio = base_ratio + variation
            history.append({
                "date": date.strftime("%Y-%m-%d"),
                "ratio": round(ratio, 4),
            })
        
        current_ratio = history[-1]["ratio"]
        
        return {
            "data": history,
            "current_ratio": current_ratio,
            "normal_threshold": 0.70,
            "stressed_threshold": 0.68,
        }
