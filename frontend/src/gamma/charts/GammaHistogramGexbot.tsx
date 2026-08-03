/**
 * GEXBOT Classic-style Gamma Histogram
 * Horizontal bars showing Net Gamma per strike
 */

import { useEffect, useRef, useState } from 'react';
import type { StrikeGammaData } from '../types/gammaTypes';

interface Props {
  strikes: StrikeGammaData[];
  spotPrice: number;
  zeroGamma: number | null;
  callWall: number | null;
  putWall: number | null;
  width: number;
  height: number;
}

export default function GammaHistogramGexbot({
  strikes,
  spotPrice,
  zeroGamma,
  callWall,
  putWall,
  width,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || strikes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // Find max gamma for scaling
      const maxGamma = Math.max(...strikes.map(s => Math.abs(s.netGamma)), 1);
      const centerX = width / 2;
      const barHeight = (height - 40) / strikes.length;
      const maxBarWidth = (width / 2) - 40;

      // Draw strikes
      strikes.forEach((strike, index) => {
        const y = 20 + index * barHeight;
        const netGamma = strike.netGamma;
        const barWidth = (Math.abs(netGamma) / maxGamma) * maxBarWidth;

        // Draw bar
        if (netGamma > 0) {
          // Positive - extends RIGHT (green)
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(centerX, y, barWidth, barHeight - 2);
        } else {
          // Negative - extends LEFT (red)
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(centerX - barWidth, y, barWidth, barHeight - 2);
        }

        // Draw strike label (left)
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(strike.strike.toFixed(0), centerX - 10, y + barHeight / 2 + 3);

        // Draw net gamma value (right)
        ctx.textAlign = 'left';
        ctx.fillText(netGamma.toFixed(0), centerX + 10, y + barHeight / 2 + 3);
      });

      // Draw zero axis
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX, height - 10);
      ctx.stroke();

      // Draw horizontal levels
      const levels = [
        { value: spotPrice, color: '#22d3ee', label: 'Spot' },
        { value: zeroGamma, color: '#f59e0b', label: 'Zero Gamma' },
        { value: callWall, color: '#22c55e', label: 'Call Wall' },
        { value: putWall, color: '#ef4444', label: 'Put Wall' },
      ];

      levels.forEach(level => {
        if (level.value) {
          const strikeIndex = strikes.findIndex(s => s.strike >= level.value);
          if (strikeIndex >= 0) {
            const y = 20 + strikeIndex * barHeight;
            ctx.strokeStyle = level.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      });
    };

    draw();
    setIsInitialized(true);
  }, [strikes, spotPrice, zeroGamma, callWall, putWall, width, height]);

  if (!isInitialized || strikes.length === 0) {
    return (
      <div className="flex items-center justify-center bg-secondary/20" style={{ width, height }}>
        <div className="text-dim/70 text-sm">Loading gamma histogram...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} />
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 rounded px-2 py-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[10px] font-mono text-green-500">POSITIVE</span>
        <div className="w-2 h-2 rounded-full bg-red-500 ml-2" />
        <span className="text-[10px] font-mono text-red-500">NEGATIVE</span>
      </div>
    </div>
  );
}