import Link from "next/link";
import { getPriceReviewOverview } from "@/server/services/price-review";
import { recordPriceReviewAction } from "@/app/actions/admin-price-review";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field, Select, Textarea } from "@/components/ui/field";
import { formatRwf } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { priceReviewKindLabels } from "@/lib/price-review";

export const dynamic = "force-dynamic";

export default async function PriceReviewPage() {
  const { settings, state, approvedCount, withReferenceCount, stale } =
    await getPriceReviewOverview();
  const review = settings.priceReview;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Reference price review</h1>
        <p className="mt-1 text-sm text-muted">
          Uthman IY reviews supplier reference prices every {state.intervalDays} days. This page records that a
          person completed a review &mdash; it never retrieves supplier prices and never changes a selling price.
        </p>
      </div>

      {state.isOverdue ? (
        <Alert tone="error" title="Price review is overdue">
          {state.label}. Approved prices stay unchanged until an administrator edits them deliberately.
        </Alert>
      ) : state.isDue ? (
        <Alert tone="warning" title="Price review is due">
          Review the reference prices below, then record the review. Nothing is changed automatically.
        </Alert>
      ) : (
        <Alert tone="success" title="Review schedule is up to date">
          {state.label}. Next due {state.dueAt ? formatDate(state.dueAt) : "-"}.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Last reviewed</p>
          <p className="mt-1.5 text-sm font-semibold text-navy-900">
            {review.lastReviewedAt ? formatDateTime(review.lastReviewedAt) : "Never recorded"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {review.lastReviewedBy ? `by ${review.lastReviewedBy}` : "No administrator has recorded a review"}
          </p>
          <p className="mt-1 text-xs text-muted">{priceReviewKindLabels[review.lastReviewKind]}</p>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Next review due</p>
          <p className="mt-1.5 text-sm font-semibold text-navy-900">
            {state.dueAt ? formatDate(state.dueAt) : "-"}
          </p>
          <Badge tone={state.tone} className="mt-2">
            {state.label}
          </Badge>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Reference captured</p>
          <p className="mt-1.5 text-sm font-semibold text-navy-900">
            {review.referenceCapturedAt ? formatDate(review.referenceCapturedAt) : "Unknown"}
          </p>
          <p className="mt-0.5 text-xs text-muted">Original capture date from the supplier catalogue</p>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Catalogue</p>
          <p className="mt-1.5 text-sm font-semibold text-navy-900">{approvedCount} approved price(s)</p>
          <p className="mt-0.5 text-xs text-muted">{withReferenceCount} listing(s) keep reference provenance</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Record a completed review</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Choose what actually happened. &ldquo;Existing catalogue checked&rdquo; means no supplier price was
            re-confirmed; &ldquo;supplier confirmed&rdquo; means a person verified the price with the supplier.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={recordPriceReviewAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel="Record review"
            >
              <Field label="What was reviewed?" htmlFor="kind" required>
                <Select id="kind" name="kind" defaultValue="INTERNAL_CHECK">
                  <option value="INTERNAL_CHECK">Existing catalogue checked internally (supplier not contacted)</option>
                  <option value="SUPPLIER_CONFIRMED">Supplier price confirmed by a person</option>
                </Select>
              </Field>
              <Field label="Note (optional)" htmlFor="note" hint="e.g. called the supplier, checked the price list, no changes needed.">
                <Textarea id="note" name="note" rows={3} maxLength={500} />
              </Field>
            </AdminActionForm>
          </div>
          {review.lastReviewNote ? (
            <p className="mt-3 rounded-lg bg-surface p-3 text-xs leading-5 text-navy-600">
              Last note: {review.lastReviewNote}
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-muted">
            Recording a review updates this schedule only. Selling prices change only when an administrator saves a
            product price.
          </p>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Oldest reference data</h2>
          <p className="mt-1 text-xs text-muted">
            Approved selling price vs the historical reference price and its source. The reference price is context, never
            the amount charged.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="admin-table min-w-[520px]">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Approved</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Retrieved</th>
                </tr>
              </thead>
              <tbody>
                {stale.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-navy-500">
                      No reference provenance stored.
                    </td>
                  </tr>
                ) : (
                  stale.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/admin/products/${product.id}`} className="font-medium text-navy-900 hover:text-brand-700">
                          {product.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-sm font-semibold">{formatRwf(product.priceRwf)}</td>
                      <td className="whitespace-nowrap text-sm text-navy-600">
                        {formatRwf(product.referencePriceRwf)}
                        <span className="block text-[10px] text-navy-400">{product.referenceSource ? "historical" : "-"}</span>
                      </td>
                      <td className="whitespace-nowrap text-xs text-navy-500">
                        {product.referenceRetrievedAt ? formatDate(product.referenceRetrievedAt) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            No automatic supplier feed is connected, so this table is not refreshed by the system. A weekly review is a
            manual check recorded on this page.
          </p>
        </section>
      </div>
    </div>
  );
}
