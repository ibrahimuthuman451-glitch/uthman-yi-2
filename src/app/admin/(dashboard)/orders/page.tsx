import Link from "next/link";
import { listOrdersForAdmin } from "@/server/services/orders";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/constants";
import { formatRwf } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = (Object.keys(orderStatusLabels) as OrderStatus[]).includes(
    params.status as OrderStatus,
  )
    ? (params.status as OrderStatus)
    : "ALL";

  const result = await listOrdersForAdmin({
    search: params.q,
    status,
    page: Number(params.page) || 1,
  });

  const build = (page?: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (status !== "ALL") search.set("status", status);
    if (page && page > 1) search.set("page", String(page));
    const query = search.toString();
    return `/admin/orders${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Orders</h1>
        <p className="mt-1 text-sm text-muted">{result.total} order(s) recorded.</p>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border border-navy-100 bg-white p-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-navy-600 sm:col-span-2">
          Search
          <input name="q" defaultValue={params.q ?? ""} className="field-input mt-1" placeholder="Order number, name, email or phone" />
        </label>
        <label className="text-xs font-medium text-navy-600">
          Status
          <select name="status" defaultValue={status} className="field-input mt-1">
            <option value="ALL">All statuses</option>
            {(Object.keys(orderStatusLabels) as OrderStatus[]).map((key) => (
              <option key={key} value={key}>
                {orderStatusLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-3">
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Search
          </button>
          <Link href="/admin/orders" className={buttonClasses("ghost", "md")}>
            Reset
          </Link>
        </div>
      </form>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Total</th>
              <th scope="col">Payment</th>
              <th scope="col">Fulfilment</th>
              <th scope="col">Placed</th>
            </tr>
          </thead>
          <tbody>
            {result.orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-navy-500">
                  No orders match this filter.
                </td>
              </tr>
            ) : (
              result.orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-navy-900 hover:text-brand-700">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-navy-400">{order.items.length} item line(s)</p>
                  </td>
                  <td>
                    <p className="text-sm text-navy-900">{order.customerName}</p>
                    <p className="break-anywhere text-xs text-navy-400">{order.customerPhone}</p>
                  </td>
                  <td className="whitespace-nowrap font-medium">{formatRwf(order.totalRwf)}</td>
                  <td>
                    <Badge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>
                      {paymentStatusLabels[order.paymentStatus]}
                    </Badge>
                    <p className="mt-1 text-[11px] text-navy-400">
                      {order.paymentMethod.replaceAll("_", " ").toLowerCase()}
                    </p>
                  </td>
                  <td>
                    <Badge tone={order.status === "CANCELLED" ? "danger" : order.status === "COMPLETED" ? "success" : "neutral"}>
                      {orderStatusLabels[order.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {result.page > 1 ? (
            <Link href={build(result.page - 1)} className={buttonClasses("outline", "sm")}>
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-muted">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={build(result.page + 1)} className={buttonClasses("outline", "sm")}>
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
