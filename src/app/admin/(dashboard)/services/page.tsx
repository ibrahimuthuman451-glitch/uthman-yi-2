import Link from "next/link";
import { listServices, readStringArray } from "@/server/services/content";
import { saveServiceAction } from "@/app/actions/admin-content";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await listServices({ includeUnpublished: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Software development services</h1>
        <p className="mt-1 text-sm text-muted">
          Service descriptions appear on the Software Development pages and the homepage. Avoid
          invented client names, statistics or certifications.
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <details key={service.id} className="group rounded-2xl border border-navy-100 bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-navy-900">{service.title}</span>
                  {!service.isPublished ? <Badge tone="danger">Hidden</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-navy-500">/software-development/{service.slug}</p>
              </div>
              <span className="text-xs font-semibold text-brand-700 group-open:hidden">Edit</span>
              <span className="hidden text-xs font-semibold text-brand-700 group-open:inline">Close</span>
            </summary>

            <div className="mt-5 border-t border-navy-100 pt-5">
              <AdminActionForm
                action={saveServiceAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                submitLabel="Save service"
              >
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" htmlFor={`title-${service.id}`} required>
                    <Input id={`title-${service.id}`} name="title" defaultValue={service.title} required maxLength={120} />
                  </Field>
                  <Field label="Slug" htmlFor={`slug-${service.id}`}>
                    <Input id={`slug-${service.id}`} name="slug" defaultValue={service.slug} maxLength={80} />
                  </Field>
                  <Field label="Summary" htmlFor={`summary-${service.id}`} required className="sm:col-span-2">
                    <Textarea id={`summary-${service.id}`} name="summary" defaultValue={service.summary} rows={2} required maxLength={300} />
                  </Field>
                  <Field label="Description" htmlFor={`description-${service.id}`} required className="sm:col-span-2">
                    <Textarea id={`description-${service.id}`} name="description" defaultValue={service.description} rows={8} required maxLength={4000} />
                  </Field>
                  <Field
                    label="Business benefits"
                    htmlFor={`benefits-${service.id}`}
                    hint="One benefit per line."
                  >
                    <Textarea id={`benefits-${service.id}`} name="benefits" defaultValue={readStringArray(service.benefits).join("\n")} rows={5} />
                  </Field>
                  <Field
                    label="Deliverables"
                    htmlFor={`deliverables-${service.id}`}
                    hint="One deliverable per line."
                  >
                    <Textarea id={`deliverables-${service.id}`} name="deliverables" defaultValue={readStringArray(service.deliverables).join("\n")} rows={5} />
                  </Field>
                  <Field label="Sort order" htmlFor={`sort-${service.id}`}>
                    <Input id={`sort-${service.id}`} name="sortOrder" type="number" min={0} defaultValue={service.sortOrder} />
                  </Field>
                  <div className="flex items-end">
                    <Checkbox id={`published-${service.id}`} name="isPublished" defaultChecked={service.isPublished} label="Published" />
                  </div>
                </div>
                <p className="text-xs text-navy-500">
                  <Link href={`/software-development/${service.slug}`} className="font-semibold text-brand-700">
                    View public page
                  </Link>
                </p>
              </AdminActionForm>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
