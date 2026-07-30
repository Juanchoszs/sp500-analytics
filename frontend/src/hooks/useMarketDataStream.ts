import { useEffect, useState } from 'react';

interface MarketData {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: string;
}

interface YieldData {
  tnx: number;
  fvx: number;
  tyx: number;
  timestamp: string;
}

export function useMarketDataStream(ticker: string = 'SPY') {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [yieldData, setYieldData] = useState<YieldData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:8000/api/v1/stream/market-data?ticker=${ticker}`
    );

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection error');
    };

    eventSource.addEventListener('price_update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setMarketData(data);
      } catch (e) {
        console.error('Error parsing price update:', e);
      }
    });

    eventSource.addEventListener('yield_update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setYieldData(data);
      } catch (e) {
        console.error('Error parsing yield update:', e);
      }
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.error || 'Unknown error');
      } catch (e) {
        console.error('Error parsing error event:', e);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [ticker]);

  return { marketData, yieldData, connected, error };
}
