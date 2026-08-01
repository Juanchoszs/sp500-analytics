import { useState, useMemo } from "react";
import { Activity, Target, Shield, AlertTriangle } from "lucide-react";
import type { StrikeExposureOut } from "../types";
import Card from "./ui/Card";

interface Props {
  strikes: StrikeExposureOut[];
  spotPrice: number;
  callWall: number | null;
  putWall: number | null;
  gammaWall: number | null;
  zeroGamma: number | null;
}

interface ZoneData {
  strike: number;
  type: "call_wall" | "put_wall" | "gamma_wall" | "zero_gamma" | "high_liquidity" | "normal";
  intensity: number;
  gammaExposure: number;
  deltaExposure: number;
}

export default function InteractiveZoneHeatmap({ 
  strikes, 
  spotPrice, 
  callWall, 
  putWall, 
  gammaWall, 
  zeroGamma 
}: Props) {
  const [hoveredZone, setHoveredZone] = useState<ZoneData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"intraday" | "daily" | "weekly">("intraday");

  // Procesar datos de zonas
  const zoneData = useMemo(() => {
    const zones: ZoneData[] = [];
    const maxGamma = Math.max(...strikes.map(s => Math.abs(s.gamma_exposure)), 1);
    const maxDelta = Math.max(...strikes.map(s => Math.abs(s.delta_exposure)), 1);

    strikes.forEach((strike) => {
      let type: ZoneData["type"] = "normal";
      let intensity = 0;

      // Detectar zonas especiales
      if (callWall && Math.abs(strike.strike - callWall) < 2) {
        type = "call_wall";
        intensity = 0.9;
      } else if (putWall && Math.abs(strike.strike - putWall) < 2) {
        type = "put_wall";
        intensity = 0.9;
      } else if (gammaWall && Math.abs(strike.strike - gammaWall) < 2) {
        type = "gamma_wall";
        intensity = 0.85;
      } else if (zeroGamma && Math.abs(strike.strike - zeroGamma) < 2) {
        type = "zero_gamma";
        intensity = 0.8;
      } else if (strike.call_oi + strike.put_oi > 50000) {
        type = "high_liquidity";
        intensity = 0.7;
      } else {
        // Calcular intensidad basada en gamma y delta
        const gammaIntensity = Math.abs(strike.gamma_exposure) / maxGamma;
        const deltaIntensity = Math.abs(strike.delta_exposure) / maxDelta;
        intensity = (gammaIntensity + deltaIntensity) / 2;
      }

      zones.push({
        strike: strike.strike,
        type,
        intensity,
        gammaExposure: strike.gamma_exposure,
        deltaExposure: strike.delta_exposure,
      });
    });

    return zones.sort((a, b) => a.strike - b.strike);
  }, [strikes, callWall, putWall, gammaWall, zeroGamma]);

  const getZoneColor = (zone: ZoneData) => {
    switch (zone.type) {
      case "call_wall":
        return "from-green-500 to-green-600";
      case "put_wall":
        return "from-red-500 to-red-600";
      case "gamma_wall":
        return "from-purple-500 to-purple-600";
      case "zero_gamma":
        return "from-yellow-500 to-yellow-600";
      case "high_liquidity":
        return "from-blue-500 to-blue-600";
      default:
        return `from-gray-${400 + Math.floor(zone.intensity * 300)} to-gray-${500 + Math.floor(zone.intensity * 300)}`;
    }
  };

  const getZoneLabel = (zone: ZoneData) => {
    switch (zone.type) {
      case "call_wall":
        return "Call Wall";
      case "put_wall":
        return "Put Wall";
      case "gamma_wall":
        return "Gamma Wall";
      case "zero_gamma":
        return "Zero Gamma";
      case "high_liquidity":
        return "High Liquidity";
      default:
        return "Normal";
    }
  };

  const getZoneIcon = (zone: ZoneData) => {
    switch (zone.type) {
      case "call_wall":
        return <Target className="w-4 h-4" />;
      case "put_wall":
        return <Shield className="w-4 h-4" />;
      case "gamma_wall":
        return <Activity className="w-4 h-4" />;
      case "zero_gamma":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getZoneDescription = (zone: ZoneData) => {
    switch (zone.type) {
      case "call_wall":
        return "Zona de máxima resistencia donde los dealers deben comprar agresivamente. Actúa como techo magnético.";
      case "put_wall":
        return "Zona de máximo soporte donde los dealers deben vender agresivamente. Actúa como suelo definitivo.";
      case "gamma_wall":
        return "Zona de máxima exposición gamma. Cambios dramáticos en comportamiento de hedging.";
      case "zero_gamma":
        return "Punto de inflexión de volatilidad. Transición entre regímenes de estabilidad.";
      case "high_liquidity":
        return "Zona de alta liquidez con excelente capacidad de ejecución.";
      default:
        return "Zona normal con actividad estándar.";
    }
  };

  // Filtrar strikes alrededor del spot para mejor visualización
  const visibleStrikes = zoneData.filter(
    zone => Math.abs(zone.strike - spotPrice) <= 30
  );

  return (
    <Card variant="chart" className="h-[500px]">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-white">Interactive Zone Heatmap</h3>
          <div className="flex gap-2">
            {["intraday", "daily", "weekly"].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf as any)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  selectedTimeframe === tf
                    ? "bg-accent text-white"
                    : "bg-secondary text-dim/70 hover:text-foreground"
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-tertiary uppercase tracking-wider">
          Zonas clave de opciones - {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-green-600" />
          <span className="text-dim/70">Call Wall</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600" />
          <span className="text-dim/70">Put Wall</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-purple-600" />
          <span className="text-dim/70">Gamma Wall</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-500 to-yellow-600" />
          <span className="text-dim/70">Zero Gamma</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
          <span className="text-dim/70">High Liquidity</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="flex-1 flex items-end gap-1 min-h-[300px] p-4 bg-surface/30 rounded-lg">
        {visibleStrikes.map((zone) => (
          <div
            key={zone.strike}
            className="flex-1 relative group cursor-pointer transition-all hover:scale-105"
            onMouseEnter={() => setHoveredZone(zone)}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <div
              className={`w-full rounded-t bg-gradient-to-t ${getZoneColor(zone)} transition-all`}
              style={{ height: `${zone.intensity * 100}%` }}
            />
            <div className="text-[10px] text-dim/60 text-center mt-1 font-mono">
              {zone.strike}
            </div>
            
            {/* Tooltip */}
            {hoveredZone?.strike === zone.strike && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-surface border border-border rounded-lg shadow-xl z-10 w-48 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  {getZoneIcon(zone)}
                  <span className="font-semibold text-white text-sm">
                    {getZoneLabel(zone)}
                  </span>
                </div>
                <div className="text-xs text-dim/70 mb-2">
                  Strike: ${zone.strike}
                </div>
                <div className="text-xs text-dim/70 mb-2">
                  Gamma: ${(zone.gammaExposure / 1000000).toFixed(2)}M
                </div>
                <div className="text-xs text-dim/70 mb-2">
                  Delta: ${(zone.deltaExposure / 1000000).toFixed(2)}M
                </div>
                <div className="text-xs text-dim/70">
                  Intensity: {(zone.intensity * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Spot Line */}
      <div className="relative h-6 mt-2">
        <div
          className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent/50"
          style={{
            left: `${((visibleStrikes[0]?.strike || spotPrice - 30) / (visibleStrikes[visibleStrikes.length - 1]?.strike || spotPrice + 30)) * 100}%`,
            right: `${100 - ((visibleStrikes[visibleStrikes.length - 1]?.strike || spotPrice + 30) / (visibleStrikes[visibleStrikes.length - 1]?.strike || spotPrice + 30)) * 100}%`,
          }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-accent"
          style={{
            left: `${((spotPrice - (visibleStrikes[0]?.strike || spotPrice - 30)) / ((visibleStrikes[visibleStrikes.length - 1]?.strike || spotPrice + 30) - (visibleStrikes[0]?.strike || spotPrice - 30))) * 100}%`,
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
            SPOT
          </div>
        </div>
      </div>

      {/* Zone Info Panel */}
      {hoveredZone && (
        <div className="mt-4 p-4 bg-surface/30 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {getZoneIcon(hoveredZone)}
            <span className="font-semibold text-white">{getZoneLabel(hoveredZone)}</span>
          </div>
          <p className="text-sm text-dim/70">{getZoneDescription(hoveredZone)}</p>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-dim/60">Gamma Exposure</div>
              <div className="text-sm font-mono text-white">
                ${(hoveredZone.gammaExposure / 1000000).toFixed(2)}M
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-dim/60">Delta Exposure</div>
              <div className="text-sm font-mono text-white">
                ${(hoveredZone.deltaExposure / 1000000).toFixed(2)}M
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Call Wall</div>
          <div className="text-sm font-bold text-green-400">
            {callWall ? `$${callWall}` : "N/A"}
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Put Wall</div>
          <div className="text-sm font-bold text-red-400">
            {putWall ? `$${putWall}` : "N/A"}
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Gamma Wall</div>
          <div className="text-sm font-bold text-purple-400">
            {gammaWall ? `$${gammaWall}` : "N/A"}
          </div>
        </div>
        <div className="bg-surface/50 rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-dim/60 mb-1">Zero Gamma</div>
          <div className="text-sm font-bold text-yellow-400">
            {zeroGamma ? `$${zeroGamma}` : "N/A"}
          </div>
        </div>
      </div>
    </Card>
  );
}
