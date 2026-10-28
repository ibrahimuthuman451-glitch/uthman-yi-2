import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * Catalogue import/export.
 *
 * The documented JSON format (see docs/CATALOGUE_FORMAT.md) is the contract for
 * moving catalogue data between environments or from an owner-supplied
 * spreadsheet. Import never overwrites an approved price with an empty value
 * and never publishes a listing on its own.
 */

export const importSpecificationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
});

export const importProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(60).optional(),
  categorySlug: z.string().trim().max(80).optional(),
  shortDescription: z.string().trim().max(300).optional(),
  description: z.string().trim().max(6000).optional(),
  specifications: z.array(importSpecificationSchema).max(40).optional(),
  priceRwf: z.number().int().min(0).nullable().optional(),
  compareAtPriceRwf: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(100_000).optional(),
  dataStatus: z.enum(["APPROVED", "REFERENCE", "DEMO"]).optional(),
  isPublished: z.boolean().optional(),
  featured: z.boolean().optional(),
  imageUrl: z.string().trim().max(500).optional(),
  imageAlt: z.string().trim().max(200).optional(),
  referencePriceRwf: z.number().int().min(0).nullable().optional(),
  referenceSource: z.string().trim().max(200).optional(),
  referenceRetrievedAt: z.string().datetime().optional(),
});

export const importPayloadSchema = z.object({
  products: z.array(importProductSchema).min(1).max(500),
});

export type ImportProduct = z.infer<typeof importProductSchema>;

export async function exportCatalogue() {
  const products = await db.product.findMany({
    orderBy: { name: "asc" },
    include: { category: { select: { slug: true } } },
  });

  return {
    exportedAt: new Date().toISOString(),
    currency: "RWF",
    products: products.map((product) => ({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categorySlug: product.category?.slug ?? null,
      shortDescription: product.shortDescription,
      description: product.description,
      specifications: Array.isArray(product.specifications) ? product.specifications : [],
      priceRwf: product.priceRwf,
      compareAtPriceRwf: product.compareAtPriceRwf,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      dataStatus: product.dataStatus,
      isPublished: product.isPublished,
      featured: product.featured,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      referencePriceRwf: product.referencePriceRwf,
      referenceSource: product.referenceSource,
      referenceRetrievedAt: product.referenceRetrievedAt?.toISOString() ?? null,
    })),
  };
}

const CSV_COLUMNS = [
  "sku",
  "name",
  "slug",
  "categorySlug",
  "priceRwf",
  "stock",
  "lowStockThreshold",
  "dataStatus",
  "isPublished",
  "imageUrl",
] as const;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportCatalogueCsv(): Promise<string> {
  const products = await db.product.findMany({
    orderBy: { name: "asc" },
    include: { category: { select: { slug: true } } },
  });

  const lines = [CSV_COLUMNS.join(",")];
  for (const product of products) {
    lines.push(
      [
        product.sku,
        product.name,
        product.slug,
        product.category?.slug,
        product.priceRwf,
        product.stock,
        product.lowStockThreshold,
        product.dataStatus,
        product.isPublished,
        product.imageUrl,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export type ImportSummary = {
  created: number;
  updated: number;
  /** Existing rows whose approved price was left untouched by this import. */
  pricesPreserved: number;
  errors: { index: number; name: string; message: string }[];
};

export type ImportOptions = {
  /**
   * Explicitly allow an import to overwrite approved selling prices.
   * Default false: a routine re-import (for example the weekly price review or
   * `npm run catalogue:apply`) must never undo an administrator's price change.
   */
  updatePrices?: boolean;
};

export async function importCatalogue(
  rawPayload: unknown,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const parsed = importPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      created: 0,
      updated: 0,
      pricesPreserved: 0,
      errors: [
        {
          index: 0,
          name: "payload",
          message: parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        },
      ],
    };
  }

  const summary: ImportSummary = { created: 0, updated: 0, pricesPreserved: 0, errors: [] };
  const categories = await db.category.findMany();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  for (const [index, row] of parsed.data.products.entries()) {
    try {
      const categoryId = row.categorySlug ? categoryBySlug.get(row.categorySlug) : undefined;
      if (row.categorySlug && !categoryId) {
        summary.errors.push({
          index,
          name: row.name,
          message: `Unknown categorySlug "${row.categorySlug}". Create the category first.`,
        });
        continue;
      }

      const baseSlug = slugify(row.slug || row.name) || `product-${index + 1}`;
      const existing = row.sku
        ? await db.product.findFirst({ where: { OR: [{ sku: row.sku }, { slug: baseSlug }] } })
        : await db.product.findUnique({ where: { slug: baseSlug } });

      const data = {
        name: row.name,
        sku: row.sku ?? null,
        categoryId: categoryId ?? null,
        shortDescription: row.shortDescription ?? "",
        description: row.description ?? "",
        specifications: row.specifications ?? [],
        priceRwf: row.priceRwf ?? null,
        compareAtPriceRwf: row.compareAtPriceRwf ?? null,
        stock: row.stock ?? 0,
        lowStockThreshold: row.lowStockThreshold ?? 5,
        dataStatus: row.dataStatus ?? "REFERENCE",
        isPublished: row.isPublished ?? false,
        featured: row.featured ?? false,
        imageUrl: row.imageUrl ?? null,
        imageAlt: row.imageAlt ?? null,
        referencePriceRwf: row.referencePriceRwf ?? null,
        referenceSource: row.referenceSource ?? null,
        referenceRetrievedAt: row.referenceRetrievedAt
          ? new Date(row.referenceRetrievedAt)
          : null,
      };

      if (existing) {
        // Commercial state belongs to the administrator, not to the import file.
        // Prices, publication flags and stock counts are only replaced when the
        // caller explicitly opts in to re-pricing.
        const commercialFields = options.updatePrices
          ? {}
          : {
              priceRwf: existing.priceRwf ?? data.priceRwf,
              compareAtPriceRwf: existing.compareAtPriceRwf,
              dataStatus: existing.dataStatus,
              isPublished: existing.isPublished,
              featured: existing.featured,
              stock: existing.stock,
              lowStockThreshold: existing.lowStockThreshold,
            };

        if (!options.updatePrices && existing.priceRwf !== null) {
          summary.pricesPreserved += 1;
        }

        await db.product.update({
          where: { id: existing.id },
          data: { ...data, ...commercialFields },
        });
        summary.updated += 1;
      } else {
        await db.product.create({ data: { ...data, slug: baseSlug } });
        summary.created += 1;
      }
    } catch (error) {
      summary.errors.push({
        index,
        name: row.name,
        message: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  return summary;
}
