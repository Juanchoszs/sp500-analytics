/**
 * Lookback dots component for historical gamma comparison
 * Displays blue dots at different time intervals (5min, 10min, 15min, 30min)
 */

import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import type { GammaSnapshot, StrikeGammaData } from '../types/gammaTypes';
import { GAMMA_COLORS, CHART_DIMENSIONS, HISTORICAL_INTERVALS } from '../config/chartConfig';

interface Props {
  currentSnapshot: GammaSnapshot;
  historicalSnapshots: GammaSnapshot[];
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export default function LookbackDots({
  currentSnapshot,
  historicalSnapshots,
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const initPixi = async () => {
      const app = new Application();
      await app.init({
        canvas: canvasRef.current!,
        width,
        height,
        backgroundColor: 0x000000, // Transparent
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      
      appRef.current = app;
      renderDots(app);
    };
    
    initPixi();
    
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [width, height]);
  
  useEffect(() => {
    if (appRef.current) {
      renderDots(appRef.current);
    }
  }, [currentSnapshot, historicalSnapshots]);
  
  const renderDots = (app: Application) => {
    app.stage.removeChildren();
    
    const container = new Container();
    app.stage.addChild(container);
    
    const padding = { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate bar height and positions
    const barHeight = Math.min(20, chartHeight / currentSnapshot.strikes.length);
    const barGap = 2;
    
    // Get historical snapshots at different intervals
    const historicalData = HISTORICAL_INTERVALS.map((interval: number) => {
      const targetTime = new Date(currentSnapshot.timestamp.getTime() - interval * 60 * 1000);
      const snapshot = historicalSnapshots.find(
        s => Math.abs(s.timestamp.getTime() - targetTime.getTime()) < 60000 // Within 1 minute
      ) || null;
      return { interval, snapshot };
    });
    
    // Draw dots for each strike
    currentSnapshot.strikes.forEach((strike, strikeIndex) => {
      const y = padding.top + strikeIndex * (barHeight + barGap) + barHeight / 2;
      const zeroX = padding.left + chartWidth / 2;
      
      // Calculate max gamma for scaling
      const maxAbsGamma = Math.max(
        ...currentSnapshot.strikes.map(s => Math.abs(s.netGamma)),
        1
      );
      
      // Draw current bar (solid)
      const currentBarWidth = (Math.abs(strike.netGamma) / maxAbsGamma) * (chartWidth / 2);
      const currentBar = new Graphics();
      const currentColor = parseInt(
        (strike.netGamma >= 0 ? GAMMA_COLORS.positive : GAMMA_COLORS.negative).replace('#', '0x'),
        16
      );
      
      if (strike.netGamma >= 0) {
        currentBar.beginPath();
        currentBar.roundRect(zeroX, y - barHeight / 2, currentBarWidth, barHeight, CHART_DIMENSIONS.barCornerRadius);
        currentBar.fill({ color: currentColor, alpha: 1 });
      } else {
        currentBar.beginPath();
        currentBar.roundRect(zeroX - currentBarWidth, y - barHeight / 2, currentBarWidth, barHeight, CHART_DIMENSIONS.barCornerRadius);
        currentBar.fill({ color: currentColor, alpha: 1 });
      }
      container.addChild(currentBar);
      
      // Draw historical dots
      historicalData.forEach((data: { interval: number; snapshot: GammaSnapshot | null }, dataIndex: number) => {
        if (!data.snapshot) return;
        
        const historicalStrike = data.snapshot.strikes.find((s: StrikeGammaData) => s.strike === strike.strike);
        if (!historicalStrike) return;
        
        const historicalBarWidth = (Math.abs(historicalStrike.netGamma) / maxAbsGamma) * (chartWidth / 2);
        const dotX = historicalStrike.netGamma >= 0
          ? zeroX + historicalBarWidth
          : zeroX - historicalBarWidth;
        
        const dot = new Graphics();
        const dotColor = parseInt(GAMMA_COLORS.dots.replace('#', '0x'), 16);
        
        // Calculate alpha based on how far back in time (more transparent for older data)
        const alpha = 0.8 - (dataIndex * 0.15);
        
        dot.beginPath();
        dot.circle(dotX, y, CHART_DIMENSIONS.dotRadius);
        dot.fill({ color: dotColor, alpha });
        dot.setStrokeStyle({ width: 1, color: dotColor, alpha: alpha + 0.2 });
        container.addChild(dot);
      });
    });
    
    // Draw legend
    drawLegend(container, width, height, historicalData);
  };
  
  const drawLegend = (
    container: Container,
    canvasWidth: number,
    canvasHeight: number,
    historicalData: Array<{ interval: number; snapshot: GammaSnapshot | null }>
  ) => {
    const legendX = canvasWidth - 120;
    const legendY = 10;
    
    // Current (solid bar)
    const currentLabel = new Graphics();
    const currentColor = parseInt(GAMMA_COLORS.positive.replace('#', '0x'), 16);
    currentLabel.beginPath();
    currentLabel.roundRect(legendX, legendY, 20, 8, 2);
    currentLabel.fill({ color: currentColor, alpha: 1 });
    container.addChild(currentLabel);
    
    // Historical dots
    historicalData.forEach((data: { interval: number; snapshot: GammaSnapshot | null }, index: number) => {
      const y = legendY + 15 + index * 12;
      const dot = new Graphics();
      const dotColor = parseInt(GAMMA_COLORS.dots.replace('#', '0x'), 16);
      const alpha = 0.8 - (index * 0.15);
      
      dot.beginPath();
      dot.circle(legendX + 10, y + 4, CHART_DIMENSIONS.dotRadius);
      dot.fill({ color: dotColor, alpha });
      dot.setStrokeStyle({ width: 1, color: dotColor, alpha: alpha + 0.2 });
      container.addChild(dot);
    });
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
