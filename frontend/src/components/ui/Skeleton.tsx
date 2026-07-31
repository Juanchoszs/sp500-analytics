interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-surface-hover rounded ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonChart({ className = "" }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-surface-hover rounded ${className}`}
      role="status"
      aria-label="Loading chart"
    />
  );
}