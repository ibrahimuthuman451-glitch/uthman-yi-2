import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductMedia } from "@/components/shop/product-media";
import { AddToCartButton } from "@/components/shop/add-to-cart";
import { formatRwf } from "@/lib/money";
import type { PublicProductCard as ProductCardData } from "@/server/services/catalog";

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift">
      <Link
        href={`/shop/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface"
        aria-label={`View ${product.name}`}
      >
        <ProductMedia src={product.imageUrl} alt={product.imageAlt} name={product.name} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.brand ? <Badge tone="neutral">{product.brand.label}</Badge> : null}
          {product.isDemo ? <Badge tone="demo">Demo listing</Badge> : null}
          {product.compareAtPriceRwf && product.priceRwf ? (
            <Badge tone="brand">Price updated</Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.categoryName ? (
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
            {product.categoryName}
          </p>
        ) : null}
        <h3 className="mt-1.5 text-base font-semibold leading-snug text-navy-900">
          <Link href={`/shop/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        {product.shortDescription ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold text-navy-900">{formatRwf(product.priceRwf)}</span>
            {product.compareAtPriceRwf && product.priceRwf && product.compareAtPriceRwf > product.priceRwf ? (
              <span className="text-xs text-navy-400 line-through">
                {formatRwf(product.compareAtPriceRwf)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <span
              aria-hidden="true"
              className={
                product.availabilityTone === "success"
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                  : product.availabilityTone === "warning"
                    ? "h-1.5 w-1.5 rounded-full bg-amber-500"
                    : product.availabilityTone === "danger"
                      ? "h-1.5 w-1.5 rounded-full bg-red-500"
                      : "h-1.5 w-1.5 rounded-full bg-navy-300"
              }
            />
            {product.availabilityLabel}
          </p>

          <div className="mt-3">
            {product.purchasable ? (
              <AddToCartButton
                size="sm"
                product={{
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  priceRwf: product.priceRwf,
                  imageUrl: product.imageUrl,
                }}
              />
            ) : (
              <Link
                href={`/contact?type=PRODUCT_ENQUIRY&product=${product.slug}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-navy-200 px-3.5 py-2 text-sm font-semibold text-navy-800 hover:border-brand-300 hover:bg-brand-50"
              >
                Enquire about this product
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
