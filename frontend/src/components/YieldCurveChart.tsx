import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { ColorType } from 'lightweight-charts';

interface YieldCurveProps {
  data: {
    maturity: string;
    rate: number;
  }[];
}

export function YieldCurveChart({ data }: YieldCurveProps) {
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
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    const series = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 3,
      lineStyle: 2,
    });

    seriesRef.current = series;

    const maturityMap: { [key: string]: number } = {
      '3M': 0.25,
      '2Y': 2,
      '5Y': 5,
      '10Y': 10,
      '30Y': 30,
    };

    const chartData = data.map((d) => ({
      time: maturityMap[d.maturity] as any,
      value: d.rate,
    }));

    series.setData(chartData);

    const normalSeries = chart.addLineSeries({
      color: '#64748b',
      lineWidth: 1,
      lineStyle: 1,
    });

    const normalData = [
      { time: 0.25 as any, value: 5.0 },
      { time: 2 as any, value: 4.5 },
      { time: 5 as any, value: 4.2 },
      { time: 10 as any, value: 4.0 },
      { time: 30 as any, value: 4.2 },
    ];

    normalSeries.setData(normalData);

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
        <span style={{ color: '#2979FF' }}>● Actual</span>
        <span style={{ color: '#757575', marginLeft: '10px' }}>● Normal</span>
      </div>
    </div>
  );
}
