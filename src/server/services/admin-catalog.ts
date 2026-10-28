import "server-only";

import type { Prisma, ProductDataStatus, StockMovementReason } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { parseRwfInput } from "@/lib/money";

export type AdminProductQuery = {
  search?: string;
  status?: ProductDataStatus | "ALL";
  categoryId?: string;
  archived?: boolean;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listAdminProducts(query: AdminProductQuery) {
  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const search = query.search?.trim().slice(0, 80) ?? "";

  const where: Prisma.ProductWhereInput = {
    ...(query.archived ? { archivedAt: { not: null } } : { archivedAt: null }),
    ...(query.status && query.status !== "ALL" ? { dataStatus: query.status } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.lowStock
      ? { stock: { lte: db.product.fields.lowStockThreshold }, isPublished: true }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { category: true, stockMovements: { orderBy: { createdAt: "desc" }, take: 25 } },
  });
}

export async function listCategories(includeInactive = true) {
  return db.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function ensureUniqueSlug(
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(desired) || "product";
  let candidate = base;
  let counter = 1;
  // A short loop is sufficient: collisions beyond a handful are unrealistic.
  while (counter < 50) {
    const existing = await db.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function ensureUniqueCategorySlug(
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(desired) || "category";
  let candidate = base;
  let counter = 1;
  while (counter < 50) {
    const existing = await db.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type ProductWriteInput = {
  name: string;
  slug?: string;
  sku?: string;
  categoryId?: string;
  shortDescription?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  stock: number;
  lowStockThreshold: number;
  dataStatus: ProductDataStatus;
  isPublished: boolean;
  featured: boolean;
  imageUrl?: string;
  imageAlt?: string;
  specifications: { label: string; value: string }[];
};

export async function createProduct(input: ProductWriteInput, actorId: string) {
  const slug = await ensureUniqueSlug(input.slug || input.name);
  const price = input.price ? parseRwfInput(input.price) : null;
  const compareAt = input.compareAtPrice ? parseRwfInput(input.compareAtPrice) : null;

  const product = await db.product.create({
    data: {
      name: input.name,
      slug,
      sku: input.sku?.trim() || null,
      categoryId: input.categoryId?.trim() || null,
      shortDescription: input.shortDescription ?? "",
      description: input.description ?? "",
      specifications: input.specifications,
      priceRwf: input.dataStatus === "REFERENCE" ? null : price,
      compareAtPriceRwf: compareAt,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      dataStatus: input.dataStatus,
      isPublished: input.isPublished,
      featured: input.featured,
      imageUrl: input.imageUrl?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
    },
  });

  if (input.stock > 0) {
    await db.stockMovement.create({
      data: {
        productId: product.id,
        delta: input.stock,
        reason: "INITIAL_STOCK",
        note: "Stock set when the product was created",
        actorId,
      },
    });
  }

  return product;
}

export async function updateProduct(
  id: string,
  input: ProductWriteInput,
  actorId: string,
) {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) throw new Error("PRODUCT_NOT_FOUND");

  const slug = await ensureUniqueSlug(input.slug || existing.slug || input.name, id);
  const price = input.price ? parseRwfInput(input.price) : null;
  const compareAt = input.compareAtPrice ? parseRwfInput(input.compareAtPrice) : null;
  const stockDelta = input.stock - existing.stock;

  const product = await db.product.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      sku: input.sku?.trim() || null,
      categoryId: input.categoryId?.trim() || null,
      shortDescription: input.shortDescription ?? "",
      description: input.description ?? "",
      specifications: input.specifications,
      priceRwf: input.dataStatus === "REFERENCE" ? existing.priceRwf : price,
      compareAtPriceRwf: compareAt,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      dataStatus: input.dataStatus,
      isPublished: input.isPublished,
      featured: input.featured,
      imageUrl: input.imageUrl?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
    },
  });

  if (stockDelta !== 0) {
    await db.stockMovement.create({
      data: {
        productId: id,
        delta: stockDelta,
        reason: "MANUAL_ADJUSTMENT",
        note: "Stock changed while editing the product",
        actorId,
      },
    });
  }

  return product;
}

export async function setProductArchived(id: string, archived: boolean) {
  return db.product.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null, isPublished: archived ? false : undefined },
  });
}

export async function adjustStock(input: {
  productId: string;
  delta: number;
  reason: StockMovementReason;
  note?: string;
  actorId: string;
}) {
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product) return { ok: false, message: "Product not found." };
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    return { ok: false, message: "Enter a non-zero whole number of units." };
  }
  if (product.stock + input.delta < 0) {
    return { ok: false, message: "Stock cannot go below zero." };
  }

  await db.$transaction([
    db.product.update({
      where: { id: product.id },
      data: { stock: { increment: input.delta } },
    }),
    db.stockMovement.create({
      data: {
        productId: product.id,
        delta: input.delta,
        reason: input.reason,
        note: input.note?.trim() || "Manual stock adjustment",
        actorId: input.actorId,
      },
    }),
  ]);

  return { ok: true, message: `Stock updated to ${product.stock + input.delta}.` };
}

export async function listLowStockProducts(take = 10) {
  return db.product.findMany({
    where: {
      archivedAt: null,
      isPublished: true,
      stock: { lte: db.product.fields.lowStockThreshold },
    },
    orderBy: { stock: "asc" },
    take,
  });
}

export async function createCategory(input: {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
}) {
  const slug = await ensureUniqueCategorySlug(input.slug || input.name);
  return db.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive,
    },
  });
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
    isActive: boolean;
  },
) {
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw new Error("CATEGORY_NOT_FOUND");
  const slug = await ensureUniqueCategorySlug(input.slug || existing.slug, id);
  return db.category.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      isActive: input.isActive,
    },
  });
}

/** Every delivery area, including inactive ones, for the settings editor. */
export async function listAllDeliveryAreas() {
  return db.deliveryArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}
