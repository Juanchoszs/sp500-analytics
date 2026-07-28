from datetime import date, datetime, timezone
import math
from typing import Any
import yfinance as yf
from app.cache import cached
from app.config import settings
from app.providers.base import DataProvider, OptionQuote, OptionsChain


class YahooFinanceAdapter(DataProvider):
    USER_AGENT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    def _make_ticker(self, ticker: str):
        t = yf.Ticker(ticker)
        t._data.user_agent_headers = self.USER_AGENT_HEADERS
        return t

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        if value is None:
            return default
        try:
            result = float(value)
            return default if math.isnan(result) else result
        except (TypeError, ValueError):
            return default

    def _safe_int(self, value: Any, default: int = 0) -> int:
        if value is None:
            return default
        try:
            return int(value)
        except (TypeError, ValueError, OverflowError):
            return default

    def get_spot_price(self, ticker: str) -> float:
        def _fetch() -> float:
            t = self._make_ticker(ticker)
            price = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
            if price is None:
                hist = t.history(period="1d", interval="1m")
                if hist.empty:
                    raise ValueError(f"No se pudo obtener precio para {ticker}")
                price = float(hist["Close"].iloc[-1])
            return float(price)

        return cached(f"price:{ticker}", settings.cache_ttl_price, _fetch)

    def get_expirations(self, ticker: str) -> list[date]:
        def _fetch() -> list[date]:
            t = self._make_ticker(ticker)
            raw = t.options
            return [datetime.strptime(d, "%Y-%m-%d").date() for d in raw]

        return cached(f"expirations:{ticker}", settings.cache_ttl_expirations, _fetch)

    def get_options_chain(self, ticker: str, expiration: date) -> OptionsChain:
        exp_str = expiration.strftime("%Y-%m-%d")

        def _fetch() -> OptionsChain:
            t = self._make_ticker(ticker)
            chain = t.option_chain(exp_str)
            spot = self.get_spot_price(ticker)

            def to_quotes(df, contract_type: str) -> list[OptionQuote]:
                out = []
                for _, row in df.iterrows():
                    out.append(
                        OptionQuote(
                            strike=self._safe_float(row.get("strike", 0.0)),
                            bid=self._safe_float(row.get("bid", 0.0)),
                            ask=self._safe_float(row.get("ask", 0.0)),
                            last_price=self._safe_float(row.get("lastPrice", 0.0)),
                            volume=self._safe_int(row.get("volume", 0) or 0),
                            open_interest=self._safe_int(row.get("openInterest", 0) or 0),
                            implied_volatility=self._safe_float(row.get("impliedVolatility", 0.0)),
                            contract_type=contract_type,
                            in_the_money=bool(row.get("inTheMoney", False)),
                        )
                    )
                return out

            calls_data = chain.calls
            puts_data = chain.puts

            # Validación post-fetch: cadena vacía o spot inválido son datos corruptos
            if calls_data.empty and puts_data.empty:
                raise ValueError(f"La cadena de opciones de {ticker} para {exp_str} está vacía.")
            if spot <= 0:
                raise ValueError(f"Precio spot inválido para {ticker}: {spot}")

            return OptionsChain(
                underlying=ticker,
                expiration=expiration,
                spot_price=spot,
                calls=to_quotes(calls_data, "call"),
                puts=to_quotes(puts_data, "put"),
                fetched_at=datetime.now(timezone.utc).isoformat(),
            )

        return cached(
            f"chain:{ticker}:{exp_str}", settings.cache_ttl_options_chain, _fetch
        )

    def get_vix_data(self) -> dict[str, Any]:
        def _fetch() -> dict[str, Any]:
            t = self._make_ticker("^VIX")
            current = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
            hist = t.history(period="1y")
            if hist.empty:
                raise ValueError("No se pudo obtener datos del VIX")
            closes = hist["Close"].dropna().tolist()
            if current is None and closes:
                current = closes[-1]
            return {
                "current": float(current) if current is not None else 15.0,
                "history": [float(c) for c in closes]
            }
        return cached("vix_data", 900, _fetch)

    def get_index_price(self, index_ticker: str) -> float:
        """Obtiene el precio de un índice (ej: ^GSPC, ^NDX)"""
        def _fetch() -> float:
            t = self._make_ticker(index_ticker)
            price = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
            if price is None:
                hist = t.history(period="1d", interval="1m")
                if hist.empty:
                    raise ValueError(f"No se pudo obtener precio para {index_ticker}")
                price = float(hist["Close"].iloc[-1])
            return float(price)
        return cached(f"index_price:{index_ticker}", settings.cache_ttl_price, _fetch)

    def get_yield_data(self) -> dict[str, Any]:
        """Obtiene rendimientos del tesoro de EE.UU. e indicadores de crédito mediante Yahoo Finance."""
        def _fetch() -> dict[str, Any]:
            tickers = {
                "irx": "^IRX",  # 13-week Treasury Bill rate
                "fvx": "^FVX",  # 5-year Treasury yield
                "tnx": "^TNX",  # 10-year Treasury yield
                "tyx": "^TYX",  # 30-year Treasury yield
                "hyg": "HYG",   # High Yield Corporate Bond ETF
                "lqd": "LQD",   # Investment Grade Corporate Bond ETF
                "tlt": "TLT",   # 20+ Year Treasury Bond ETF
            }
            
            data = {}
            for name, symbol in tickers.items():
                try:
                    t = self._make_ticker(symbol)
                    price = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
                    if price is None:
                        hist = t.history(period="5d")
                        if not hist.empty:
                            price = float(hist["Close"].iloc[-1])
                    data[name] = float(price) if price is not None else None
                except Exception:
                    data[name] = None

            # Fallbacks por si Yahoo falla temporalmente en algún ticker
            data.setdefault("irx", 4.50)
            data.setdefault("fvx", 4.10)
            data.setdefault("tnx", 4.25)
            data.setdefault("tyx", 4.45)
            data.setdefault("hyg", 76.50)
            data.setdefault("lqd", 108.20)
            data.setdefault("tlt", 92.10)

            return data

        # Cache por 15 minutos (900 segundos) ya que los datos de bonos cambian lentamente durante el día
        return cached("yield_market_data", 900, _fetch)

