/**
 * Price line overlay component for ^GSPC price
 * Displays real-time price updates with cyan line
 */

import { useEffect, useRef } from 'react';
import { Application, Graphics, Text } from 'pixi.js';
import { GAMMA_COLORS, CHART_DIMENSIONS } from '../config/colors';

interface Props {
  price: number;
  previousPrice?: number;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
}

export default function PriceLineOverlay({
  price,
  previousPrice,
  width,
  height,
  marginTop,
  marginBottom,
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
      renderPriceLine(app);
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
      renderPriceLine(appRef.current);
    }
  }, [price, previousPrice]);
  
  const renderPriceLine = (app: Application) => {
    app.stage.removeChildren();
    
    // Calculate Y position (price would need to be mapped to chart coordinates)
    // For now, we'll use a simple linear mapping
    const minPrice = previousPrice ? Math.min(price, previousPrice) * 0.99 : price * 0.99;
    const maxPrice = previousPrice ? Math.max(price, previousPrice) * 1.01 : price * 1.01;
    const priceRange = maxPrice - minPrice;
    
    const padding = { top: marginTop, bottom: marginBottom };
    const chartHeight = height - padding.top - padding.bottom;
    
    const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    
    // Draw price line
    const line = new Graphics();
    const hexColor = parseInt(GAMMA_COLORS.spot.replace('#', '0x'), 16);
    
    line.setStrokeStyle({ width: CHART_DIMENSIONS.lineThickness, color: hexColor, alpha: 1 });
    // PixiJS v8+ uses different dash syntax
    // line.setDash([4, 4]);
    
    line.moveTo(0, y);
    line.lineTo(width, y);
    app.stage.addChild(line);
    
    // Draw price label
    const label = new Text({
      text: `$${price.toFixed(2)}`,
      style: {
        fontSize: CHART_DIMENSIONS.fontSize,
        fill: GAMMA_COLORS.spot,
        fontFamily: 'IBM Plex Mono, monospace',
        fontWeight: 'bold',
      },
    });
    label.x = 5;
    label.y = y - 15;
    app.stage.addChild(label);
    
    // Draw previous price if available
    if (previousPrice) {
      const prevY = padding.top + chartHeight - ((previousPrice - minPrice) / priceRange) * chartHeight;
      
      const prevLine = new Graphics();
      const prevColor = parseInt(GAMMA_COLORS.previousClose.replace('#', '0x'), 16);
      
      prevLine.setStrokeStyle({ width: 1, color: prevColor, alpha: 0.5 });
      // PixiJS v8+ uses different dash syntax
      // prevLine.setDash([3, 3]);
      
      prevLine.moveTo(0, prevY);
      prevLine.lineTo(width, prevY);
      app.stage.addChild(prevLine);
      
      const prevLabel = new Text({
        text: `Prev: $${previousPrice.toFixed(2)}`,
        style: {
          fontSize: CHART_DIMENSIONS.fontSize - 1,
          fill: GAMMA_COLORS.previousClose,
          fontFamily: 'IBM Plex Mono, monospace',
        },
      });
      prevLabel.x = width - 80;
      prevLabel.y = prevY - 12;
      app.stage.addChild(prevLabel);
    }
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
