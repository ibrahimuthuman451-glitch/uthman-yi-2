import { z } from "zod";

/** Helpers for reading HTML form submissions without trusting any value. */

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Converts Zod issues into a `{ field: [messages] }` map for the UI. */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = result[key] ?? [];
    result[key].push(issue.message);
  }
  return result;
}

/** Optional https URL or a site-relative asset path. */
export const optionalAssetUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .default("")
  .transform((value, ctx) => {
    if (!value) return "";
    if (value.startsWith("/")) return value; // locally hosted asset
    const parsed = z.string().url().safeParse(value);
    if (!parsed.success || !/^https:\/\//i.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an https:// URL or a path starting with /",
      });
      return z.NEVER;
    }
    return value;
  });

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Product name is required").max(160),
    slug: z.string().trim().max(80).optional().default(""),
    sku: z.string().trim().max(60).optional().default(""),
    categoryId: z.string().trim().max(60).optional().default(""),
    shortDescription: z.string().trim().max(300).optional().default(""),
    description: z.string().trim().max(6000).optional().default(""),
    price: z.string().trim().optional().default(""),
    compareAtPrice: z.string().trim().optional().default(""),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000),
    dataStatus: z.enum(["APPROVED", "REFERENCE", "DEMO"]),
    isPublished: z.string().optional(),
    featured: z.string().optional(),
    imageUrl: optionalAssetUrl,
    imageAlt: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((value, ctx) => {
    const price = value.price.replace(/[,\s]/g, "");
    if (price && !/^\d+$/.test(price)) {
      ctx.addIssue({
        path: ["price"],
        code: z.ZodIssueCode.custom,
        message: "Enter a whole number of Rwandan francs, e.g. 650000",
      });
    }
    const compareAt = value.compareAtPrice.replace(/[,\s]/g, "");
    if (compareAt && !/^\d+$/.test(compareAt)) {
      ctx.addIssue({
        path: ["compareAtPrice"],
        code: z.ZodIssueCode.custom,
        message: "Enter a whole number of Rwandan francs, or leave it blank",
      });
    }
    if (value.dataStatus === "APPROVED" && !price) {
      ctx.addIssue({
        path: ["price"],
        code: z.ZodIssueCode.custom,
        message: "An approved listing requires an approved selling price",
      });
    }
  });

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional().default(0),
  isActive: z.string().optional(),
});
