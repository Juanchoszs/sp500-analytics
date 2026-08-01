import { X } from "lucide-react";
import type { ReactNode } from "react";

interface WidgetProps {
  id: string;
  title: string;
  children: ReactNode;
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

export default function Widget({ id, title, children, onRemove, isRemovable = true }: WidgetProps) {
  return (
    <div className="bg-surface/30 border border-border rounded-lg p-4 relative group">
      {isRemovable && onRemove && (
        <button
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/20 text-dim/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
}
