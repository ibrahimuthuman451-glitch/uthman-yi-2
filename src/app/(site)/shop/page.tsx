import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { listCatalogueProducts, listPublicCategories } from "@/server/services/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import { shopFaqs } from "@/lib/faqs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CCTV, Starlink & Electronics Shop in Kigali",
  description:
    "Buy CCTV cameras, NVR and DVR recorders, complete kits, Starlink kits and accessories, power backups, alarms and intercoms in Kigali. Clear prices in RWF, free delivery across Rwanda, installation by our own technicians.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
}>;

const SORT_OPTIONS = [
  { value: "featured", label: "Featured first" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name A-Z" },
] as const;

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const search = params.q?.slice(0, 80) ?? "";
  const category = params.category ?? "all";
  const sortParam = SORT_OPTIONS.some((option) => option.value === params.sort)
    ? (params.sort as (typeof SORT_OPTIONS)[number]["value"])
    : "featured";
  const page = Math.max(1, Number(params.page) || 1);

  const [result, categories] = await Promise.all([
    listCatalogueProducts({
      search,
      category,
      sort: sortParam === "featured" ? "newest" : sortParam,
      page,
      pageSize: PAGE_SIZE,
    }),
    listPublicCategories(),
  ]);

  const activeCategory = categories.find((entry) => entry.slug === category);
  const showDemoNotice = result.products.some((product) => product.isDemo);

  return (
    <div className="bg-surface">
      <div className="border-b border-navy-100 bg-white">
        <div className="container-page py-10 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-navy-700">Shop</span>
          </nav>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Technology shop</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {settings.store.catalogueNotice}
          </p>
        </div>
      </div>

      <div className="container-page py-8 sm:py-10">
        {/* Search and sort */}
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
          <div className="flex-1">
            <label htmlFor="shop-search" className="field-label">
              Search the catalogue
            </label>
            <input
              id="shop-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Search by product name or SKU"
              className="field-input"
              maxLength={80}
            />
          </div>
          <div className="sm:w-56">
            <label htmlFor="shop-sort" className="field-label">
              Sort by
            </label>
            <select id="shop-sort" name="sort" defaultValue={sortParam} className="field-input">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClasses("primary", "md", "h-[42px]")}>
            Apply
          </button>
          {search || category !== "all" ? (
            <Link href="/shop" className={buttonClasses("ghost", "md", "h-[42px]")}>
              Clear
            </Link>
          ) : null}
        </form>

        {showDemoNotice ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Demonstration catalogue:</strong> listings marked
            &ldquo;Demo listing&rdquo; are sample data used to preview the shop. They are not real
            stock or approved Uthman IY prices.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted" aria-live="polite">
            {result.total} {result.total === 1 ? "product" : "products"}
            {activeCategory ? ` in ${activeCategory.name}` : ""}
            {search ? ` matching “${search}”` : ""}
          </p>
        </div>

        {result.products.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-navy-900">No products match this search</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Try a different search term or category. If you need something specific, send us an
              enquiry and we will confirm availability and pricing.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/shop" className={buttonClasses("outline", "md")}>
                Clear filters
              </Link>
              <Link href="/contact?type=PRODUCT_ENQUIRY" className={buttonClasses("primary", "md")}>
                Ask about a product
              </Link>
            </div>
          </div>
        )}

        {/* Categories sit below the grid so the products are reachable immediately. */}
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">
          Browse by category
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/shop${buildQuery({ q: search, sort: sortParam === "featured" ? undefined : sortParam })}`}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              category === "all"
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-navy-200 bg-white text-navy-700 hover:border-brand-300",
            )}
          >
            All products
          </Link>
          {categories.map((entry) => (
            <Link
              key={entry.id}
              href={`/shop/category/${entry.slug}`}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                category === entry.slug
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-navy-200 bg-white text-navy-700 hover:border-brand-300",
              )}
            >
              {entry.name}
              <span className="ml-1.5 text-xs opacity-70">{entry._count.products}</span>
            </Link>
          ))}
        </div>

        {result.pageCount > 1 ? (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            {result.page > 1 ? (
              <Link
                href={`/shop${buildQuery({ q: search, category, sort: sortParam === "featured" ? undefined : sortParam, page: String(result.page - 1) })}`}
                className={buttonClasses("outline", "sm")}
              >
                Previous
              </Link>
            ) : null}
            <span className="px-3 text-sm text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={`/shop${buildQuery({ q: search, category, sort: sortParam === "featured" ? undefined : sortParam, page: String(result.page + 1) })}`}
                className={buttonClasses("outline", "sm")}
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}

        <section aria-labelledby="shop-faq" className="mt-12 rounded-2xl border border-navy-100 bg-white p-6">
          <h2 id="shop-faq" className="text-lg font-semibold text-navy-900">
            Frequently asked questions
          </h2>
          <dl className="mt-4 space-y-5">
            {shopFaqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-sm font-semibold text-navy-900">{faq.question}</dt>
                <dd className="mt-1 text-sm leading-6 text-navy-700">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: shopFaqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            }),
          }}
        />
      </div>
    </div>
  );
}
