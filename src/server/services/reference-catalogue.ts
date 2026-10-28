import "server-only";

import referenceData from "../../../data/reference/fabritech-catalogue-2026-10-25.json";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * Reference catalogue research (third-party listings).
 *
 * These rows exist to help Uthman IY plan categories and pricing. They are
 * never shown on the storefront and are never treated as Uthman IY selling
 * prices. Converting an entry creates an UNPUBLISHED draft with reference
 * provenance attached; the administrator must add Uthman IY's own price,
 * photography and description before publishing.
 */

export type BundledReferenceItem = {
  externalId: string;
  title: string;
  category: string;
  categorySlug: string;
  referencePriceRwf: number | null;
  currency: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
};

export const referenceProvenance = referenceData.provenance;

export async function importReferenceCatalogue(): Promise<{
  imported: number;
  skipped: number;
}> {
  const items = referenceData.items as BundledReferenceItem[];
  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await db.referenceCatalogItem.findUnique({
      where: { externalId: item.externalId },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await db.referenceCatalogItem.create({
      data: {
        externalId: item.externalId,
        source: item.source,
        sourceUrl: item.sourceUrl,
        retrievedAt: new Date(item.retrievedAt),
        title: item.title,
        category: item.category,
        categorySlug: item.categorySlug,
        referencePriceRwf: item.referencePriceRwf,
        currency: item.currency,
        notes:
          "Reference listing captured for category and price research only. Not an Uthman IY price.",
      },
    });
    imported += 1;
  }

  return { imported, skipped };
}

export async function listReferenceItems(query?: { search?: string; category?: string }) {
  const search = query?.search?.trim().slice(0, 80) ?? "";
  return db.referenceCatalogItem.findMany({
    where: {
      ...(query?.category ? { categorySlug: query.category } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ categorySlug: "asc" }, { title: "asc" }],
  });
}

export async function convertReferenceItemToDraft(id: string, actorId: string) {
  const item = await db.referenceCatalogItem.findUnique({ where: { id } });
  if (!item) return { ok: false as const, message: "Reference item not found." };
  if (item.convertedProductId) {
    const existing = await db.product.findUnique({ where: { id: item.convertedProductId } });
    if (existing) {
      return { ok: true as const, productId: existing.id, message: "Draft already exists." };
    }
  }

  const category = await db.category.findUnique({ where: { slug: item.categorySlug } });
  const baseSlug = slugify(item.title) || `item-${item.id.slice(0, 6)}`;
  let slug = baseSlug;
  let counter = 1;
  while (await db.product.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const product = await db.product.create({
    data: {
      name: item.title,
      slug,
      categoryId: category?.id ?? null,
      shortDescription: "Draft created from reference catalogue research.",
      description:
        "Draft listing. Replace this description with Uthman IY's own verified product information, add approved photography, set the approved selling price and confirm stock before publishing.",
      specifications: [],
      priceRwf: null,
      stock: 0,
      lowStockThreshold: 5,
      dataStatus: "REFERENCE",
      isPublished: false,
      referencePriceRwf: item.referencePriceRwf,
      referenceSource: `${item.source} (${item.sourceUrl})`,
      referenceRetrievedAt: item.retrievedAt,
    },
  });

  await db.referenceCatalogItem.update({
    where: { id: item.id },
    data: { convertedProductId: product.id },
  });

  await db.auditLog.create({
    data: {
      actorId,
      action: "reference.convert_to_draft",
      entityType: "ReferenceCatalogItem",
      entityId: item.id,
      metadata: { productId: product.id, title: item.title },
    },
  });

  return {
    ok: true as const,
    productId: product.id,
    message: `Draft created for "${item.title}". Add an approved price before publishing.`,
  };
}
