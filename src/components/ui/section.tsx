import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "surface" | "navy";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20 lg:py-24",
        tone === "surface" && "bg-surface",
        tone === "navy" && "bg-navy-950 text-white",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  light,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className={cn("eyebrow", light && "text-brand-300")}>{eyebrow}</p>
        ) : null}
        <h2
          className={cn(
            "mt-3 text-2xl font-bold leading-tight sm:text-3xl lg:text-[2.15rem]",
            light ? "text-white" : "text-navy-900",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("mt-3 text-base leading-7", light ? "text-navy-200" : "text-muted")}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
