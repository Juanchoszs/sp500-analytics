import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineData, Time } from "lightweight-charts";

interface LogReturnsChartProps {
  logReturnsData: Array<{
    timestamp: string;
    price: number;
    log_return: number;
  }>;
  upperThreshold: Array<{
    timestamp: string;
    value: number;
  }>;
  lowerThreshold: Array<{
    timestamp: string;
    value: number;
  }>;
  anomalyMarkers: Array<{
    timestamp: string;
    price: number;
    log_return: number;
    z_score: number;
    severity: string;
    type: string;
    upper_threshold: number;
    lower_threshold: number;
  }>;
}

export function LogReturnsChart({ logReturnsData, upperThreshold, lowerThreshold, anomalyMarkers }: LogReturnsChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const logReturnsSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || logReturnsData.length === 0) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: '#0f172a' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        rightPriceScale: {
          borderColor: '#334155',
        },
        timeScale: {
          borderColor: '#334155',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Log returns line
      const logReturnsSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 1,
        title: 'Log Returns',
      });

      logReturnsSeriesRef.current = logReturnsSeries;

      const logReturnsDataPoints: LineData[] = logReturnsData.map((point) => ({
        time: (new Date(point.timestamp).getTime() / 1000) as Time,
        value: point.log_return,
      }));

      logReturnsSeries.setData(logReturnsDataPoints);

      // Upper threshold line
      const upperLine = chart.addLineSeries({
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Upper Threshold (+2σ)',
      });

      upperLineRef.current = upperLine;

      if (upperThreshold.length > 0) {
        const upperData: LineData[] = upperThreshold.map((point) => ({
          time: (new Date(point.timestamp).getTime() / 1000) as Time,
          value: point.value,
        }));
        upperLine.setData(upperData);
      }

      // Lower threshold line
      const lowerLine = chart.addLineSeries({
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Lower Threshold (-2σ)',
      });

      lowerLineRef.current = lowerLine;

      if (lowerThreshold.length > 0) {
        const lowerData: LineData[] = lowerThreshold.map((point) => ({
          time: (new Date(point.timestamp).getTime() / 1000) as Time,
          value: point.value,
        }));
        lowerLine.setData(lowerData);
      }

      // Add markers for anomalies with arrows
      const markers = anomalyMarkers.slice(0, 15).map((marker) => {
        const time = (new Date(marker.timestamp).getTime() / 1000) as Time;
        const color = marker.severity === 'Critical' ? '#ef4444' : 
                     marker.severity === 'High' ? '#f97316' :
                     marker.severity === 'Medium' ? '#eab308' : '#22c55e';
        
        return {
          time,
          position: marker.type === 'above' ? 'aboveBar' as const : 'belowBar' as const,
          color,
          shape: 'arrowUp' as const,
          size: 10,
          text: `${marker.z_score.toFixed(1)}σ`,
        };
      });

      logReturnsSeries.setMarkers(markers);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating chart:', error);
      return () => {};
    }
  }, [logReturnsData, upperThreshold, lowerThreshold, anomalyMarkers]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full" />
      {anomalyMarkers.length > 0 && (
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/10 p-3 max-w-xs">
          <div className="text-[10px] font-semibold text-slate-300 font-mono uppercase tracking-wider mb-2">
            Anomalías: {anomalyMarkers.length}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {anomalyMarkers.slice(0, 8).map((marker, idx) => (
              <div key={idx} className="p-2 bg-slate-800/50 rounded border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {marker.type === 'above' ? '↑' : '↓'}
                  </span>
                  <span className="text-[10px] font-mono text-white">
                    {new Date(marker.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                  <div className="text-slate-400">Log Return:</div>
                  <div className="text-white">{marker.log_return.toFixed(6)}</div>
                  <div className="text-slate-400">Z-Score:</div>
                  <div className="text-white">{marker.z_score.toFixed(2)}σ</div>
                </div>
              </div>
            ))}
            {anomalyMarkers.length > 8 && (
              <div className="text-[10px] text-slate-500 font-mono text-center">
                +{anomalyMarkers.length - 8} más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
