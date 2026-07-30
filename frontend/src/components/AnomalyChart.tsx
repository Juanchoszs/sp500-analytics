import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickData, LineData, Time } from "lightweight-charts";

interface AnomalyChartProps {
  ohlcData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
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

export function AnomalyChart({ ohlcData, anomalyMarkers }: AnomalyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || ohlcData.length === 0) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
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

      // Candlestick series for OHLC data
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      candlestickSeriesRef.current = candlestickSeries;

      const candlestickData: CandlestickData[] = ohlcData.map((point) => ({
        time: (new Date(point.timestamp).getTime() / 1000) as Time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }));

      candlestickSeries.setData(candlestickData);

      // Add very small text markers for anomalies (90% smaller than before)
      const markers = anomalyMarkers.slice(0, 10).map((marker) => {
        const time = (new Date(marker.timestamp).getTime() / 1000) as Time;
        const color = marker.severity === 'Critical' ? '#ef4444' : 
                     marker.severity === 'High' ? '#f97316' :
                     marker.severity === 'Medium' ? '#eab308' : '#22c55e';
        
        return {
          time,
          position: marker.type === 'above' ? 'aboveBar' as const : 'belowBar' as const,
          color,
          shape: 'circle' as const,
          size: 1,
          text: `${marker.z_score.toFixed(1)}σ`,
        };
      });

      candlestickSeries.setMarkers(markers);

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
  }, [ohlcData, anomalyMarkers]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full" />
      {anomalyMarkers.length > 0 && (
        <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm rounded border border-white/10 p-2 max-w-[200px]">
          <div className="text-[8px] font-semibold text-slate-300 font-mono uppercase tracking-wider mb-1">
            Anomalías: {anomalyMarkers.length}
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {anomalyMarkers.slice(0, 5).map((marker, idx) => (
              <div key={idx} className="p-1 bg-slate-800/50 rounded border border-white/5">
                <div className="flex items-center gap-1">
                  <span className="text-xs">
                    {marker.type === 'above' ? '↑' : '↓'}
                  </span>
                  <span className="text-[8px] font-mono text-white">
                    {new Date(marker.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[8px] font-mono text-white ml-auto">
                    {marker.z_score.toFixed(1)}σ
                  </span>
                </div>
              </div>
            ))}
            {anomalyMarkers.length > 5 && (
              <div className="text-[8px] text-slate-500 font-mono text-center">
                +{anomalyMarkers.length - 5} más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
