from datetime import date
from typing import Any

from app.domain.model.market import (
    OptionQuote,
    StrikeExposure,
    ExposureReport,
)
from app.providers.base import OptionsChain


class MarketMapper:
    """Mapper for converting between domain models and external data structures."""
    
    @staticmethod
    def options_chain_to_exposure_report(
        chain: OptionsChain,
        expiration: date,
        spot_price: float,
        strikes_data: list[StrikeExposure],
        net_gamma_exposure: float,
        net_delta_exposure: float,
        net_vega_exposure: float,
        call_wall: float | None,
        put_wall: float | None,
        gamma_wall: float | None,
        zero_gamma: float | None,
        max_pain: float | None,
        put_call_oi_ratio: float,
        put_call_volume_ratio: float,
        high_liquidity_strikes: list[float],
        pinning_probability: dict,
    ) -> ExposureReport:
        """Convert options chain and computed data to ExposureReport domain model."""
        return ExposureReport(
            underlying=chain.ticker if hasattr(chain, 'ticker') else "UNKNOWN",
            expiration=expiration,
            spot_price=spot_price,
            strikes=strikes_data,
            net_gamma_exposure=net_gamma_exposure,
            net_delta_exposure=net_delta_exposure,
            net_vega_exposure=net_vega_exposure,
            call_wall=call_wall,
            put_wall=put_wall,
            gamma_wall=gamma_wall,
            zero_gamma=zero_gamma,
            max_pain=max_pain,
            put_call_oi_ratio=put_call_oi_ratio,
            put_call_volume_ratio=put_call_volume_ratio,
            high_liquidity_strikes=high_liquidity_strikes,
            pinning_probability=pinning_probability,
        )
    
    @staticmethod
    def option_quote_to_domain(quote: Any) -> OptionQuote:
        """Convert external option quote to domain model."""
        return OptionQuote(
            strike=quote.strike,
            bid=quote.bid,
            ask=quote.ask,
            last_price=quote.last_price,
            volume=quote.volume,
            open_interest=quote.open_interest,
            implied_volatility=quote.implied_volatility,
            contract_type=quote.contract_type,
            in_the_money=quote.in_the_money,
        )
    
    @staticmethod
    def exposure_report_to_dict(report: ExposureReport) -> dict[str, Any]:
        """Convert ExposureReport domain model to dictionary for API responses."""
        return {
            "ticker": report.underlying,
            "expiration": report.expiration,
            "spot_price": report.spot_price,
            "net_gamma_exposure": report.net_gamma_exposure,
            "net_delta_exposure": report.net_delta_exposure,
            "net_vega_exposure": report.net_vega_exposure,
            "call_wall": report.call_wall,
            "put_wall": report.put_wall,
            "gamma_wall": report.gamma_wall,
            "zero_gamma": report.zero_gamma,
            "max_pain": report.max_pain,
            "put_call_oi_ratio": report.put_call_oi_ratio,
            "put_call_volume_ratio": report.put_call_volume_ratio,
            "high_liquidity_strikes": report.high_liquidity_strikes,
            "pinning_probability": report.pinning_probability,
            "strikes": [
                {
                    "strike": s.strike,
                    "call_oi": s.call_oi,
                    "put_oi": s.put_oi,
                    "call_volume": s.call_volume,
                    "put_volume": s.put_volume,
                    "call_gamma": s.call_gamma,
                    "put_gamma": s.put_gamma,
                    "call_delta": s.call_delta,
                    "put_delta": s.put_delta,
                    "call_vega": s.call_vega,
                    "put_vega": s.put_vega,
                    "gamma_exposure": s.gamma_exposure,
                    "delta_exposure": s.delta_exposure,
                    "vega_exposure": s.vega_exposure,
                }
                for s in report.strikes
            ],
        }
