import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { ColorType } from 'lightweight-charts';

interface CreditSpreadProps {
  data: {
    date: string;
    ratio: number;
  }[];
}

export function CreditSpreadChart({ data }: CreditSpreadProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#334155',
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    const series = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
    });

    seriesRef.current = series;

    const chartData = data.map((d) => ({
      time: d.date as any,
      value: d.ratio,
    }));

    series.setData(chartData);

    const normalLine = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
    });

    const stressedLine = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
    });

    const timeRange = chartData.map((d) => d.time);
    if (timeRange.length > 0) {
      const normalData = timeRange.map((t) => ({ time: t, value: 0.70 }));
      const stressedData = timeRange.map((t) => ({ time: t, value: 0.68 }));
      
      normalLine.setData(normalData);
      stressedLine.setData(stressedData);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div ref={chartContainerRef} style={{ height: '300px' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '12px', color: '#757575' }}>
        <span style={{ color: '#FF9100' }}>● HYG/LQD</span>
        <span style={{ color: '#00C853', marginLeft: '10px' }}>● Normal (0.70)</span>
        <span style={{ color: '#FF1744', marginLeft: '10px' }}>● Stressed (0.68)</span>
      </div>
    </div>
  );
}
