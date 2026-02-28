import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PillProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function Pill({ label, onRemove, className }: PillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors",
        "bg-secondary text-secondary-foreground",
        className
      )}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}