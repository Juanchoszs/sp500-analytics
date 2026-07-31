import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "minimal" | "metric" | "chart" | "narrative";
}

export default function Card({ children, className = "", variant = "minimal" }: CardProps) {
  const baseClasses = "bg-surface";
  
  const variantClasses = {
    minimal: "border border-border",
    metric: "border border-border p-6 min-h-[140px] flex flex-col justify-between",
    chart: "p-6 min-h-[400px]",
    narrative: "border border-border p-6",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}