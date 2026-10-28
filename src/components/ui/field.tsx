import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string[] | string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  return (
    <div className={cn("w-full", className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
      {errors.length > 0 ? (
        <p className="field-error" id={`${htmlFor}-error`}>
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("field-input", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("field-input min-h-28", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn("field-input pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-navy-700", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      <span className="leading-5">{label}</span>
    </label>
  );
}
