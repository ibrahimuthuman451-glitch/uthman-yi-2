import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/cart", "/checkout", "/orders"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
