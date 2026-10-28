import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProductBySlug, listRelatedProducts } from "@/server/services/catalog";
import { getSiteSettings } from "@/lib/settings";
import { ProductMedia } from "@/components/shop/product-media";
import { PurchasePanel } from "@/components/shop/purchase-panel";
import { ProductCard } from "@/components/shop/product-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatRwf } from "@/lib/money";
import { getSiteUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) {
    return { title: "Product not found" };
  }
  const description =
    product.shortDescription ||
    `Buy ${product.name} from Uthman IY in Kigali, Rwanda. Confirm availability and delivery at checkout.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | Uthman IY`,
      description,
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.imageAlt ?? product.name }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getPublicProductBySlug(slug),
    getSiteSettings(),
  ]);
  if (!product) notFound();

  const related = await listRelatedProducts(product.categoryId, product.id);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description.slice(0, 300),
    sku: product.sku ?? undefined,
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    brand: { "@type": "Brand", name: product.brand?.label ?? "Uthman IY" },
    ...(product.priceRwf !== null
      ? {
          offers: {
            "@type": "Offer",
            url: `${getSiteUrl()}/shop/${product.slug}`,
            priceCurrency: "RWF",
            price: product.priceRwf,
            // Stock-on-request listings are orderable even without a stock
            // figure, so schema availability follows purchasability.
            availability: product.purchasable
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "Uthman IY" },
          },
        }
      : {}),
  };

  return (
    <div className="bg-white">
      <div className="container-page pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-brand-700">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/shop" className="hover:text-brand-700">Shop</Link>
          {product.categoryName ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-brand-700">
                {product.categoryName}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-navy-700">{product.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-10 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-12">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-navy-100 bg-surface">
            <ProductMedia src={product.imageUrl} alt={product.imageAlt} name={product.name} sizes="(min-width: 1024px) 560px, 90vw" />
          </div>
          <p className="mt-3 text-xs text-navy-400">
            Product photography is supplied by Uthman IY. Where a photo is pending, the listing
            shows a placeholder instead of an image from another company.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand ? <Badge tone="brand">{product.brand.label}</Badge> : null}
            {product.categoryName ? (
              <Link href={`/shop?category=${product.categorySlug}`}>
                <Badge tone="neutral">{product.categoryName}</Badge>
              </Link>
            ) : null}
            {product.isDemo ? <Badge tone="demo">Demo listing</Badge> : null}
            {product.sku ? <Badge tone="neutral">SKU {product.sku}</Badge> : null}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
            {product.name}
          </h1>
          {product.shortDescription ? (
            <p className="mt-3 text-base leading-7 text-muted">{product.shortDescription}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-navy-800">{product.availabilityLabel}</span>
            {product.stock > 0 && product.purchasable ? (
              <span className="text-xs text-muted">{product.stock} unit(s) available online</span>
            ) : null}
          </div>

          {product.priceRwf !== null ? (
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold text-navy-900">{formatRwf(product.priceRwf)}</span>
              {product.compareAtPriceRwf && product.compareAtPriceRwf > product.priceRwf ? (
                <span className="text-sm text-navy-400 line-through">
                  {formatRwf(product.compareAtPriceRwf)}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-lg font-semibold text-navy-900">Price on request</p>
          )}

          <div className="mt-6">
            <PurchasePanel
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceRwf: product.priceRwf,
                imageUrl: product.imageUrl,
              }}
              purchasable={product.purchasable}
              stock={product.stock}
              priceRwf={product.priceRwf}
            />
          </div>

          {product.isDemo ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <strong className="font-semibold">Demonstration listing.</strong> This item is sample
              data for testing the shop, cart and checkout. It is not real inventory and the price
              is not an approved Uthman IY price.
            </p>
          ) : null}

          <dl className="mt-6 grid gap-3 rounded-2xl border border-navy-100 bg-surface p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Sold by</dt>
              <dd className="mt-0.5 font-medium text-navy-900">{settings.company.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Pickup / delivery</dt>
              <dd className="mt-0.5 font-medium text-navy-900">
                {[settings.company.addressLine, settings.company.city].filter(Boolean).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Listed</dt>
              <dd className="mt-0.5 font-medium text-navy-900">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Questions</dt>
              <dd className="mt-0.5 font-medium text-navy-900">
                <a className="hover:text-brand-700" href={`tel:${settings.company.phone}`}>
                  {settings.company.phone}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="container-page grid gap-10 pb-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <section aria-labelledby="product-description">
          <h2 id="product-description" className="text-lg font-semibold text-navy-900">
            Product details
          </h2>
          {product.description ? (
            <div className="prose-uy mt-3 whitespace-pre-line">{product.description}</div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              A detailed description has not been published for this listing yet. Contact us for
              full product information.
            </p>
          )}
        </section>

        <section aria-labelledby="product-specifications">
          <h2 id="product-specifications" className="text-lg font-semibold text-navy-900">
            Specifications
          </h2>
          {product.specifications.length > 0 ? (
            <dl className="mt-3 divide-y divide-navy-100 rounded-2xl border border-navy-100">
              {product.specifications.map((spec, index) => (
                <div key={`${spec.label}-${index}`} className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                  <dt className="font-medium text-navy-500">{spec.label}</dt>
                  <dd className="text-navy-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Verified specifications for this listing are not published yet. Ask us for the
              manufacturer datasheet before ordering.
            </p>
          )}
        </section>
      </div>

      {related.length > 0 ? (
        <div className="border-t border-navy-100 bg-surface">
          <div className="container-page py-12">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-navy-900">More in {product.categoryName}</h2>
              <Link href={`/shop?category=${product.categorySlug}`} className={buttonClasses("outline", "sm")}>
                View category
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
    </div>
  );
}
