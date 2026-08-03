/**
 * Horizontal levels component for key gamma levels
 * Displays Zero Gamma, Major Positive/Negative, Spot, Previous Close, VWAP
 */

import { useEffect, useRef } from 'react';
import { Application, Graphics, Text } from 'pixi.js';
import { GAMMA_COLORS, CHART_DIMENSIONS, LINE_STYLES } from '../config/colors';

interface Props {
  zeroGamma: number | null;
  majorPositiveGamma: number | null;
  majorNegativeGamma: number | null;
  spotPrice: number;
  previousClose?: number;
  vwap?: number;
  strikes: Array<{ strike: number }>;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export default function HorizontalLevels({
  zeroGamma,
  majorPositiveGamma,
  majorNegativeGamma,
  spotPrice,
  previousClose,
  vwap,
  strikes,
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
      renderLevels(app);
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
      renderLevels(appRef.current);
    }
  }, [zeroGamma, majorPositiveGamma, majorNegativeGamma, spotPrice, previousClose, vwap, strikes]);
  
  const renderLevels = (app: Application) => {
    app.stage.removeChildren();
    
    const padding = { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate bar height and positions
    const barHeight = Math.min(20, chartHeight / strikes.length);
    const barGap = 2;
    
    // Define levels to draw
    const levels = [
      { value: zeroGamma, color: GAMMA_COLORS.zeroGamma, label: 'Zero Gamma', style: LINE_STYLES.zeroGamma },
      { value: majorPositiveGamma, color: GAMMA_COLORS.majorPositive, label: 'Major Positive', style: LINE_STYLES.majorPositive },
      { value: majorNegativeGamma, color: GAMMA_COLORS.majorNegative, label: 'Major Negative', style: LINE_STYLES.majorNegative },
      { value: spotPrice, color: GAMMA_COLORS.spot, label: 'Spot', style: LINE_STYLES.spot },
      { value: previousClose, color: GAMMA_COLORS.previousClose, label: 'Prev Close', style: LINE_STYLES.previousClose },
      { value: vwap, color: GAMMA_COLORS.vwap, label: 'VWAP', style: LINE_STYLES.vwap },
    ];
    
    // Draw each level
    levels.forEach(level => {
      if (!level.value) return;
      
      // Find Y position based on strike
      const strikeIndex = strikes.findIndex(s => s.strike === level.value);
      if (strikeIndex === -1) return;
      
      const y = padding.top + strikeIndex * (barHeight + barGap) + barHeight / 2;
      
      // Parse dash array
      const dashArray = level.style.dashArray.split(' ').map(Number);
      
      // Draw line
      const line = new Graphics();
      const hexColor = parseInt(level.color.replace('#', '0x'), 16);
      
      line.setStrokeStyle({ 
        width: level.style.width, 
        color: hexColor, 
        alpha: 0.8 
      });
      // PixiJS v8+ uses different dash syntax
      // line.setDash(dashArray);
      
      line.moveTo(padding.left, y);
      line.lineTo(padding.left + chartWidth, y);
      app.stage.addChild(line);
      
      // Draw label
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
      app.stage.addChild(label);
      
      // Draw value label on right side
      const valueLabel = new Text({
        text: `$${level.value.toFixed(2)}`,
        style: {
          fontSize: CHART_DIMENSIONS.fontSize - 1,
          fill: level.color,
          fontFamily: 'IBM Plex Mono, monospace',
        },
      });
      valueLabel.x = padding.left + chartWidth - 5;
      valueLabel.y = y - 12;
      valueLabel.anchor.set(1, 0);
      app.stage.addChild(valueLabel);
    });
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
