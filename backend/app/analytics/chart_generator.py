"""Generación de gráficos optimizados para impresión (matplotlib, no capturas de pantalla)."""
from __future__ import annotations

import io
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

# Paleta institucional profesional - colores sobrios y corporativos
COLORS = {
    "call": "#1B5E20",  # Verde oscuro institucional para calls
    "put": "#B71C1C",  # Rojo oscuro institucional para puts
    "net": "#0D47A1",  # Azul corporativo oscuro para net
    "spot": "#263238",  # Gris oscuro para spot
    "zero_gamma": "#E65100",  # Naranja oscuro para zero gamma
    "bg": "#FFFFFF",  # Fondo blanco para mejor legibilidad
    "grid": "#ECEFF1",  # Grid muy suave
    "text": "#37474F",  # Texto gris oscuro para contraste suave
    "muted": "#78909C",  # Texto secundario
    "highlight": "#C62828",  # Para anomalías o alertas
    "call_light": "#4CAF50",  # Verde más claro para acentos
    "put_light": "#EF5350",  # Rojo más claro para acentos
}


def _filter_around_spot(strikes: list[dict], spot: float, window: int = 35) -> list[dict]:
    sorted_strikes = sorted(strikes, key=lambda s: s["strike"])
    if not sorted_strikes:
        return []
    idx = min(range(len(sorted_strikes)), key=lambda i: abs(sorted_strikes[i]["strike"] - spot))
    lo = max(0, idx - window)
    hi = min(len(sorted_strikes), idx + window + 1)
    return sorted_strikes[lo:hi]


def _format_axis(value: float, _pos: int) -> str:
    abs_v = abs(value)
    if abs_v >= 1_000_000_000:
        return f"{value / 1_000_000_000:.1f}B"
    if abs_v >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if abs_v >= 1_000:
        return f"{value / 1_000:.1f}K"
    return f"{value:.0f}"


def _base_figure(title: str, xlabel: str, ylabel: str):
    fig, ax = plt.subplots(figsize=(12, 5.3), dpi=220, facecolor=COLORS["bg"])
    ax.set_facecolor(COLORS["bg"])
    ax.set_title(title, fontsize=14, fontweight="bold", color=COLORS["text"], pad=12)
    ax.set_xlabel(xlabel, fontsize=10, color=COLORS["muted"])
    ax.set_ylabel(ylabel, fontsize=10, color=COLORS["muted"])
    ax.grid(True, axis="y", color=COLORS["grid"], linewidth=0.6, alpha=0.8)
    ax.grid(True, axis="x", color=COLORS["grid"], linewidth=0.4, alpha=0.45)
    ax.set_axisbelow(True)
    ax.margins(x=0.02)
    ax.tick_params(colors=COLORS["muted"], labelsize=9)
    for spine in ax.spines.values():
        spine.set_color(COLORS["grid"])
        spine.set_linewidth(0.8)
    return fig, ax


def _fig_to_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=COLORS["bg"], edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def generate_gex_chart(exposure: dict[str, Any]) -> bytes:
    strikes = _filter_around_spot(exposure["strikes"], exposure["spot_price"])
    x = [s["strike"] for s in strikes]
    gex = [s["gamma_exposure"] for s in strikes]
    colors = [COLORS["call"] if v >= 0 else COLORS["put"] for v in gex]

    fig, ax = _base_figure("Gamma Exposure por Strike", "Strike", "GEX ($ por 1% movimiento)")
    ax.bar(x, gex, width=0.8, color=colors, alpha=0.75, edgecolor="#37474F", linewidth=0.5)
    ax.axvline(exposure["spot_price"], color=COLORS["text"], linestyle="--", linewidth=1.2, alpha=0.7, label="Spot")
    if exposure.get("zero_gamma"):
        ax.axvline(exposure["zero_gamma"], color=COLORS["zero_gamma"], linestyle="-.", linewidth=1.5, label="Gamma Flip")
    if exposure.get("call_wall"):
        ax.axvline(exposure["call_wall"], color=COLORS["call"], linestyle=":", linewidth=1.2, alpha=0.8, label="Call Wall")
    if exposure.get("put_wall"):
        ax.axvline(exposure["put_wall"], color=COLORS["put"], linestyle=":", linewidth=1.2, alpha=0.8, label="Put Wall")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_axis))
    ax.legend(fontsize=8, loc="upper right", framealpha=0.95, shadow=True)
    return _fig_to_bytes(fig)


def generate_dex_chart(exposure: dict[str, Any]) -> bytes:
    strikes = _filter_around_spot(exposure["strikes"], exposure["spot_price"])
    x = np.array([s["strike"] for s in strikes])
    raw_call_dex = np.array([s["call_delta_exposure"] for s in strikes])
    raw_put_dex = np.array([s["put_delta_exposure"] for s in strikes])
    call_dex = -np.minimum(raw_call_dex, 0)
    put_dex = np.maximum(raw_put_dex, 0)
    net_dex = raw_call_dex + raw_put_dex

    fig, ax = _base_figure("Delta Exposure por Strike (Convención Dealer)", "Strike", "DEX ($ por 1 pt movimiento)")
    width = 0.35
    ax.bar(x - width / 2, call_dex, width=width, color=COLORS["call"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Call Delta")
    ax.bar(x + width / 2, put_dex, width=width, color=COLORS["put"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Put Delta")
    ax.plot(x, net_dex, color=COLORS["net"], linewidth=2.5, marker="o", markersize=4, label="Net Delta", zorder=5)
    ax.axhline(0, color=COLORS["muted"], linewidth=1.0, alpha=0.6)
    ax.axvline(exposure["spot_price"], color=COLORS["text"], linestyle="--", linewidth=1.2, alpha=0.7, label="Spot")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_axis))
    ax.legend(fontsize=8, loc="upper right", ncol=2, framealpha=0.95, shadow=True)
    return _fig_to_bytes(fig)


def generate_oi_chart(exposure: dict[str, Any]) -> bytes:
    strikes = _filter_around_spot(exposure["strikes"], exposure["spot_price"])
    x = np.array([s["strike"] for s in strikes])
    call_oi = np.array([s["call_oi"] for s in strikes])
    put_oi = np.array([-s["put_oi"] for s in strikes])
    total = call_oi + np.abs(put_oi)

    fig, ax = _base_figure("Open Interest por Strike", "Strike", "Contratos (Puts invertidos)")
    width = 0.35
    ax.bar(x - width / 2, call_oi, width=width, color=COLORS["call"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Call OI")
    ax.bar(x + width / 2, put_oi, width=width, color=COLORS["put"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Put OI")
    ax.plot(x, total, color=COLORS["net"], linewidth=2.5, linestyle="--", label="Total OI", zorder=5)
    ax.axhline(0, color=COLORS["muted"], linewidth=1.0, alpha=0.6)
    ax.axvline(exposure["spot_price"], color=COLORS["text"], linestyle="--", linewidth=1.2, alpha=0.7, label="Spot")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_axis))
    ax.legend(fontsize=8, loc="upper right", framealpha=0.95, shadow=True)
    return _fig_to_bytes(fig)


def generate_volume_chart(exposure: dict[str, Any]) -> bytes:
    strikes = _filter_around_spot(exposure["strikes"], exposure["spot_price"])
    x = np.array([s["strike"] for s in strikes])
    call_vol = np.array([s["call_volume"] for s in strikes])
    put_vol = np.array([-s["put_volume"] for s in strikes])
    net_vol = call_vol + put_vol

    fig, ax = _base_figure("Volumen por Strike", "Strike", "Contratos (Puts invertidos)")
    width = 0.35
    ax.bar(x - width / 2, call_vol, width=width, color=COLORS["call"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Call Volume")
    ax.bar(x + width / 2, put_vol, width=width, color=COLORS["put"], alpha=0.7, edgecolor="#37474F", linewidth=0.5, label="Put Volume")
    ax.plot(x, net_vol, color=COLORS["net"], linewidth=2.5, marker="o", markersize=4, label="Net Volume", zorder=5)
    ax.axhline(0, color=COLORS["muted"], linewidth=1.0, alpha=0.6)
    ax.axvline(exposure["spot_price"], color=COLORS["text"], linestyle="--", linewidth=1.2, alpha=0.7, label="Spot")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(_format_axis))
    ax.legend(fontsize=8, loc="upper right", framealpha=0.95, shadow=True)
    return _fig_to_bytes(fig)
