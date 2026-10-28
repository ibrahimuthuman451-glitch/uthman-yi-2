import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, listCategories } from "@/server/services/admin-catalog";
import { ProductForm } from "@/components/admin/product-form";
import { AdminActionForm } from "@/components/admin/action-form";
import { adjustStockAction, archiveProductAction } from "@/app/actions/admin-catalog";
import type { ActionState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { productDataStatusLabels } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), listCategories()]);
  if (!product) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/products" className="text-xs font-semibold text-brand-700">
          ← Products
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900">{product.name}</h1>
          <Badge tone={product.dataStatus === "APPROVED" ? "success" : product.dataStatus === "DEMO" ? "demo" : "neutral"}>
            {productDataStatusLabels[product.dataStatus]}
          </Badge>
          {product.archivedAt ? <Badge tone="danger">Archived</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-navy-500">
          Last updated {formatDateTime(product.updatedAt)} · stock {product.stock} · threshold{" "}
          {product.lowStockThreshold}
        </p>
      </div>

      <ProductForm product={product} categories={categories} />

      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Adjust stock</h2>
          <p className="mt-1 text-xs text-muted">
            Every adjustment is recorded as a stock movement with your account as the actor.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={adjustStockAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel="Apply adjustment"
              resetOnSuccess
            >
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Change in units" htmlFor="delta" hint="Use a negative number to remove stock, e.g. -2." required>
                <Input id="delta" name="delta" type="number" step={1} required defaultValue={0} />
              </Field>
              <Field label="Reason or note" htmlFor="note">
                <Input id="note" name="note" maxLength={200} placeholder="Stock count correction" />
              </Field>
            </AdminActionForm>
          </div>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Archive or restore</h2>
          <p className="mt-1 text-xs text-muted">
            Archiving removes the listing from the shop without deleting its order history.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={archiveProductAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel={product.archivedAt ? "Restore as draft" : "Archive product"}
              variant={product.archivedAt ? "primary" : "danger"}
            >
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="archive" value={product.archivedAt ? "false" : "true"} />
            </AdminActionForm>
          </div>
        </section>
      </div>

      <section className="max-w-4xl rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Recent stock movements</h2>
        {product.stockMovements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No stock movements recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Change</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(movement.createdAt)}</td>
                    <td className={movement.delta > 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </td>
                    <td className="text-xs">{movement.reason.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="text-xs">{movement.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
