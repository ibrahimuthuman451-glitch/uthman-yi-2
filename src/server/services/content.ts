import "server-only";

import { db } from "@/lib/db";

/** Software development services and the Uthman IY software products. */

export async function listServices(options?: { includeUnpublished?: boolean }) {
  return db.service.findMany({
    where: options?.includeUnpublished ? {} : { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

export async function getServiceBySlug(slug: string) {
  return db.service.findFirst({ where: { slug, isPublished: true } });
}

export async function getServiceById(id: string) {
  return db.service.findUnique({ where: { id } });
}

export async function listSoftwareProducts(options?: { includeUnpublished?: boolean }) {
  return db.softwareProduct.findMany({
    where: options?.includeUnpublished ? {} : { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getSoftwareProductBySlug(slug: string) {
  return db.softwareProduct.findFirst({ where: { slug, isPublished: true } });
}

export async function getSoftwareProductById(id: string) {
  return db.softwareProduct.findUnique({ where: { id } });
}

type FeatureRow = { title: string; description: string; status: string };

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function readFeatures(value: unknown): FeatureRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      status: String(item.status ?? "PLANNED"),
    }))
    .filter((item) => item.title.length > 0);
}
