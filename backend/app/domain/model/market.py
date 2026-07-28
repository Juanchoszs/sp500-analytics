from dataclasses import dataclass
from datetime import date
from typing import Optional, List


@dataclass(frozen=True)
class OptionQuote:
    strike: float
    bid: float
    ask: float
    last_price: float
    volume: int
    open_interest: int
    implied_volatility: float
    contract_type: str  # "call" or "put"
    in_the_money: bool


@dataclass(frozen=True)
class StrikeExposure:
    strike: float
    call_oi: int
    put_oi: int
    call_volume: int
    put_volume: int
    call_gamma: float
    put_gamma: float
    call_delta: float
    put_delta: float
    call_vega: float
    put_vega: float
    gamma_exposure: float
    delta_exposure: float
    vega_exposure: float


@dataclass(frozen=True)
class ExposureReport:
    underlying: str
    expiration: date
    spot_price: float
    strikes: List[StrikeExposure]
    net_gamma_exposure: float
    net_delta_exposure: float
    net_vega_exposure: float
    call_wall: Optional[float]
    put_wall: Optional[float]
    gamma_wall: Optional[float]
    zero_gamma: Optional[float]
    max_pain: Optional[float]
    put_call_oi_ratio: float
    put_call_volume_ratio: float
    high_liquidity_strikes: List[float]
    pinning_probability: dict


@dataclass(frozen=True)
class MaxPainResult:
    ticker: str
    expiration: date
    max_pain: Optional[float]
    spot_price: float
    distance_pct: Optional[float]


@dataclass(frozen=True)
class GreeksResult:
    ticker: str
    expiration: date
    spot_price: float
    strikes: List[dict]  # Or more precise type


@dataclass(frozen=True)
class HeatmapCell:
    strike: float
    metric_call: float
    metric_put: float


@dataclass(frozen=True)
class HeatmapReport:
    ticker: str
    expiration: date
    metric: str
    cells: List[HeatmapCell]
