from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import yfinance as yf
import numpy as np
from datetime import datetime, timedelta
import pytz


@dataclass
class AnomalyItem:
    category: str
    severity: str
    score: float
    description: str
    impact: str
    z_score: Optional[float] = None
    timestamp: Optional[str] = None


@dataclass
class YieldAnomalyReport:
    score: float
    expected_direction: str
    confidence: str
    current_price: float
    current_log_return: float
    anomalies: List[Dict[str, Any]]
    summary: str
    historical_context: Dict[str, Any]
    price_history: List[Dict[str, Any]]
    anomaly_markers: List[Dict[str, Any]]
    ohlc_data: List[Dict[str, Any]]
    log_returns_data: List[Dict[str, Any]]
    upper_threshold: List[Dict[str, Any]]
    lower_threshold: List[Dict[str, Any]]


class YieldAnomalyAnalyzer:
    # Threshold for anomaly detection
    STD_DEV_THRESHOLD = 2.0
    # Timezone for market data (US Eastern)
    MARKET_TIMEZONE = pytz.timezone('America/New_York')
    
    @staticmethod
    def _convert_to_market_time(dt: datetime) -> str:
        """Convert datetime to US Eastern timezone and format as ISO string."""
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        eastern_dt = dt.astimezone(YieldAnomalyAnalyzer.MARKET_TIMEZONE)
        return eastern_dt.isoformat()
    
    @staticmethod
    def _get_intraday_log_returns(ticker: str, days: int = 5, interval: str = "5m") -> List[float]:
        """Get intraday log returns for specified ticker."""
        try:
            ticker_obj = yf.Ticker(ticker)
            hist = ticker_obj.history(period=f"{days}d", interval=interval)["Close"]
            
            if len(hist) < 2:
                return []
            
            # Calculate log returns
            log_returns = []
            for i in range(1, len(hist)):
                prev_price = hist.iloc[i - 1]
                curr_price = hist.iloc[i]
                if prev_price > 0 and curr_price > 0:
                    log_return = np.log(curr_price / prev_price)
                    log_returns.append(float(log_return))
            
            return log_returns
        except Exception:
            return []
    
    @staticmethod
    def _calculate_stats(returns: List[float]) -> tuple[float, float]:
        """Calculate mean and std dev from returns using Bessel's correction."""
        if len(returns) < 2:
            return 0.0, 0.0
        # Use Bessel's correction (n-1) for sample standard deviation
        n = len(returns)
        mean = float(np.mean(returns))
        if n > 1:
            variance = sum((x - mean) ** 2 for x in returns) / (n - 1)
            std = float(np.sqrt(variance))
        else:
            std = 0.0
        return mean, std
    
    @staticmethod
    def _get_severity_from_z_score(z_score: float) -> str:
        """Determine severity based on z-score."""
        abs_z = abs(z_score)
        if abs_z >= 3.0:
            return "Critical"
        elif abs_z >= 2.0:
            return "High"
        elif abs_z >= 1.5:
            return "Medium"
        else:
            return "Low"
    
    @staticmethod
    def analyze(ticker: str = "^GSPC") -> YieldAnomalyReport:
        anomalies: List[AnomalyItem] = []
        scores: List[float] = []
        
        # Get intraday OHLC data and log returns
        try:
            ticker_obj = yf.Ticker(ticker)
            hist = ticker_obj.history(period="5d", interval="5m")
            
            # Calculate log returns and prepare OHLC data
            log_returns = []
            price_history = []
            ohlc_data = []
            window = 20
            
            for i in range(1, len(hist)):
                prev_close = hist['Close'].iloc[i - 1]
                curr_close = hist['Close'].iloc[i]
                
                if prev_close > 0 and curr_close > 0:
                    log_return = np.log(curr_close / prev_close)
                    log_returns.append(float(log_return))
                    
                    # Convert timestamp to US Eastern timezone
                    timestamp = YieldAnomalyAnalyzer._convert_to_market_time(hist.index[i].to_pydatetime())
                    
                    price_history.append({
                        "timestamp": timestamp,
                        "price": float(curr_close),
                        "log_return": float(log_return)
                    })
                    
                    ohlc_data.append({
                        "timestamp": timestamp,
                        "open": float(hist['Open'].iloc[i]),
                        "high": float(hist['High'].iloc[i]),
                        "low": float(hist['Low'].iloc[i]),
                        "close": float(curr_close)
                    })
        except Exception:
            log_returns = []
            price_history = []
            ohlc_data = []
        
        # Calculate rolling mean and std for thresholds (using Bessel's correction)
        upper_threshold = []
        lower_threshold = []
        
        if len(log_returns) >= window:
            for i in range(len(log_returns)):
                start_idx = max(0, i - window + 1)
                window_returns = log_returns[start_idx:i+1]
                if len(window_returns) > 1:
                    mean = float(np.mean(window_returns))
                    # Bessel's correction for sample std
                    n = len(window_returns)
                    variance = sum((x - mean) ** 2 for x in window_returns) / (n - 1)
                    std = float(np.sqrt(variance))
                    upper_threshold.append({
                        "timestamp": price_history[i]["timestamp"],
                        "value": mean + YieldAnomalyAnalyzer.STD_DEV_THRESHOLD * std
                    })
                    lower_threshold.append({
                        "timestamp": price_history[i]["timestamp"],
                        "value": mean - YieldAnomalyAnalyzer.STD_DEV_THRESHOLD * std
                    })
                else:
                    upper_threshold.append({"timestamp": price_history[i]["timestamp"], "value": 0})
                    lower_threshold.append({"timestamp": price_history[i]["timestamp"], "value": 0})
        
        mean_return, std_return = YieldAnomalyAnalyzer._calculate_stats(log_returns)
        
        # Get current price and latest log return
        try:
            current_hist = ticker_obj.history(period="1d", interval="5m")
            current_price = float(current_hist['Close'].iloc[-1])
            
            if len(current_hist) >= 2:
                prev_price = float(current_hist['Close'].iloc[-2])
                current_log_return = np.log(current_price / prev_price) if prev_price > 0 else 0.0
            else:
                current_log_return = 0.0
        except Exception:
            current_price = 0.0
            current_log_return = 0.0
        
        # 1. Current Return Anomaly
        if std_return > 0:
            z_current = (current_log_return - mean_return) / std_return
            if abs(z_current) >= YieldAnomalyAnalyzer.STD_DEV_THRESHOLD:
                severity = YieldAnomalyAnalyzer._get_severity_from_z_score(z_current)
                direction = "positive" if z_current > 0 else "negative"
                score = min(100, max(0, 60 + abs(z_current) * 15))
                anomalies.append(AnomalyItem(
                    category="Current Return Anomaly",
                    severity=severity,
                    score=score,
                    description=f"Rendimiento logarítmico {direction} extremo (actual: {current_log_return:.6f}, z-score: {z_current:.2f}).",
                    impact=f"Desviación de ±{abs(z_current):.1f}σ de la media intradía de {mean_return:.6f}. Indica movimiento anómalo.",
                    z_score=z_current,
                    timestamp=YieldAnomalyAnalyzer._convert_to_market_time(datetime.now())
                ))
                scores.append(score)
            else:
                scores.append(20.0)
        else:
            scores.append(30.0)
        
        # 2. Volatility Regime Anomaly
        if len(log_returns) > 50:
            recent_std = float(np.std(log_returns[-50:]))
            historical_std = float(np.std(log_returns))
            z_vol = (recent_std - historical_std) / historical_std if historical_std > 0 else 0
            
            if abs(z_vol) >= 1.5:
                severity = YieldAnomalyAnalyzer._get_severity_from_z_score(z_vol)
                vol_regime = "elevated" if z_vol > 0 else "suppressed"
                score = min(100, max(0, 50 + abs(z_vol) * 20))
                anomalies.append(AnomalyItem(
                    category="Volatility Regime Shift",
                    severity=severity,
                    score=score,
                    description=f"Volatilidad {vol_regime} (actual: {recent_std:.6f}, z-score: {z_vol:.2f}).",
                    impact=f"Desviación de ±{abs(z_vol):.1f}σ de la volatilidad histórica. Cambio en régime de mercado.",
                    z_score=z_vol,
                    timestamp=YieldAnomalyAnalyzer._convert_to_market_time(datetime.now())
                ))
                scores.append(score)
            else:
                scores.append(25.0)
        else:
            scores.append(30.0)
        
        # 3. Extreme Return Detection (outliers in history using rolling thresholds)
        anomaly_markers = []
        if len(log_returns) > 20 and len(upper_threshold) > 0:
            for i, (log_ret, price_point, upper, lower) in enumerate(zip(log_returns, price_history, upper_threshold, lower_threshold)):
                # Use rolling window z-score for better filtering
                start_idx = max(0, i - window + 1)
                window_returns = log_returns[start_idx:i+1]
                if len(window_returns) > 1:
                    window_mean = float(np.mean(window_returns))
                    n = len(window_returns)
                    window_variance = sum((x - window_mean) ** 2 for x in window_returns) / (n - 1)
                    window_std = float(np.sqrt(window_variance))
                    
                    if window_std > 0:
                        rolling_z = (log_ret - window_mean) / window_std
                        
                        # Only flag as anomaly if z-score is between 2.0 and 4.0 (filter extremes)
                        if 2.0 <= abs(rolling_z) <= 4.0 and (log_ret > upper["value"] or log_ret < lower["value"]):
                            severity = YieldAnomalyAnalyzer._get_severity_from_z_score(rolling_z)
                            direction = "above" if log_ret > upper["value"] else "below"
                            anomaly_markers.append({
                                "timestamp": price_point["timestamp"],
                                "price": price_point["price"],
                                "log_return": log_ret,
                                "z_score": rolling_z,
                                "severity": severity,
                                "type": direction,
                                "upper_threshold": upper["value"],
                                "lower_threshold": lower["value"]
                            })
            
            extreme_count = len(anomaly_markers)
            if extreme_count >= 3:
                score = min(100, 70 + extreme_count * 5)
                anomalies.append(AnomalyItem(
                    category="Cluster of Extreme Returns",
                    severity="High",
                    score=score,
                    description=f"Detectados {extreme_count} rendimientos extremos en el período.",
                    impact="Agrupación de movimientos extremos indica posible cambio estructural o evento de mercado.",
                    z_score=None,
                    timestamp=YieldAnomalyAnalyzer._convert_to_market_time(datetime.now())
                ))
                scores.append(score)
            else:
                scores.append(20.0)
        else:
            scores.append(30.0)
        
        # Calculate weighted score
        overall_score = sum(scores) / len(scores) if scores else 30.0
        overall_score = round(min(100.0, max(0.0, overall_score)), 1)
        
        # Expected direction
        if len(anomalies) >= 2:
            negative_signals = sum(1 for a in anomalies if "negative" in a.description.lower() or "suppressed" in a.description.lower())
            if negative_signals >= 2:
                expected_direction = "Bearish"
                summary = "Múltiples anomalías con sesgo bajista detectadas en rendimientos."
            else:
                expected_direction = "Neutral"
                summary = "Anomalías detectadas pero sin sesgo direccional claro."
        elif len(anomalies) == 1:
            if "negative" in anomalies[0].description.lower():
                expected_direction = "Bearish"
                summary = "Anomalía bajista aislada detectada."
            elif "positive" in anomalies[0].description.lower():
                expected_direction = "Bullish"
                summary = "Anomalía alcista aislada detectada."
            else:
                expected_direction = "Neutral"
                summary = "Anomalía aislada detectada."
        else:
            expected_direction = "Neutral"
            summary = "Sin anomalías significativas. Rendimientos dentro de rango normal."
        
        # Confidence based on z-score magnitude
        high_z_count = sum(1 for a in anomalies if a.z_score and abs(a.z_score) >= 2.5)
        if high_z_count >= 2:
            confidence = "High"
        elif len(anomalies) >= 2:
            confidence = "Medium"
        else:
            confidence = "Low"
        
        anomalies_dicts = [
            {
                "category": a.category,
                "severity": a.severity,
                "score": a.score,
                "description": a.description,
                "impact": a.impact,
                "z_score": a.z_score,
                "timestamp": a.timestamp,
            }
            for a in anomalies
        ]
        
        return YieldAnomalyReport(
            score=overall_score,
            expected_direction=expected_direction,
            confidence=confidence,
            current_price=current_price,
            current_log_return=current_log_return,
            anomalies=anomalies_dicts,
            summary=summary,
            historical_context={
                "mean_log_return": round(mean_return, 6),
                "std_log_return": round(std_return, 6),
                "timeframe": "5m intraday",
                "std_threshold": YieldAnomalyAnalyzer.STD_DEV_THRESHOLD,
                "ticker": ticker,
                "data_points": len(log_returns),
            },
            price_history=price_history,
            anomaly_markers=anomaly_markers,
            ohlc_data=ohlc_data,
            log_returns_data=price_history,
            upper_threshold=upper_threshold,
            lower_threshold=lower_threshold
        )
