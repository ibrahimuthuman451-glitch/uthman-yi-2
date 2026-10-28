"use client";

import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-navy-200", className)}>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-l-xl text-navy-700 hover:bg-navy-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-r-xl text-navy-700 hover:bg-navy-50 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}
