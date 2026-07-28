import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { marketApi } from "../api/client";
import type {
  ExposureResponse, ExpirationsResponse, HeatmapResponse, MaxPainResponse, OptionsChainResponse,
  IntelligenceResponse,
} from "../types";
import GammaProfileChart from "./GammaProfileChart";
import StrikeGammaChart from "./StrikeGammaChart";
import IVSmileChart from "./IVSmileChart";
import LevelsPanel from "./LevelsPanel";
import MaxPainCard from "./MaxPainCard";
import IntelligenceReport from "./IntelligenceReport";
import MarketQAPanel from "./MarketQAPanel";
import DeltaExposureChart from "./DeltaExposureChart";
import VolumeChart from "./VolumeChart";
import OpenInterestChart from "./OpenInterestChart";

import HedgingStrengthPanel from "./HedgingStrengthPanel";
import YieldAnomalyPanel from "./YieldAnomalyPanel";

const TICKER = "SPY";

export default function Dashboard() {
  const [expirations, setExpirations] = useState<ExpirationsResponse | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | undefined>(undefined);
  const [chain, setChain] = useState<OptionsChainResponse | null>(null);
  const [exposure, setExposure] = useState<ExposureResponse | null>(null);
  const [maxPain, setMaxPain] = useState<MaxPainResponse | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<any | null>(null);

  useEffect(() => {
    marketApi.getExpirations({ ticker: TICKER }).then(setExpirations).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const fetchPrice = () => {
      marketApi.getPrice({ ticker: TICKER }).then(setPriceInfo).catch(() => {});
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      setError(null);
      const params = { ticker: TICKER, expiration: selectedExp };
      Promise.all([
        marketApi.getOptions(params),
        marketApi.getExposure(params),
        marketApi.getMaxPain(params),
        marketApi.getIntelligence(params),
      ])
        .then(([c, e, mp, intel]) => {
          setChain(c); setExposure(e); setMaxPain(mp); setIntelligence(intel);
        })
        .catch((err) => setError(err?.message ?? "Error al consultar la API"))
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [selectedExp]);

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      const blob = await marketApi.downloadReport({ ticker: TICKER, expiration: selectedExp });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `SPY_Intelligence_${selectedExp || "Nearest"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error(e);
      alert("Error al descargar el reporte.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
      <header className="border-b border-white/10 bg-slate-950/70 px-6 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="metric-pill mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Institutional options structure
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              S&P 500 Market Intelligence
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Follow the flow of risk, positioning and volatility with a cleaner view of the market’s most important levels.
            </p>

            {priceInfo && (
              <div className="mt-3 flex items-baseline gap-3 text-sm text-slate-300">
                <div className="font-mono">{TICKER} {Number(priceInfo.price).toFixed(2)}</div>
                {priceInfo.index_price && (
                  <div className="text-slate-400">
                    · S&P 500 {Number(priceInfo.index_price).toFixed(2)}
                    {priceInfo.index_ratio ? ` (ratio ${Number(priceInfo.index_ratio).toFixed(2)})` : null}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadWord}
              disabled={isDownloading || !intelligence}
              className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar reporte Word
            </button>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Exp</label>
              <select
                className="bg-transparent text-sm text-slate-100 outline-none"
                value={selectedExp ?? ""}
                onChange={(e) => setSelectedExp(e.target.value || undefined)}
              >
                <option value="">Nearest</option>
                {expirations?.expirations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-6 border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 rounded-lg font-mono flex items-center gap-3 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Error consultando la API: {error}. Verifica que el backend esté corriendo en :8000.
        </div>
      )}

      {loading && !exposure && (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
          <div className="animate-pulse text-sm uppercase tracking-[0.24em] text-slate-400">Analizando estructura...</div>
        </div>
      )}

      {exposure && chain && maxPain && intelligence && (
        <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6 py-6 lg:py-8">
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <IntelligenceReport intelligence={intelligence} />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="surface-panel surface-panel--accent">
                <LevelsPanel exposure={exposure} />
              </div>
              <div className="surface-panel surface-panel--warm">
                <MaxPainCard maxPain={maxPain} />
              </div>
            </div>
          </section>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-2 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur">
            <MarketQAPanel selectedExpiration={selectedExp} />
          </div>

          <section className="grid grid-cols-1 gap-6">
            <HedgingStrengthPanel selectedExpiration={selectedExp} />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="card h-full">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Gamma</p>
                    <h3 className="text-lg font-semibold text-white">Gamma profile</h3>
                  </div>
                  <div className="metric-pill">Spot-driven structure</div>
                </div>
                <GammaProfileChart
                  strikes={exposure.strikes}
                  spotPrice={exposure.spot_price}
                  callWall={exposure.call_wall}
                  putWall={exposure.put_wall}
                  zeroGamma={exposure.zero_gamma}
                />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="card h-full">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Gamma</p>
                    <h3 className="text-lg font-semibold text-white">Strike sensitivity</h3>
                  </div>
                  <div className="metric-pill">Pin risk</div>
                </div>
                <StrikeGammaChart
                  strikes={exposure.strikes}
                  spotPrice={exposure.spot_price}
                  callWall={exposure.call_wall}
                  putWall={exposure.put_wall}
                  zeroGamma={exposure.zero_gamma}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Delta</p>
                  <h3 className="text-lg font-semibold text-white">Delta exposure flow</h3>
                </div>
                <div className="metric-pill">Dex & hedge pressure</div>
              </div>
              <DeltaExposureChart
                strikes={exposure.strikes}
                spotPrice={exposure.spot_price}
                netDeltaExposure={exposure.net_delta_exposure}
                callDexWall={exposure.call_wall}
                putDexWall={exposure.put_wall}
              />
            </div>
            <div className="card">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Flow</p>
                  <h3 className="text-lg font-semibold text-white">Volume balance</h3>
                </div>
                <div className="metric-pill">Put/call rhythm</div>
              </div>
              <VolumeChart
                strikes={exposure.strikes}
                spotPrice={exposure.spot_price}
                putCallVolumeRatio={exposure.put_call_volume_ratio}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="card h-full">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Liquidity</p>
                    <h3 className="text-lg font-semibold text-white">Open interest structure</h3>
                  </div>
                  <div className="metric-pill">Liquidity zones</div>
                </div>
                <OpenInterestChart
                  strikes={exposure.strikes}
                  spotPrice={exposure.spot_price}
                  putCallOiRatio={exposure.put_call_oi_ratio}
                />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="card h-full">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Volatility</p>
                    <h3 className="text-lg font-semibold text-white">IV smile</h3>
                  </div>
                  <div className="metric-pill">Skew read</div>
                </div>
                <IVSmileChart calls={chain.calls} puts={chain.puts} />
              </div>
            </div>
          </section>

          <YieldAnomalyPanel />
        </main>
      )}
    </div>
  );
}
