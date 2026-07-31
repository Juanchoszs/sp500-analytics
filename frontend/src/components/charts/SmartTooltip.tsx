import { useEffect, useRef, useState } from 'react';

interface SmartTooltipProps {
  children: React.ReactNode;
  active?: boolean;
  coordinate?: { x: number; y: number };
}

export default function SmartTooltip({ children, active, coordinate }: SmartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (active && coordinate && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let x = coordinate.x;
      let y = coordinate.y;

      // Prevent horizontal overflow
      if (x + rect.width > windowWidth - 20) {
        x = windowWidth - rect.width - 20;
      }
      if (x < 20) {
        x = 20;
      }

      // Prevent vertical overflow
      if (y + rect.height > windowHeight - 20) {
        y = windowHeight - rect.height - 20;
      }
      if (y < 20) {
        y = 20;
      }

      setPosition({ top: y, left: x });
    }
  }, [active, coordinate]);

  if (!active) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>
  );
}