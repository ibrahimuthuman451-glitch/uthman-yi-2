import Link from "next/link";
import type { Category, Product } from "@prisma/client";
import { AdminActionForm } from "@/components/admin/action-form";
import { saveProductAction } from "@/app/actions/admin-catalog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatSpecifications } from "@/lib/validation/content";
import { formatRwf } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

export function ProductForm({
  product,
  categories,
}: {
  product: Product | null;
  categories: (Category & { _count?: { products: number } })[];
}) {
  return (
    <AdminActionForm
      action={saveProductAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
      submitLabel={product ? "Save product" : "Create product"}
      className="max-w-4xl"
    >
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Product information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Product name" htmlFor="name" required className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={product?.name ?? ""} required maxLength={160} />
          </Field>
          <Field label="URL slug" htmlFor="slug" hint="Leave blank to generate one from the name.">
            <Input id="slug" name="slug" defaultValue={product?.slug ?? ""} maxLength={80} />
          </Field>
          <Field label="SKU" htmlFor="sku" hint="Internal stock code. Must be unique if provided.">
            <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} maxLength={60} />
          </Field>
          <Field label="Category" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Short description" htmlFor="shortDescription" hint="Shown on product cards and search results.">
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={product?.shortDescription ?? ""}
              maxLength={300}
            />
          </Field>
          <Field label="Full description" htmlFor="description" className="sm:col-span-2">
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              rows={6}
              maxLength={6000}
            />
          </Field>
          <Field
            label="Specifications"
            htmlFor="specifications"
            className="sm:col-span-2"
            hint="One per line as Label: Value, e.g. Resolution: 4MP"
          >
            <Textarea
              id="specifications"
              name="specifications"
              defaultValue={formatSpecifications(product?.specifications)}
              rows={4}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Price and stock</h2>

        {product ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-navy-100 bg-surface p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Approved selling price
              </p>
              <p className="mt-1 text-base font-bold text-navy-900">
                {formatRwf(product.priceRwf)}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                This is what customers are charged in the shop, cart, checkout and order record.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Reference price (historical)
              </p>
              <p className="mt-1 text-base font-semibold text-navy-700">
                {product.referencePriceRwf === null ? "Not recorded" : formatRwf(product.referencePriceRwf)}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {product.referencePriceRwf === null
                  ? "No supplier reference price is stored for this listing."
                  : `Context only - never charged. Captured ${formatDate(product.referenceRetrievedAt)} from ${product.referenceSource ?? "an unspecified source"}.`}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Approved selling price (RWF)"
            htmlFor="price"
            hint="Whole francs only. Required before an approved listing can be published."
          >
            <Input
              id="price"
              name="price"
              inputMode="numeric"
              defaultValue={product?.priceRwf ?? ""}
              placeholder="e.g. 650000"
            />
          </Field>
          <Field
            label="Compare-at price (optional)"
            htmlFor="compareAtPrice"
            hint="Only use if the previous price was genuinely offered."
          >
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              inputMode="numeric"
              defaultValue={product?.compareAtPriceRwf ?? ""}
            />
          </Field>
          <Field label="Stock on hand" htmlFor="stock" required>
            <Input
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.stock ?? 0}
              required
            />
          </Field>
          <Field label="Low stock threshold" htmlFor="lowStockThreshold" required hint="Warn when stock falls to this level.">
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.lowStockThreshold ?? 5}
              required
            />
          </Field>
          <Field
            label="Listing status"
            htmlFor="dataStatus"
            required
            hint="Reference: research only. Demo: clearly labelled sample data. Approved: real, owner-approved product."
          >
            <Select id="dataStatus" name="dataStatus" defaultValue={product?.dataStatus ?? "APPROVED"}>
              <option value="APPROVED">Approved listing</option>
              <option value="DEMO">Demonstration listing</option>
              <option value="REFERENCE">Reference research</option>
            </Select>
          </Field>
          <div className="space-y-3 rounded-xl bg-surface p-4">
            <Checkbox
              id="isPublished"
              name="isPublished"
              defaultChecked={product?.isPublished ?? false}
              label="Published in the shop"
            />
            <Checkbox
              id="featured"
              name="featured"
              defaultChecked={product?.featured ?? false}
              label="Feature on the homepage"
            />
          </div>
        </div>
        {product?.referencePriceRwf ? (
          <p className="mt-3 rounded-lg border border-navy-100 bg-surface p-3 text-xs leading-5 text-navy-600">
            Editing the approved price above does not change the stored reference price or its source; the
            historical pair is kept for the weekly price review.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Image</h2>
        <div className="mt-4 grid gap-4">
          <Field
            label="Image URL"
            htmlFor="imageUrl"
            hint="https:// URL on approved storage, or a path such as /products/item.webp. Leave blank to show a labelled placeholder."
          >
            <Input id="imageUrl" name="imageUrl" defaultValue={product?.imageUrl ?? ""} />
          </Field>
          <Field label="Image alt text" htmlFor="imageAlt" hint="Describe the product for screen readers.">
            <Input id="imageAlt" name="imageAlt" defaultValue={product?.imageAlt ?? ""} maxLength={200} />
          </Field>
          <p className="text-xs leading-5 text-muted">
            Uploads are not enabled in this build: there is no storage provider connected. Use an
            approved image URL, or add files under <code>public/</code> and reference the path. Do not
            reuse another company&apos;s product photography without written permission.
          </p>
        </div>
      </section>

      <p className="text-xs text-muted">
        Need to restore an archived product? Open it from the{" "}
        <Link href="/admin/products?archived=1" className="font-semibold text-brand-700">
          archived list
        </Link>
        .
      </p>
    </AdminActionForm>
  );
}
