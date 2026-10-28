import Link from "next/link";
import { listInquiries } from "@/server/services/inquiries";
import { inquiryStatusLabels, inquiryTypeLabels } from "@/lib/constants";
import { formatDateTime, truncate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { InquiryStatus, InquiryType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = (["NEW", "IN_REVIEW", "CLOSED", "SPAM"] as const).includes(params.status as InquiryStatus)
    ? (params.status as InquiryStatus)
    : "ALL";
  const type = Object.keys(inquiryTypeLabels).includes(params.type ?? "")
    ? (params.type as InquiryType)
    : "ALL";

  const result = await listInquiries({
    search: params.q,
    status,
    type,
    page: Number(params.page) || 1,
  });

  const build = (page?: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (status !== "ALL") search.set("status", status);
    if (type !== "ALL") search.set("type", type);
    if (page && page > 1) search.set("page", String(page));
    const query = search.toString();
    return `/admin/inquiries${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Inquiries</h1>
        <p className="mt-1 text-sm text-muted">
          {result.total} message(s) from the website forms. Email delivery is not configured by
          default, so this list is the source of truth.
        </p>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border border-navy-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-navy-600">
          Search
          <input name="q" defaultValue={params.q ?? ""} className="field-input mt-1" placeholder="Name, email or message" />
        </label>
        <label className="text-xs font-medium text-navy-600">
          Status
          <select name="status" defaultValue={status} className="field-input mt-1">
            <option value="ALL">All statuses</option>
            {Object.entries(inquiryStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-navy-600">
          Category
          <select name="type" defaultValue={type} className="field-input mt-1">
            <option value="ALL">All categories</option>
            {Object.entries(inquiryTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Filter
          </button>
          <Link href="/admin/inquiries" className={buttonClasses("ghost", "md")}>
            Reset
          </Link>
        </div>
      </form>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">Category</th>
              <th scope="col">Message</th>
              <th scope="col">Status</th>
              <th scope="col">Received</th>
            </tr>
          </thead>
          <tbody>
            {result.inquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-navy-500">No inquiries match this filter.</td>
              </tr>
            ) : (
              result.inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>
                    <Link href={`/admin/inquiries/${inquiry.id}`} className="font-medium text-navy-900 hover:text-brand-700">
                      {inquiry.name}
                    </Link>
                    <p className="break-anywhere text-xs text-navy-400">{inquiry.email}</p>
                    {inquiry.phone ? <p className="text-xs text-navy-400">{inquiry.phone}</p> : null}
                  </td>
                  <td className="text-xs">
                    {inquiryTypeLabels[inquiry.type]}
                    {inquiry.productSlug ? (
                      <span className="block text-navy-400">{inquiry.productSlug}</span>
                    ) : null}
                  </td>
                  <td className="max-w-xs">
                    <p className="text-xs font-medium text-navy-800">{inquiry.subject ?? "(no subject)"}</p>
                    <p className="mt-0.5 text-xs text-navy-500">{truncate(inquiry.message, 90)}</p>
                  </td>
                  <td>
                    <Badge tone={inquiry.status === "NEW" ? "brand" : inquiry.status === "CLOSED" ? "success" : inquiry.status === "SPAM" ? "danger" : "warning"}>
                      {inquiryStatusLabels[inquiry.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(inquiry.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {result.page > 1 ? (
            <Link href={build(result.page - 1)} className={buttonClasses("outline", "sm")}>Previous</Link>
          ) : null}
          <span className="text-sm text-muted">Page {result.page} of {result.pageCount}</span>
          {result.page < result.pageCount ? (
            <Link href={build(result.page + 1)} className={buttonClasses("outline", "sm")}>Next</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
