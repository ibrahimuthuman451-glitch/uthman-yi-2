import Link from "next/link";
import { listAdminProducts, listCategories } from "@/server/services/admin-catalog";
import { productDataStatusLabels } from "@/lib/constants";
import { formatRwf } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { ProductDataStatus } from "@prisma/client";
import { getSiteSettings } from "@/lib/settings";
import { getPriceReviewStateFromSettings } from "@/lib/price-review";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  category?: string;
  archived?: string;
  lowStock?: string;
  page?: string;
}>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const archived = params.archived === "1";
  const lowStock = params.lowStock === "1";
  const status = (["APPROVED", "REFERENCE", "DEMO"] as const).includes(
    params.status as ProductDataStatus,
  )
    ? (params.status as ProductDataStatus)
    : "ALL";

  const settings = await getSiteSettings();
  const priceReview = getPriceReviewStateFromSettings(settings);

  const [result, categories] = await Promise.all([
    listAdminProducts({
      search: params.q,
      status,
      categoryId: params.category || undefined,
      archived,
      lowStock,
      page: Number(params.page) || 1,
    }),
    listCategories(),
  ]);

  const build = (patch: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = {
      q: params.q,
      status: status === "ALL" ? undefined : status,
      category: params.category,
      archived: archived ? "1" : undefined,
      lowStock: lowStock ? "1" : undefined,
      page: undefined,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    return `/admin/products${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {result.total} {archived ? "archived" : "active"} listing(s). Only approved, published
            listings appear in the shop.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalogue" className={buttonClasses("outline", "md")}>
            Import / export
          </Link>
          <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
            Add product
          </Link>
        </div>
      </div>

      {priceReview.isDue ? (
        <Alert tone={priceReview.isOverdue ? "error" : "warning"} title={priceReview.label}>
          Supplier reference prices are reviewed every {priceReview.intervalDays} days.{" "}
          <Link href="/admin/price-review" className="font-semibold underline">
            Open the price review
          </Link>{" "}
          &mdash; approved selling prices are not changed automatically.
        </Alert>
      ) : null}

      <form method="get" className="grid gap-3 rounded-2xl border border-navy-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        {archived ? <input type="hidden" name="archived" value="1" /> : null}
        {lowStock ? <input type="hidden" name="lowStock" value="1" /> : null}
        <label className="text-xs font-medium text-navy-600">
          Search
          <input name="q" defaultValue={params.q ?? ""} className="field-input mt-1" placeholder="Name, SKU or slug" />
        </label>
        <label className="text-xs font-medium text-navy-600">
          Status
          <select name="status" defaultValue={status} className="field-input mt-1">
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="DEMO">Demo</option>
            <option value="REFERENCE">Reference</option>
          </select>
        </label>
        <label className="text-xs font-medium text-navy-600">
          Category
          <select name="category" defaultValue={params.category ?? ""} className="field-input mt-1">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Apply filters
          </button>
          <Link href="/admin/products" className={buttonClasses("ghost", "md")}>
            Reset
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={build({ archived: undefined, lowStock: undefined })} className={!archived && !lowStock ? "font-semibold text-brand-700" : "text-navy-500 hover:text-brand-700"}>
          Active listings
        </Link>
        <span aria-hidden="true" className="text-navy-300">|</span>
        <Link href={build({ lowStock: "1", archived: undefined })} className={lowStock ? "font-semibold text-amber-700" : "text-navy-500 hover:text-brand-700"}>
          Low stock
        </Link>
        <span aria-hidden="true" className="text-navy-300">|</span>
        <Link href={build({ archived: "1", lowStock: undefined })} className={archived ? "font-semibold text-brand-700" : "text-navy-500 hover:text-brand-700"}>
          Archived
        </Link>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Status</th>
              <th scope="col">Price</th>
              <th scope="col">Stock</th>
              <th scope="col">Updated</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {result.products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-navy-500">
                  No products match these filters.
                </td>
              </tr>
            ) : (
              result.products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link href={`/admin/products/${product.id}`} className="font-medium text-navy-900 hover:text-brand-700">
                      {product.name}
                    </Link>
                    <p className="break-anywhere text-xs text-navy-400">
                      {product.sku ?? "no SKU"} · /{product.slug}
                      {product.category ? ` · ${product.category.name}` : ""}
                    </p>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <Badge tone={product.dataStatus === "APPROVED" ? "success" : product.dataStatus === "DEMO" ? "demo" : "neutral"}>
                        {productDataStatusLabels[product.dataStatus]}
                      </Badge>
                      <span className="text-xs text-navy-500">
                        {product.isPublished ? "Published" : "Not published"}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {product.priceRwf === null ? (
                      <span className="text-xs text-amber-700">No approved price</span>
                    ) : (
                      formatRwf(product.priceRwf)
                    )}
                  </td>
                  <td>
                    <span className={product.stock <= product.lowStockThreshold ? "font-semibold text-amber-700" : ""}>
                      {product.stock}
                    </span>
                    <span className="block text-xs text-navy-400">threshold {product.lowStockThreshold}</span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(product.updatedAt)}</td>
                  <td className="text-right">
                    <Link href={`/admin/products/${product.id}`} className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {result.page > 1 ? (
            <Link href={build({ page: String(result.page - 1) })} className={buttonClasses("outline", "sm")}>
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-muted">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={build({ page: String(result.page + 1) })} className={buttonClasses("outline", "sm")}>
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
