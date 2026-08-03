/**
 * Canvas-based Gamma Histogram component using PixiJS
 * Displays horizontal bars with positive gamma extending RIGHT and negative extending LEFT
 */

import { useEffect, useRef, useState } from 'react';
import { Application, Graphics, Text, Container } from 'pixi.js';
import type { StrikeGammaData } from '../types/gammaTypes';
import { GAMMA_COLORS, CHART_DIMENSIONS, ANIMATION_CONFIG } from '../config/colors';

interface Props {
  strikes: StrikeGammaData[];
  spotPrice: number;
  zeroGamma: number | null;
  callWall: number | null;
  putWall: number | null;
  width: number;
  height: number;
  onStrikeHover?: (strike: StrikeGammaData | null) => void;
}

export default function GammaHistogram({
  strikes,
  spotPrice,
  zeroGamma,
  callWall,
  putWall,
  width,
  height,
  onStrikeHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const [hoveredStrike, setHoveredStrike] = useState<StrikeGammaData | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log('[GammaHistogram] Starting PixiJS initialization...');
    
    // Initialize PixiJS application
    const initPixi = async () => {
      try {
        console.log('[GammaHistogram] Creating Application...');
        const app = new Application();
        console.log('[GammaHistogram] Initializing app with config...');
        await app.init({
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: GAMMA_COLORS.background,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        
        console.log('[GammaHistogram] PixiJS app initialized successfully');
        appRef.current = app;
        setInitialized(true);
        
        // Render if we have data, otherwise show empty state
        if (strikes && strikes.length > 0) {
          console.log('[GammaHistogram] Rendering histogram with', strikes.length, 'strikes');
          renderHistogram(app);
        } else {
          console.log('[GammaHistogram] No strikes to render, skipping render');
        }
      } catch (error) {
        console.error('[GammaHistogram] Error initializing PixiJS:', error);
        setInitialized(true); // Set initialized anyway to avoid hang
      }
    };
    
    initPixi();
    
    return () => {
      if (appRef.current) {
        try {
          appRef.current.destroy(true);
        } catch (error) {
          console.error('[GammaHistogram] Error destroying PixiJS:', error);
        }
        appRef.current = null;
      }
    };
  }, [width, height]);
  
  useEffect(() => {
    if (appRef.current && strikes && strikes.length > 0) {
      renderHistogram(appRef.current);
    }
  }, [strikes, spotPrice, zeroGamma, callWall, putWall]);
  
  const renderHistogram = (app: Application) => {
    // Clear existing graphics
    app.stage.removeChildren();
    
    const container = new Container();
    app.stage.addChild(container);
    
    // Calculate dimensions
    const padding = { top: 40, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate max gamma for scaling
    const maxAbsGamma = Math.max(...strikes.map(s => Math.abs(s.netGamma)), 1);
    const zeroX = padding.left + chartWidth / 2;
    
    // Draw grid lines
    drawGrid(container, padding, chartWidth, chartHeight, zeroX);
    
    // Draw zero axis
    const zeroAxis = new Graphics();
    zeroAxis.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.3 });
    zeroAxis.moveTo(padding.left, padding.top);
    zeroAxis.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    container.addChild(zeroAxis);
    
    // Draw horizontal levels
    drawHorizontalLevels(container, padding, chartHeight, zeroGamma, callWall, putWall, spotPrice);
    
    // Draw strike bars
    const barHeight = Math.min(20, chartHeight / strikes.length);
    const barGap = 2;
    
    strikes.forEach((strike, index) => {
      const y = padding.top + index * (barHeight + barGap);
      const barWidth = (Math.abs(strike.netGamma) / maxAbsGamma) * (chartWidth / 2);
      
      const bar = new Graphics();
      
      // Color based on gamma sign
      const color = strike.netGamma >= 0 ? GAMMA_COLORS.positive : GAMMA_COLORS.negative;
      const hexColor = parseInt(color.replace('#', '0x'), 16);
      
      // Draw bar extending from zero axis
      if (strike.netGamma >= 0) {
        bar.beginPath();
        bar.roundRect(zeroX, y, barWidth, barHeight, CHART_DIMENSIONS.barCornerRadius);
        bar.fill({ color: hexColor, alpha: 0.8 });
      } else {
        bar.beginPath();
        bar.roundRect(zeroX - barWidth, y, barWidth, barHeight, CHART_DIMENSIONS.barCornerRadius);
        bar.fill({ color: hexColor, alpha: 0.8 });
      }
      
      // Add hover interaction
      bar.eventMode = 'static';
      bar.cursor = 'pointer';
      
      bar.on('pointerover', () => {
        bar.alpha = 1;
        setHoveredStrike(strike);
        onStrikeHover?.(strike);
      });
      
      bar.on('pointerout', () => {
        bar.alpha = 0.8;
        setHoveredStrike(null);
        onStrikeHover?.(null);
      });
      
      container.addChild(bar);
      
      // Draw strike label on left
      const label = new Text({
        text: `$${strike.strike.toFixed(0)}`,
        style: {
          fontSize: CHART_DIMENSIONS.fontSize,
          fill: GAMMA_COLORS.text,
          fontFamily: 'IBM Plex Mono, monospace',
        },
      });
      label.x = padding.left - 10;
      label.y = y + barHeight / 2;
      label.anchor.set(1, 0.5);
      container.addChild(label);
      
      // Draw net gamma value on right
      const valueLabel = new Text({
        text: formatCompact(strike.netGamma),
        style: {
          fontSize: CHART_DIMENSIONS.fontSize,
          fill: strike.netGamma >= 0 ? GAMMA_COLORS.positive : GAMMA_COLORS.negative,
          fontFamily: 'IBM Plex Mono, monospace',
        },
      });
      valueLabel.x = padding.left + chartWidth + 10;
      valueLabel.y = y + barHeight / 2;
      valueLabel.anchor.set(0, 0.5);
      container.addChild(valueLabel);
    });
  };
  
  const drawGrid = (
    container: Container,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    zeroX: number
  ) => {
    const grid = new Graphics();
    grid.setStrokeStyle({ width: 1, color: parseInt(GAMMA_COLORS.grid.replace('#', '0x'), 16), alpha: 0.5 });
    
    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (chartWidth / 4) * i;
      grid.moveTo(x, padding.top);
      grid.lineTo(x, padding.top + chartHeight);
    }
    
    // Horizontal grid lines
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = padding.top + (chartHeight / horizontalLines) * i;
      grid.moveTo(padding.left, y);
      grid.lineTo(padding.left + chartWidth, y);
    }
    
    container.addChild(grid);
  };
  
  const drawHorizontalLevels = (
    container: Container,
    padding: { top: number; right: number; bottom: number; left: number },
    chartHeight: number,
    zeroGamma: number | null,
    callWall: number | null,
    putWall: number | null,
    spotPrice: number
  ) => {
    const levels = [
      { value: zeroGamma, color: GAMMA_COLORS.zeroGamma, label: 'Zero Gamma' },
      { value: callWall, color: GAMMA_COLORS.callWall, label: 'Call Wall' },
      { value: putWall, color: GAMMA_COLORS.putWall, label: 'Put Wall' },
      { value: spotPrice, color: GAMMA_COLORS.spot, label: 'Spot' },
    ];
    
    levels.forEach(level => {
      if (!level.value) return;
      
      const line = new Graphics();
      const hexColor = parseInt(level.color.replace('#', '0x'), 16);
      
      line.setStrokeStyle({ width: 2, color: hexColor, alpha: 0.8 });
      // PixiJS v8+ uses different dash syntax
      // line.setDash([6, 3]);
      
      // Find Y position based on strike
      const strikeIndex = strikes.findIndex(s => s.strike === level.value);
      if (strikeIndex === -1) return;
      
      const barHeight = Math.min(20, chartHeight / strikes.length);
      const barGap = 2;
      const y = padding.top + strikeIndex * (barHeight + barGap) + barHeight / 2;
      
      line.moveTo(padding.left, y);
      line.lineTo(padding.left + width - padding.left - padding.right, y);
      container.addChild(line);
      
      // Add label
      const label = new Text({
        text: level.label,
        style: {
          fontSize: CHART_DIMENSIONS.fontSize,
          fill: level.color,
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 'bold',
        },
      });
      label.x = padding.left + 5;
      label.y = y - 15;
      container.addChild(label);
    });
  };
  
  const formatCompact = (value: number): string => {
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };
  
  if (!initialized) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-secondary/20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-2" />
          <div className="font-mono text-dim/70 text-xs uppercase tracking-wider">
            Initializing histogram...
          </div>
        </div>
      </div>
    );
  }

  if (!strikes || strikes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-secondary/20">
        <div className="text-center">
          <div className="text-dim/70 text-xs uppercase tracking-wider">
            No strike data available
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
      {hoveredStrike && (
        <div className="absolute top-0 right-0 bg-primary border border-border p-3 rounded-lg shadow-xl font-mono text-xs min-w-[200px] max-w-[300px] z-10">
          <div className="text-foreground font-bold mb-2 pb-2 border-b border-border">
            Strike ${hoveredStrike.strike}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-dim/70">Call GEX:</span>
              <span className="text-bullish">{formatCompact(hoveredStrike.callGex)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Put GEX:</span>
              <span className="text-destructive">{formatCompact(hoveredStrike.putGex)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Net GEX:</span>
              <span className={hoveredStrike.netGex >= 0 ? 'text-bullish' : 'text-destructive'}>
                {formatCompact(hoveredStrike.netGex)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">OI Gamma:</span>
              <span className="text-foreground">{formatCompact(hoveredStrike.openInterestGamma)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Volume Gamma:</span>
              <span className="text-foreground">{formatCompact(hoveredStrike.volumeGamma)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim/70">Timestamp:</span>
              <span className="text-foreground">
                {hoveredStrike.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
