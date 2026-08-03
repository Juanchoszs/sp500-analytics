/**
 * Yahoo Finance data provider for ^GSPC 1-minute candles
 */

import type { PriceSnapshot } from '../types/gammaTypes';
import { roundToMinute } from '../utils/timeSync';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export class YahooFinanceProvider {
  private static instance: YahooFinanceProvider;
  
  private constructor() {}
  
  static getInstance(): YahooFinanceProvider {
    if (!YahooFinanceProvider.instance) {
      YahooFinanceProvider.instance = new YahooFinanceProvider();
    }
    return YahooFinanceProvider.instance;
  }
  
  /**
   * Fetch 1-minute candle data for ^GSPC
   */
  async fetchMinuteCandles(
    symbol: string = '^GSPC',
    interval: string = '1m',
    range: string = '1d'
  ): Promise<PriceSnapshot[]> {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=${interval}&range=${range}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      
      if (!result || !result.timestamp || !result.indicators) {
        throw new Error('Invalid data format from Yahoo Finance');
      }
      
      const timestamps = result.timestamp;
      const ohlc = result.indicators.quote[0];
      
      const snapshots: PriceSnapshot[] = timestamps
        .map((ts: number, index: number) => ({
          timestamp: roundToMinute(new Date(ts * 1000)),
          open: ohlc.open[index],
          high: ohlc.high[index],
          low: ohlc.low[index],
          close: ohlc.close[index],
          volume: ohlc.volume[index],
        }))
        .filter(
          (snapshot: PriceSnapshot) =>
            snapshot.open !== null &&
            snapshot.high !== null &&
            snapshot.low !== null &&
            snapshot.close !== null
        );
      
      return snapshots;
    } catch (error) {
      console.error('Error fetching Yahoo Finance data:', error);
      throw error;
    }
  }
  
  /**
   * Fetch current price for a symbol
   */
  async fetchCurrentPrice(symbol: string = '^GSPC'): Promise<number> {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1m&range=1d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      
      if (!meta || !meta.regularMarketPrice) {
        throw new Error('Invalid price data from Yahoo Finance');
      }
      
      return meta.regularMarketPrice;
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }
  
  /**
   * Fetch previous close price
   */
  async fetchPreviousClose(symbol: string = '^GSPC'): Promise<number> {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1d&range=5d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      
      if (!meta || !meta.previousClose) {
        throw new Error('Invalid previous close data from Yahoo Finance');
      }
      
      return meta.previousClose;
    } catch (error) {
      console.error('Error fetching previous close:', error);
      throw error;
    }
  }
}
