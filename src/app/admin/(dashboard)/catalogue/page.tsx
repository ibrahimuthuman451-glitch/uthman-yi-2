import Link from "next/link";
import { importCatalogueAction } from "@/app/actions/admin-catalog";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Field, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogueIoPage() {
  const [products, categories] = await Promise.all([
    db.product.count(),
    db.category.count(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Catalogue import and export</h1>
        <p className="mt-1 text-sm text-muted">
          Move catalogue data between environments in a documented JSON format, or export a CSV for
          spreadsheet work. {products} product(s) and {categories} category/categories currently
          stored.
        </p>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Export</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Exports include every listing, including demo and reference rows, so you can audit what is
          stored. Treat the file as business data and keep it private.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/admin/catalogue/export?format=json" className={buttonClasses("outline", "md")}>
            Download JSON
          </a>
          <a href="/api/admin/catalogue/export?format=csv" className={buttonClasses("outline", "md")}>
            Download CSV
          </a>
        </div>
      </section>

      <section className="max-w-3xl rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Import</h2>
        <Alert tone="info" className="mt-3">
          <p className="font-semibold">JSON format</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-navy-950 p-3 text-[11px] leading-5 text-navy-100">
{`{
  "products": [
    {
      "name": "Product name",
      "sku": "UY-001",
      "categorySlug": "cctv-cameras",
      "shortDescription": "One line",
      "description": "Longer text",
      "specifications": [{ "label": "Resolution", "value": "4MP" }],
      "priceRwf": 95000,
      "stock": 5,
      "lowStockThreshold": 2,
      "dataStatus": "APPROVED",
      "isPublished": true,
      "imageUrl": "/products/example.webp",
      "imageAlt": "Example product"
    }
  ]
}`}
          </pre>
        </Alert>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-muted">
          <li>Matching is by SKU first, then by slug. Existing rows are updated; nothing is deleted.</li>
          <li>An unknown <code>categorySlug</code> fails that row rather than creating a new category.</li>
          <li>Defaults: <code>dataStatus</code> REFERENCE, <code>isPublished</code> false, stock 0 — imports never publish silently.</li>
          <li>Use <code>imageUrl</code> only for images Uthman IY is authorised to use.</li>
        </ul>
        <div className="mt-4">
          <AdminActionForm
            action={importCatalogueAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
            submitLabel="Validate and import"
          >
            <Field label="Catalogue JSON" htmlFor="payload" required hint="Paste the full JSON object.">
              <Textarea id="payload" name="payload" rows={10} required />
            </Field>
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <input type="checkbox" name="updatePrices" className="mt-0.5 h-4 w-4 rounded border-amber-300" />
              <span>
                <span className="font-semibold">Overwrite existing approved prices</span>
                <br />
                Leave this off for a normal catalogue refresh. With it off, every price already stored is preserved,
                even if the JSON contains a different amount.
              </span>
            </label>
          </AdminActionForm>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Full documentation lives in <code>docs/CATALOGUE_FORMAT.md</code>. New products can also be
          created individually from the{" "}
          <Link href="/admin/products/new" className="font-semibold text-brand-700">
            product form
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
