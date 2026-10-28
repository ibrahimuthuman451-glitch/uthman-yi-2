import { cn } from "@/lib/utils";

/**
 * Product image.
 *
 * A plain <img> is used deliberately: product photography will be hosted on an
 * approved storage provider later, and the Next image optimiser is not allowed
 * to fetch arbitrary remote hosts. Images that have not been supplied fall back
 * to a neutral, clearly-marked placeholder rather than a fake product photo.
 */
export function ProductMedia({
  src,
  alt,
  name,
  className,
  sizes = "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw",
}: {
  src: string | null;
  alt: string | null;
  name: string;
  className?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see component docs
      <img
        src={src}
        alt={alt || name}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-50 via-white to-brand-50 text-navy-300",
        className,
      )}
      role="img"
      aria-label={`${name} - product photo pending`}
    >
      <span aria-hidden="true" className="font-display text-3xl font-extrabold text-brand-200">
        {initial}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wide">Photo pending</span>
    </div>
  );
}
