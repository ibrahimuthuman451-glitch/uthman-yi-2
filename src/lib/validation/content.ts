import { z } from "zod";

export const serviceFormSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(120),
  slug: z.string().trim().max(80).optional().default(""),
  summary: z.string().trim().min(10, "Write a short summary").max(300),
  description: z.string().trim().min(20, "Write a fuller description").max(4000),
  benefits: z.string().trim().max(4000).optional().default(""),
  deliverables: z.string().trim().max(4000).optional().default(""),
  isPublished: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional().default(0),
});

export const softwareProductFormSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  slug: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().min(5, "Write a short tagline").max(200),
  summary: z.string().trim().min(20, "Write a short summary").max(400),
  description: z.string().trim().min(20, "Write a description").max(8000),
  status: z.enum(["UPCOMING", "IN_DEVELOPMENT", "TESTING", "LIVE"]),
  statusNote: z.string().trim().max(400).optional().default(""),
  audience: z.string().trim().max(2000).optional().default(""),
  features: z.string().trim().max(6000).optional().default(""),
  demoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default("")
    .refine(
      (value) => !value || /^https:\/\//i.test(value) || value.startsWith("/"),
      "Enter an https:// URL or a path starting with /",
    ),
  ctaLabel: z.string().trim().max(80).optional().default("Request early access"),
  isPublished: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional().default(0),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #2148dd")
    .optional()
    .default("#2148dd"),
});

/**
 * Feature rows are edited as newline-delimited text in the admin form using the
 * format: `STATUS | Title | Description`. This keeps the form simple while
 * still validating enum values server-side.
 */
export function parseFeatureRows(
  raw: string,
): { title: string; description: string; status: "LIVE" | "EXPERIMENTAL" | "PLANNED" }[] {
  const rows: {
    title: string;
    description: string;
    status: "LIVE" | "EXPERIMENTAL" | "PLANNED";
  }[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((part) => part.trim());
    if (parts.length < 2) continue;
    const statusRaw = parts[0].toUpperCase().replace(/\s+/g, "_");
    const status =
      statusRaw === "LIVE" || statusRaw === "EXPERIMENTAL" || statusRaw === "PLANNED"
        ? statusRaw
        : "PLANNED";
    const title = parts[1];
    const description = parts.slice(2).join(" | ");
    if (!title) continue;
    rows.push({ title: title.slice(0, 120), description: description.slice(0, 400), status });
    if (rows.length >= 12) break;
  }

  return rows;
}

export function formatFeatureRows(features: unknown): string {
  if (!Array.isArray(features)) return "";
  return features
    .map((feature) => {
      if (!feature || typeof feature !== "object") return "";
      const item = feature as { status?: string; title?: string; description?: string };
      return `${item.status ?? "PLANNED"} | ${item.title ?? ""} | ${item.description ?? ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Splits newline-delimited text into a clean string array. */
export function parseLineList(raw: string, max = 20): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max)
    .map((line) => line.slice(0, 300));
}

/** Splits "Label: Value" lines into structured specifications. */
export function parseSpecifications(
  raw: string,
): { label: string; value: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      const index = line.indexOf(":");
      if (index === -1) return { label: "Detail", value: line.slice(0, 300) };
      return {
        label: line.slice(0, index).trim().slice(0, 80) || "Detail",
        value: line.slice(index + 1).trim().slice(0, 300),
      };
    })
    .filter((spec) => spec.value.length > 0);
}

export function formatSpecifications(specifications: unknown): string {
  if (!Array.isArray(specifications)) return "";
  return specifications
    .map((spec) => {
      if (!spec || typeof spec !== "object") return "";
      const item = spec as { label?: string; value?: string };
      return `${item.label ?? ""}: ${item.value ?? ""}`;
    })
    .filter((line) => line.trim().length > 2)
    .join("\n");
}
