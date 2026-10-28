import Link from "next/link";
import { notFound } from "next/navigation";
import { getInquiry } from "@/server/services/inquiries";
import { updateInquiryAction } from "@/app/actions/admin-inquiries";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { inquiryStatusLabels, inquiryTypeLabels } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { InquiryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(id);
  if (!inquiry) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/inquiries" className="text-xs font-semibold text-brand-700">
          ← Inquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900">{inquiry.subject || "Inquiry"}</h1>
          <Badge tone={inquiry.status === "NEW" ? "brand" : "neutral"}>
            {inquiryStatusLabels[inquiry.status]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-navy-500">
          {inquiryTypeLabels[inquiry.type]} · received {formatDateTime(inquiry.createdAt)}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Message</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-navy-800">{inquiry.message}</p>
          <dl className="mt-5 grid gap-3 border-t border-navy-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Name</dt>
              <dd className="text-navy-900">{inquiry.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-400">Email</dt>
              <dd className="break-anywhere text-navy-900">
                <a href={`mailto:${inquiry.email}`} className="hover:text-brand-700">
                  {inquiry.email}
                </a>
              </dd>
            </div>
            {inquiry.phone ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Phone</dt>
                <dd className="text-navy-900">
                  <a href={`tel:${inquiry.phone}`} className="hover:text-brand-700">
                    {inquiry.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {inquiry.company ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Company</dt>
                <dd className="text-navy-900">{inquiry.company}</dd>
              </div>
            ) : null}
            {inquiry.productSlug ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Product</dt>
                <dd className="text-navy-900">{inquiry.productSlug}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject ?? "Your inquiry"}`)}`} className={buttonClasses("outline", "sm")}>
              Reply by email client
            </a>
            {inquiry.phone ? (
              <a href={`tel:${inquiry.phone}`} className={buttonClasses("outline", "sm")}>
                Call
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">
            This build has no outbound email provider configured, so replies are sent from your own
            email client or by phone.
          </p>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Handle inquiry</h2>
          <div className="mt-4">
            <AdminActionForm
              action={updateInquiryAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel="Save"
            >
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <Field label="Status" htmlFor="status" required>
                <Select id="status" name="status" defaultValue={inquiry.status}>
                  {(Object.keys(inquiryStatusLabels) as InquiryStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {inquiryStatusLabels[key]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Internal notes" htmlFor="adminNotes" hint="Only visible to staff.">
                <Textarea id="adminNotes" name="adminNotes" rows={5} defaultValue={inquiry.adminNotes ?? ""} maxLength={2000} />
              </Field>
            </AdminActionForm>
          </div>
          {inquiry.handledBy ? (
            <p className="mt-3 text-xs text-navy-500">
              Last handled by {inquiry.handledBy.name}
              {inquiry.handledAt ? ` on ${formatDateTime(inquiry.handledAt)}` : ""}.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
