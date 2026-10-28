import { existsSync } from "node:fs";
import path from "node:path";
import { cn } from "@/lib/utils";

/**
 * Official Uthman IY logo.
 *
 * The owner's original file is used unchanged. Only the height is set in CSS so
 * the browser preserves the file's own aspect ratio; nothing is recoloured,
 * cropped or regenerated. If the file has not been supplied yet, the company
 * name is rendered as plain text - never a substitute logo.
 */
const LOGO_CANDIDATES = [
  "uthman-iy-logo.png",
  "uthman-iy-logo.svg",
  "uthman-iy-logo.webp",
  "uthman-iy-logo.jpg",
];

function findLogoFile(): string | null {
  for (const file of LOGO_CANDIDATES) {
    if (existsSync(path.join(process.cwd(), "public", "brand", file))) return file;
  }
  return null;
}

export function hasOfficialLogo(): boolean {
  return findLogoFile() !== null;
}

/** Public path of the official logo file, or null when it has not been supplied. */
export function getOfficialLogoPath(): string | null {
  const file = findLogoFile();
  return file ? `/brand/${file}` : null;
}

export function Logo({
  variant = "dark",
  className,
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const file = findLogoFile();

  if (!file) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1 font-display text-xl font-extrabold tracking-tight",
          variant === "light" ? "text-white" : "text-navy-900",
          className,
        )}
      >
        Uthman
        <span className={variant === "light" ? "text-brand-300" : "text-brand-600"}>IY</span>
      </span>
    );
  }

  if (variant === "light") {
    // The supplied artwork has a solid white background, so it is placed on a
    // white lockup rather than tinted or cut out: the original file is untouched.
    return (
      <span className={cn("inline-flex items-center rounded-lg bg-white px-2 py-1", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- original file, natural aspect ratio preserved */}
        <img
          src={`/brand/${file}`}
          alt="Uthman IY"
          className="h-7 w-auto object-contain sm:h-8"
          decoding="async"
        />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- original file, natural aspect ratio preserved
    <img
      src={`/brand/${file}`}
      alt="Uthman IY"
      className={cn("w-auto object-contain", "h-7 sm:h-8", className)}
      decoding="async"
    />
  );
}
