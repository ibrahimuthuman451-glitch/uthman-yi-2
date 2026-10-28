import Link from "next/link";
import { listSoftwareProducts, readFeatures, readStringArray } from "@/server/services/content";
import { saveSoftwareProductAction } from "@/app/actions/admin-content";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { softwareStatusLabels } from "@/lib/constants";
import { formatFeatureRows } from "@/lib/validation/content";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSoftwarePage() {
  const products = await listSoftwareProducts({ includeUnpublished: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Software products</h1>
        <p className="mt-1 text-sm text-muted">
          MatchVision AI, Digital Discipline and Tender AI are separate products. Keep each status
          and feature list honest: mark anything not implemented as planned.
        </p>
      </div>

      <div className="space-y-4">
        {products.map((product) => (
          <details key={product.id} className="group rounded-2xl border border-navy-100 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-navy-900">{product.name}</span>
                  <Badge tone={product.status === "LIVE" ? "success" : product.status === "IN_DEVELOPMENT" ? "warning" : "neutral"}>
                    {softwareStatusLabels[product.status]}
                  </Badge>
                  {!product.isPublished ? <Badge tone="danger">Hidden</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-navy-500">
                  /software/{product.slug} · updated {formatDateTime(product.updatedAt)}
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-700 group-open:hidden">Edit</span>
              <span className="hidden text-xs font-semibold text-brand-700 group-open:inline">Close</span>
            </summary>

            <div className="mt-5 border-t border-navy-100 pt-5">
              <AdminActionForm
                action={saveSoftwareProductAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                submitLabel="Save product"
              >
                <input type="hidden" name="productId" value={product.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" htmlFor={`name-${product.id}`} required>
                    <Input id={`name-${product.id}`} name="name" defaultValue={product.name} required maxLength={120} />
                  </Field>
                  <Field label="Slug" htmlFor={`slug-${product.id}`}>
                    <Input id={`slug-${product.id}`} name="slug" defaultValue={product.slug} maxLength={80} />
                  </Field>
                  <Field label="Tagline" htmlFor={`tagline-${product.id}`} required className="sm:col-span-2">
                    <Input id={`tagline-${product.id}`} name="tagline" defaultValue={product.tagline} required maxLength={200} />
                  </Field>
                  <Field label="Summary" htmlFor={`summary-${product.id}`} required className="sm:col-span-2">
                    <Textarea id={`summary-${product.id}`} name="summary" defaultValue={product.summary} rows={2} required maxLength={400} />
                  </Field>
                  <Field label="Full description" htmlFor={`description-${product.id}`} required className="sm:col-span-2">
                    <Textarea id={`description-${product.id}`} name="description" defaultValue={product.description} rows={8} required maxLength={8000} />
                  </Field>
                  <Field label="Status" htmlFor={`status-${product.id}`} required>
                    <Select id={`status-${product.id}`} name="status" defaultValue={product.status}>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="IN_DEVELOPMENT">In development</option>
                      <option value="TESTING">In testing</option>
                      <option value="LIVE">Live</option>
                    </Select>
                  </Field>
                  <Field label="Accent colour" htmlFor={`accent-${product.id}`} required>
                    <Input id={`accent-${product.id}`} name="accentColor" defaultValue={product.accentColor} required />
                  </Field>
                  <Field
                    label="Status explanation"
                    htmlFor={`statusNote-${product.id}`}
                    className="sm:col-span-2"
                    hint="Shown prominently on the product page. State what is not verified."
                  >
                    <Textarea id={`statusNote-${product.id}`} name="statusNote" defaultValue={product.statusNote} rows={2} maxLength={400} />
                  </Field>
                  <Field
                    label="Audience"
                    htmlFor={`audience-${product.id}`}
                    hint="One audience group per line."
                    className="sm:col-span-2"
                  >
                    <Textarea id={`audience-${product.id}`} name="audience" defaultValue={readStringArray(product.audience).join("\n")} rows={3} />
                  </Field>
                  <Field
                    label="Features"
                    htmlFor={`features-${product.id}`}
                    className="sm:col-span-2"
                    hint="One per line: STATUS | Title | Description. STATUS is LIVE, EXPERIMENTAL or PLANNED."
                  >
                    <Textarea id={`features-${product.id}`} name="features" defaultValue={formatFeatureRows(product.features)} rows={6} />
                  </Field>
                  <Field label="Demo URL (optional)" htmlFor={`demo-${product.id}`} hint="Only link a demonstration that really exists.">
                    <Input id={`demo-${product.id}`} name="demoUrl" defaultValue={product.demoUrl ?? ""} />
                  </Field>
                  <Field label="Call to action label" htmlFor={`cta-${product.id}`}>
                    <Input id={`cta-${product.id}`} name="ctaLabel" defaultValue={product.ctaLabel} maxLength={80} />
                  </Field>
                  <Field label="Sort order" htmlFor={`sort-${product.id}`}>
                    <Input id={`sort-${product.id}`} name="sortOrder" type="number" min={0} defaultValue={product.sortOrder} />
                  </Field>
                  <div className="flex items-end">
                    <Checkbox id={`published-${product.id}`} name="isPublished" defaultChecked={product.isPublished} label="Published" />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Feature rows currently stored: {readFeatures(product.features).length}. Keep claims
                  consistent with what has been built and tested.
                </p>
              </AdminActionForm>

              <p className="mt-3 text-xs text-navy-500">
                Public page:{" "}
                <Link href={`/software/${product.slug}`} className="font-semibold text-brand-700">
                  /software/{product.slug}
                </Link>
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
