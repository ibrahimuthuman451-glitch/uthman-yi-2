import { listReferenceItems, referenceProvenance } from "@/server/services/reference-catalogue";
import { listCategories } from "@/server/services/admin-catalog";
import {
  convertReferenceItemAction,
  importReferenceCatalogueAction,
} from "@/app/actions/admin-catalog";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { formatRwf } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReferenceCataloguePage() {
  const [items, categories] = await Promise.all([listReferenceItems(), listCategories()]);

  const byCategory = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Reference catalogue research</h1>
        <p className="mt-1 text-sm text-muted">
          Third-party listings captured to plan categories and pricing. These are never Uthman IY
          prices and never appear in the shop.
        </p>
      </div>

      <Alert tone="warning" title="Read before using this data">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Source: {referenceProvenance.sourceCompany} ({referenceProvenance.sourceUrl}), retrieved{" "}
            {formatDate(referenceProvenance.retrievedAt)} from its public storefront catalogue.
          </li>
          <li>
            Images, marketing descriptions and stock quantities were deliberately not captured:
            reusing them requires written permission from the copyright owner.
          </li>
          <li>
            A converted draft contains no approved price. Set Uthman IY&apos;s own price, write its own
            description, add approved photography and confirm stock before publishing.
          </li>
        </ul>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-navy-400">Rows</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-navy-400">Categories</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{Object.keys(byCategory).length}</p>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-navy-400">Store categories available</p>
          <p className="mt-1 text-sm text-navy-800">{categories.map((category) => category.name).join(", ")}</p>
        </div>
      </div>

      <div className="max-w-sm">
        <AdminActionForm
          action={importReferenceCatalogueAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
          submitLabel="Import bundled research file"
        >
          <p className="text-xs leading-5 text-muted">
            Imports the bundled dataset (data/reference/fabritech-catalogue-2026-10-25.json).
            Existing rows are skipped, never overwritten.
          </p>
        </AdminActionForm>
      </div>

      <div className="table-wrap">
        <table className="admin-table min-w-[820px]">
          <thead>
            <tr>
              <th scope="col">Reference listing</th>
              <th scope="col">Category</th>
              <th scope="col">Reference price</th>
              <th scope="col">Retrieved</th>
              <th scope="col">Draft</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <p className="font-medium text-navy-900">{item.title}</p>
                  <p className="break-anywhere text-xs text-navy-400">{item.sourceUrl}</p>
                </td>
                <td className="text-xs">
                  {item.category}
                  <span className="block text-navy-400">{item.categorySlug}</span>
                </td>
                <td className="whitespace-nowrap text-sm">
                  {formatRwf(item.referencePriceRwf)}
                  <span className="block text-[10px] uppercase tracking-wide text-navy-400">
                    reference only
                  </span>
                </td>
                <td className="whitespace-nowrap text-xs text-navy-500">{formatDate(item.retrievedAt)}</td>
                <td>
                  {item.convertedProductId ? (
                    <span className="text-xs text-emerald-700">Draft created</span>
                  ) : (
                    <AdminActionForm
                      action={convertReferenceItemAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                      submitLabel="Create draft"
                      variant="outline"
                      submitClassName="px-3 py-1.5 text-xs"
                    >
                      <input type="hidden" name="referenceId" value={item.id} />
                    </AdminActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
