import Link from "next/link";
import { getOrderStats, listDeliveryAreas, listOrdersForAdmin } from "@/server/services/orders";
import { db } from "@/lib/db";
import { listLowStockProducts } from "@/server/services/admin-catalog";
import { listInquiries } from "@/server/services/inquiries";
import { getSiteSettings } from "@/lib/settings";
import { getEnv, isEmailConfigured } from "@/lib/env";
import { hasOfficialLogo } from "@/components/site/logo";
import { buildPaymentOptions } from "@/lib/payments/options";
import { formatRwf } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/constants";
import { getPriceReviewStateFromSettings } from "@/lib/price-review";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, recent, lowStock, inquiries, settings, areas] = await Promise.all([
    getOrderStats(),
    listOrdersForAdmin({ pageSize: 5 }),
    listLowStockProducts(5),
    listInquiries({ status: "NEW", pageSize: 5 }),
    getSiteSettings(),
    listDeliveryAreas(),
  ]);

  const env = getEnv();
  const paymentOptions = buildPaymentOptions(settings, env);
  const priceReview = getPriceReviewStateFromSettings(settings);
  const demoCount = await db.product.count({
    where: { dataStatus: "DEMO", archivedAt: null },
  });

  const checklist = [
    {
      label: "Upload the official Uthman IY logo",
      detail: "The site is using a temporary text wordmark until the logo file is supplied.",
      done: hasOfficialLogo(),
      href: null as string | null,
    },
    {
      label: "Confirm delivery areas and fees",
      detail:
        areas.some((area) => area.feeRwf === 0)
          ? "At least one delivery area still has a zero fee that was seeded as a placeholder."
          : "Delivery areas are configured.",
      done: areas.length > 0 && !areas.some((area) => area.feeRwf === 0),
      href: "/admin/settings",
    },
    {
      label: "Weekly reference-price review",
      detail: `${priceReview.label}${
        settings.priceReview.lastReviewedAt
          ? ` - last reviewed ${settings.priceReview.lastReviewedAt.slice(0, 10)}`
          : " - no review recorded yet"
      }. Reviewing never changes prices automatically.`,
      done: !priceReview.isDue,
      href: "/admin/price-review",
    },
    {
      label: "Publish approved products",
      detail: "Review demo or reference listings and publish only owner-approved products.",
      done: demoCount === 0,
      href: "/admin/products",
    },
    {
      label: "Configure a payment method",
      detail: paymentOptions
        .filter((option) => option.enabled)
        .map((option) => option.label)
        .join(", ") || "No payment method is enabled.",
      done: paymentOptions.some((option) => option.enabled),
      href: "/admin/settings",
    },
    {
      label: "Email delivery for inquiries",
      detail: isEmailConfigured()
        ? "SMTP is configured."
        : "No SMTP provider is configured; inquiries are stored and shown here only.",
      done: isEmailConfigured(),
      href: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Business overview. Figures come from real orders and inquiries in the database.
          </p>
        </div>
        <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
          Add product
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Orders", value: String(stats.totalOrders), detail: `${stats.awaitingPayment} awaiting payment` },
          { label: "To fulfil", value: String(stats.toProcess), detail: `${stats.completed} completed` },
          { label: "Paid revenue", value: formatRwf(stats.paidRevenueRwf), detail: "Confirmed payments only" },
          { label: "New inquiries", value: String(stats.newInquiries), detail: `${stats.lowStockCount} low-stock listings` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-navy-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{card.label}</p>
            <p className="mt-1.5 break-anywhere text-xl font-bold text-navy-900">{card.value}</p>
            <p className="mt-0.5 text-xs text-muted">{card.detail}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Launch checklist</h2>
        <ul className="mt-3 divide-y divide-navy-50">
          {checklist.map((item) => (
            <li key={item.label} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={
                    item.done
                      ? "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                      : "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
                  }
                >
                  {item.done ? "✓" : "!"}
                </span>
                <div>
                  <p className="text-sm font-medium text-navy-900">{item.label}</p>
                  <p className="text-xs leading-5 text-muted">{item.detail}</p>
                </div>
              </div>
              {item.href ? (
                <Link href={item.href} className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                  Open →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-navy-100 bg-white">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
            <h2 className="text-base font-semibold text-navy-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-brand-700">
              All orders →
            </Link>
          </div>
          {recent.orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {recent.orders.map((order) => (
                <li key={order.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-semibold text-navy-900 hover:text-brand-700"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-sm font-medium text-navy-900">{formatRwf(order.totalRwf)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{order.customerName}</span>
                    <Badge tone="neutral">{orderStatusLabels[order.status]}</Badge>
                    <span>{paymentStatusLabels[order.paymentStatus]}</span>
                    <span>· {formatDateTime(order.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-navy-100 bg-white">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
              <h2 className="text-base font-semibold text-navy-900">Low stock</h2>
              <Link href="/admin/products?lowStock=1" className="text-xs font-semibold text-brand-700">
                Manage →
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No published product is below its threshold.</p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <Link href={`/admin/products/${product.id}`} className="truncate hover:text-brand-700">
                      {product.name}
                    </Link>
                    <span className="shrink-0 text-xs font-semibold text-amber-700">
                      {product.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
              <h2 className="text-base font-semibold text-navy-900">New inquiries</h2>
              <Link href="/admin/inquiries" className="text-xs font-semibold text-brand-700">
                All →
              </Link>
            </div>
            {inquiries.inquiries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No new inquiries.</p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {inquiries.inquiries.map((inquiry) => (
                  <li key={inquiry.id} className="px-5 py-2.5">
                    <Link
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="text-sm font-medium text-navy-900 hover:text-brand-700"
                    >
                      {inquiry.subject || inquiry.type}
                    </Link>
                    <p className="text-xs text-muted">
                      {inquiry.name} · {formatDateTime(inquiry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
