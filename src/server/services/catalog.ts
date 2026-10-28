import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { getProductAvailability } from "@/lib/catalog/availability";
import { brandByKey, getProductBrand, type Brand } from "@/lib/catalogue/brand";
import { getSiteSettings } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

/** Public catalogue queries. Only published, non-archived listings are exposed. */

export type PublicProductCard = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  priceRwf: number | null;
  compareAtPriceRwf: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  brand: Brand | null;
  categoryName: string | null;
  categorySlug: string | null;
  availabilityLabel: string;
  availabilityTone: "success" | "warning" | "danger" | "neutral";
  purchasable: boolean;
  isDemo: boolean;
  stock: number;
  stockLevel: "in" | "low" | "out";
};

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  priceRwf: true,
  compareAtPriceRwf: true,
  imageUrl: true,
  imageAlt: true,
  stock: true,
  lowStockThreshold: true,
  dataStatus: true,
  isPublished: true,
  archivedAt: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export function toPublicProductCard(
  product: ProductCardRow,
  stockMode: "TRACKED" | "ON_REQUEST" = "TRACKED",
): PublicProductCard | null {
  const availability = getProductAvailability(
    {
      dataStatus: product.dataStatus,
      isPublished: product.isPublished,
      archivedAt: product.archivedAt,
      priceRwf: product.priceRwf,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    },
    stockMode,
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    priceRwf: product.priceRwf,
    compareAtPriceRwf: product.compareAtPriceRwf,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    brand: getProductBrand(product.name),
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    availabilityLabel: availability.label,
    availabilityTone: availability.tone,
    purchasable: availability.purchasable,
    isDemo: availability.isDemo,
    stock: product.stock,
    stockLevel:
      product.stock <= 0 ? "out" : product.stock <= product.lowStockThreshold ? "low" : "in",
  };
}

/** Visibility filter for the public storefront. */
export async function publicProductWhere(): Promise<Prisma.ProductWhereInput> {
  const settings = await getSiteSettings();
  const statuses: ("APPROVED" | "DEMO")[] = settings.store.showDemoProducts
    ? ["APPROVED", "DEMO"]
    : ["APPROVED"];

  return {
    archivedAt: null,
    isPublished: true,
    dataStatus: { in: statuses },
    category: { isActive: true },
  };
}

export type CatalogueQuery = {
  search?: string;
  category?: string;
  brand?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
  page?: number;
  pageSize?: number;
};

export type CatalogueResult = {
  products: PublicProductCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export async function listCatalogueProducts(query: CatalogueQuery): Promise<CatalogueResult> {
  const pageSize = query.pageSize ?? 9;
  const page = Math.max(1, query.page ?? 1);
  const settings = await getSiteSettings();
  const baseWhere = await publicProductWhere();

  const search = query.search?.trim().slice(0, 80) ?? "";
  const brand = brandByKey(query.brand);
  const where: Prisma.ProductWhereInput = {
    ...baseWhere,
    ...(brand ? { name: { contains: brand.label, mode: "insensitive" } } : {}),
    ...(query.category && query.category !== "all"
      ? { category: { is: { slug: query.category, isActive: true } } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { shortDescription: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    switch (query.sort) {
      case "price-asc":
        return { priceRwf: "asc" };
      case "price-desc":
        return { priceRwf: "desc" };
      case "name-asc":
        return { name: "asc" };
      default:
        return { featured: "desc" };
    }
  })();

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [orderBy, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products: rows
      .map((row) => toPublicProductCard(row, settings.store.stockMode))
      .filter((product): product is PublicProductCard => product !== null),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export async function listPublicCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: { products: { where: { archivedAt: null, isPublished: true } } },
      },
    },
  });
}

export type PublicProductDetail = PublicProductCard & {
  sku: string | null;
  description: string;
  specifications: { label: string; value: string }[];
  categoryId: string | null;
  createdAt: Date;
};

export async function getPublicProductBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  const safeSlug = z.string().trim().max(120).parse(slug);
  const settings = await getSiteSettings();
  const where = await publicProductWhere();
  const product = await db.product.findFirst({
    where: { ...where, slug: safeSlug },
    select: {
      ...productCardSelect,
      sku: true,
      description: true,
      specifications: true,
      createdAt: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!product) return null;

  const card = toPublicProductCard(product, settings.store.stockMode);
  if (!card) return null;

  const specs = Array.isArray(product.specifications)
    ? (product.specifications as { label?: string; value?: string }[])
        .filter((spec) => spec && typeof spec === "object")
        .map((spec) => ({
          label: String(spec.label ?? "Detail"),
          value: String(spec.value ?? ""),
        }))
    : [];

  return {
    ...card,
    sku: product.sku,
    description: product.description,
    specifications: specs,
    categoryId: product.categoryId,
    createdAt: product.createdAt,
  };
}

/**
 * Loads cart products for validation, including unavailable rows so the caller
 * can explain exactly why an item cannot be ordered.
 */
export async function getProductsByIds(ids: string[]) {
  const unique = Array.from(new Set(ids)).slice(0, 50);
  if (unique.length === 0) return [];
  return db.product.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      priceRwf: true,
      imageUrl: true,
      imageAlt: true,
      stock: true,
      lowStockThreshold: true,
      dataStatus: true,
      isPublished: true,
      archivedAt: true,
      category: { select: { name: true, slug: true } },
    },
  });
}

/** Related products in the same category, for the product detail page. */
export async function listRelatedProducts(
  categoryId: string | null,
  excludeId: string,
  take = 3,
): Promise<PublicProductCard[]> {
  if (!categoryId) return [];
  const settings = await getSiteSettings();
  const where = await publicProductWhere();
  const rows = await db.product.findMany({
    where: { ...where, categoryId, id: { not: excludeId } },
    select: productCardSelect,
    take,
    orderBy: { featured: "desc" },
  });
  return rows
    .map((row) => toPublicProductCard(row, settings.store.stockMode))
    .filter((product): product is PublicProductCard => product !== null);
}

export async function listFeaturedProducts(take = 4): Promise<PublicProductCard[]> {
  const settings = await getSiteSettings();
  const where = await publicProductWhere();
  // With stock on request every listing has stock 0, so a "stock > 0" filter
  // would empty the homepage shelf; only enforce it in tracked mode.
  const stockFilter = settings.store.stockMode === "TRACKED" ? { stock: { gt: 0 } } : {};
  const rows = await db.product.findMany({
    where: { ...where, priceRwf: { not: null }, ...stockFilter },
    select: productCardSelect,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows
    .map((row) => toPublicProductCard(row, settings.store.stockMode))
    .filter((product): product is PublicProductCard => product !== null);
}
