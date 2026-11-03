import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCatalogueProducts, listPublicCategories } from "@/server/services/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { buttonClasses } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

async function findCategory(slug: string) {
  const categories = await listPublicCategories();
  return categories.find((entry) => entry.slug === slug && entry._count.products > 0) ?? null;
}

/**
 * Category landing pages.
 *
 * Product pages alone cannot rank for "CCTV cameras Kigali" style searches, so
 * each active category gets its own indexable URL with a unique title, heading
 * and intro text (written here, never copied from another shop).
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: "Category not found" };

  const description =
    category.description?.trim() ||
    `Buy ${category.name.toLowerCase()} from Uthman IY in Gisozi, Kigali. Clear prices in RWF, free delivery across Rwanda and installation by our own team.`;

  return {
    title: `${category.name} in Kigali`,
    description,
    alternates: { canonical: `/shop/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const category = await findCategory(slug);
  if (!category) notFound();

  const result = await listCatalogueProducts({
    category: category.slug,
    page,
    pageSize: 24,
    sort: "newest",
  });

  const base = getSiteUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${base}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${base}/shop/category/${category.slug}`,
      },
    ],
  };

  return (
    <div className="bg-surface">
      <div className="border-b border-navy-100 bg-white">
        <div className="container-page py-5 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>{" "}
            <span aria-hidden="true">/</span>{" "}
            <Link href="/shop" className="hover:text-brand-700">
              Shop
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-navy-700">{category.name}</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-4xl">
            {category.name} in Kigali
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted sm:text-sm sm:leading-6">
            {category.description?.trim() ||
              `Uthman IY supplies ${category.name.toLowerCase()} from our shop on KG 14 Ave, Gisozi. Prices are in Rwandan francs, delivery is free across Rwanda, and our team can install and configure what you buy.`}
          </p>
        </div>
      </div>

      <div className="container-page py-5 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {result.total} {result.total === 1 ? "product" : "products"} in {category.name}
          </p>
          <Link href="/shop" className={buttonClasses("outline", "sm")}>
            Browse all products
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {result.pageCount > 1 ? (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
            {result.page > 1 ? (
              <Link
                href={`/shop/category/${category.slug}?page=${result.page - 1}`}
                className={buttonClasses("outline", "sm")}
              >
                Previous
              </Link>
            ) : null}
            <span className="text-sm text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={`/shop/category/${category.slug}?page=${result.page + 1}`}
                className={buttonClasses("outline", "sm")}
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="mt-12 rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="text-base font-semibold text-navy-900">
            Buying {category.name.toLowerCase()} from Uthman IY
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-navy-700">
            <li>Shop in Gisozi, Kigali — KG 14 Ave, Gasabo District. Open every day, 08:00–21:00.</li>
            <li>Free delivery across Rwanda. Pay by MTN MoMo, Airtel Money or cash on delivery.</li>
            <li>Installation, configuration and after-sales support by our own technicians.</li>
            <li>
              Need advice?{" "}
              <Link
                href="/contact?type=PRODUCT_ENQUIRY"
                className="font-semibold text-brand-700 underline"
              >
                Send an enquiry
              </Link>{" "}
              and we will confirm availability and the exact price.
            </li>
          </ul>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
