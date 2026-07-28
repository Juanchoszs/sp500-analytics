from datetime import date
from typing import List, Optional, Tuple
from app.config import settings
from app.greeks.black_scholes import compute_greeks
from app.domain.model.market import OptionQuote, StrikeExposure, ExposureReport, MaxPainResult
from app.providers.base import OptionsChain  # Wait let's adjust

CONTRACT_MULTIPLIER = 100


def _years_to_expiry(expiration: date, today: date) -> float:
    days = (expiration - today).days
    return max(days, 0.5) / 365.0


def _strike_with_max(strikes: List[StrikeExposure], key_fn) -> Optional[float]:
    if not strikes:
        return None
    best = max(strikes, key=key_fn)
    return best.strike if key_fn(best) != 0 else None


def _compute_max_pain(all_strikes, calls_by_strike, puts_by_strike) -> Optional[float]:
    if not all_strikes:
        return None
    best_strike, best_payout = None, float("inf")
    for candidate in all_strikes:
        payout = 0.0
        for K, call in calls_by_strike.items():
            intrinsic = max(0.0, candidate - K)
            payout += intrinsic * call.open_interest
        for K, put in puts_by_strike.items():
            intrinsic = max(0.0, K - candidate)
            payout += intrinsic * put.open_interest
        if payout < best_payout:
            best_payout, best_strike = payout, candidate
    return best_strike


def _estimate_zero_gamma(chain: OptionsChain, T: float, r: float, q: float) -> Optional[float]:
    if T <= 0:
        return None
    calls_by_strike = {c.strike: c for c in chain.calls}
    puts_by_strike = {p.strike: p for p in chain.puts}
    all_strikes = sorted(set(calls_by_strike) | set(puts_by_strike))
    if not all_strikes:
        return None
    lo, hi = chain.spot_price * 0.85, chain.spot_price * 1.15
    steps = 60
    prev_sign = None
    prev_price = None
    for i in range(steps + 1):
        hypothetical_spot = lo + (hi - lo) * i / steps
        net = 0.0
        for K in all_strikes:
            call = calls_by_strike.get(K)
            put = puts_by_strike.get(K)
            if call and call.implied_volatility > 0:
                g = compute_greeks(hypothetical_spot, K, T, r, q, call.implied_volatility, "call")
                net += g.gamma * call.open_interest * CONTRACT_MULTIPLIER * hypothetical_spot ** 2 * 0.01
            if put and put.implied_volatility > 0:
                g = compute_greeks(hypothetical_spot, K, T, r, q, put.implied_volatility, "put")
                net -= g.gamma * put.open_interest * CONTRACT_MULTIPLIER * hypothetical_spot ** 2 * 0.01
        sign = net >= 0
        if prev_sign is not None and sign != prev_sign:
            return round((prev_price + hypothetical_spot) / 2, 2)
        prev_sign, prev_price = sign, hypothetical_spot
    return None


def _high_liquidity_strikes(strikes: List[StrikeExposure], top_n: int = 5) -> List[float]:
    ranked = sorted(strikes, key=lambda s: s.call_oi + s.put_oi + s.call_volume + s.put_volume, reverse=True)
    return [s.strike for s in ranked[:top_n]]


def _pinning_probabilities(strikes: List[StrikeExposure], spot: float, window_pct: float = 0.03) -> dict:
    window = [s for s in strikes if abs(s.strike - spot) / spot <= window_pct]
    if not window:
        return {}
    max_oi = max((s.call_oi + s.put_oi) for s in window) or 1
    return {str(s.strike): round((s.call_oi + s.put_oi) / max_oi, 3) for s in window}


class MarketAnalyzerService:
    @staticmethod
    def build_exposure_report(chain: OptionsChain, as_of: date) -> ExposureReport:
        T = _years_to_expiry(chain.expiration, as_of)
        r = settings.risk_free_rate
        q = settings.dividend_yield_spy
        S = chain.spot_price
        calls_by_strike = {c.strike: c for c in chain.calls}
        puts_by_strike = {p.strike: p for p in chain.puts}
        all_strikes = sorted(set(calls_by_strike) | set(puts_by_strike))
        strikes_out: List[StrikeExposure] = []
        net_gex = net_dex = net_vex = 0.0

        for K in all_strikes:
            call = calls_by_strike.get(K)
            put = puts_by_strike.get(K)
            c_gamma = c_delta = c_vega = 0.0
            p_gamma = p_delta = p_vega = 0.0

            if call is not None and call.implied_volatility > 0 and T > 0:
                g = compute_greeks(S, K, T, r, q, call.implied_volatility, "call")
                c_gamma, c_delta, c_vega = g.gamma, g.delta, g.vega
            if put is not None and put.implied_volatility > 0 and T > 0:
                g = compute_greeks(S, K, T, r, q, put.implied_volatility, "put")
                p_gamma, p_delta, p_vega = g.gamma, g.delta, g.vega

            call_oi = call.open_interest if call else 0
            put_oi = put.open_interest if put else 0
            call_vol = call.volume if call else 0
            put_vol = put.volume if put else 0

            gamma_exp = (c_gamma * call_oi - p_gamma * put_oi) * CONTRACT_MULTIPLIER * S * S * 0.01
            delta_exp = -(c_delta * call_oi + p_delta * put_oi) * CONTRACT_MULTIPLIER * S
            vega_exp = (c_vega * call_oi + p_vega * put_oi) * CONTRACT_MULTIPLIER
            net_gex += gamma_exp
            net_dex += delta_exp
            net_vex += vega_exp

            strikes_out.append(
                StrikeExposure(
                    strike=K, call_oi=call_oi, put_oi=put_oi,
                    call_volume=call_vol, put_volume=put_vol,
                    call_gamma=c_gamma, put_gamma=p_gamma,
                    call_delta=c_delta, put_delta=p_delta,
                    call_vega=c_vega, put_vega=p_vega,
                    gamma_exposure=gamma_exp, delta_exposure=delta_exp,
                    vega_exposure=vega_exp
                )
            )

        call_wall = _strike_with_max(strikes_out, lambda s: s.call_gamma * s.call_oi)
        put_wall = _strike_with_max(strikes_out, lambda s: s.put_gamma * s.put_oi)
        gamma_wall = _strike_with_max(strikes_out, lambda s: abs(s.gamma_exposure))
        zero_gamma = _estimate_zero_gamma(chain, T, r, q)
        max_pain = _compute_max_pain(all_strikes, calls_by_strike, puts_by_strike)
        total_call_oi = sum(s.call_oi for s in strikes_out)
        total_put_oi = sum(s.put_oi for s in strikes_out)
        total_call_vol = sum(s.call_volume for s in strikes_out)
        total_put_vol = sum(s.put_volume for s in strikes_out)
        pc_oi_ratio = (total_put_oi / total_call_oi) if total_call_oi else 0.0
        pc_vol_ratio = (total_put_vol / total_call_vol) if total_call_vol else 0.0
        high_liq = _high_liquidity_strikes(strikes_out)
        pinning = _pinning_probabilities(strikes_out, S)

        return ExposureReport(
            underlying=chain.underlying, expiration=chain.expiration, spot_price=S, strikes=strikes_out,
            net_gamma_exposure=net_gex, net_delta_exposure=net_dex,
            net_vega_exposure=net_vex, call_wall=call_wall,
            put_wall=put_wall, gamma_wall=gamma_wall, zero_gamma=zero_gamma,
            max_pain=max_pain, put_call_oi_ratio=pc_oi_ratio,
            put_call_volume_ratio=pc_vol_ratio,
            high_liquidity_strikes=high_liq, pinning_probability=pinning
        )

    @staticmethod
    def build_max_pain_report(chain: OptionsChain, as_of: date) -> MaxPainResult:
        exposure_report = MarketAnalyzerService.build_exposure_report(chain, as_of)
        distance_pct = None
        if exposure_report.max_pain:
            distance_pct = ((exposure_report.spot_price - exposure_report.max_pain) / exposure_report.spot_price) * 100
        return MaxPainResult(
            ticker=exposure_report.underlying,
            expiration=exposure_report.expiration,
            max_pain=exposure_report.max_pain,
            spot_price=exposure_report.spot_price,
            distance_pct=distance_pct
        )
