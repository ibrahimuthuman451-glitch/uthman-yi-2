import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/env";

/**
 * Dynamic sitemap. Database failures degrade to the static marketing routes
 * instead of breaking the file entirely.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/software`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/software-development`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [products, services, software] = await Promise.all([
      db.product.findMany({
        where: { isPublished: true, archivedAt: null, dataStatus: { in: ["APPROVED", "DEMO"] } },
        select: { slug: true, updatedAt: true },
      }),
      db.service.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      db.softwareProduct.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: `${base}/shop/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...services.map((service) => ({
        url: `${base}/software-development/${service.slug}`,
        lastModified: service.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...software.map((product) => ({
        url: `${base}/software/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] database unavailable, serving static routes", error);
    return staticRoutes;
  }
}
