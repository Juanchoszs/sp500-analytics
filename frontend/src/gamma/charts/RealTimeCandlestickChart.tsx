/**
 * Working candlestick chart with 30 candles
 * Uses the same simple approach that worked with 3 candles
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface Props {
  symbol?: string;
  height?: number;
}

export default function RealTimeCandlestickChart({
  symbol = '^GSPC',
  height = 400,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');

  // Generate 30 realistic candles
  const generateData = (): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const now = Date.now();
    const basePrice = 4500;
    
    for (let i = 30; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const randomWalk = (Math.random() - 0.5) * 15;
      const price = basePrice + randomWalk - (i * 0.3);
      
      const volatility = 3 + Math.random() * 8;
      const open = price;
      const close = price + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      
      data.push({
        time: (timestamp / 1000) as Time,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
      });
    }
    
    return data;
  };

  useEffect(() => {
    setStatus('Creating chart...');
    
    try {
      if (!containerRef.current) {
        setStatus('ERROR: No container');
        return;
      }

      console.log('Creating chart...');
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: height,
        layout: {
          background: { color: '#0a0e17' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
          horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
        },
        timeScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      console.log('Adding series...');
      const series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      });

      console.log('Generating data...');
      const data = generateData();
      console.log(`Generated ${data.length} candles`);

      console.log('Setting data...');
      series.setData(data);
      setStatus(`SUCCESS: Chart with ${data.length} candles`);

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && chart) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error('Chart error:', error);
      setStatus('ERROR: ' + String(error));
    }
  }, [height]);

  return (
    <div className="relative">
      <div className="text-sm font-mono mb-2 text-dim/70">Status: {status}</div>
      <div ref={containerRef} style={{ height }} className="bg-secondary/20 border border-border" />
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 rounded px-2 py-1">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-[10px] font-mono text-yellow-500">SIMULATED DATA</span>
      </div>
    </div>
  );
}