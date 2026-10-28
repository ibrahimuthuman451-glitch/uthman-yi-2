import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderByNumber } from "@/server/services/orders";
import { hasOrderAccess } from "@/lib/orders/access";
import { getSiteSettings } from "@/lib/settings";
import { formatRwf } from "@/lib/money";
import { formatDateTime, toInternationalPhone } from "@/lib/utils";
import {
  deliveryFeeStatusLabels,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/constants";
import { acceptsPaymentReference, paymentInstructions } from "@/lib/payments/instructions";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { PaymentReferenceForm } from "@/components/shop/payment-reference-form";
import { ClearCartAfterOrder } from "@/components/shop/clear-cart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

const STATUS_STEPS = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

type Params = Promise<{ orderNumber: string }>;

function paymentStatusTone(status: string) {
  if (status === "PAID") return "success" as const;
  if (status === "FAILED") return "danger" as const;
  if (status === "REFUNDED") return "neutral" as const;
  return "warning" as const;
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;
  const normalised = orderNumber.trim().toUpperCase();

  if (!(await hasOrderAccess(normalised))) {
    redirect(`/orders/track?order=${encodeURIComponent(normalised)}`);
  }

  const [order, settings] = await Promise.all([getOrderByNumber(normalised), getSiteSettings()]);
  if (!order) notFound();

  const currentStep = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);
  const needsPayment = order.paymentStatus !== "PAID" && order.status !== "CANCELLED";
  const showReferenceForm = needsPayment && acceptsPaymentReference(order.paymentMethod);
  const deliveryFeePending = order.deliveryFeeStatus === "PENDING_AGREEMENT";
  const deliveryIsFree = order.deliveryFeeStatus === "FREE";

  return (
    <div className="bg-surface">
      {placed === "1" ? <ClearCartAfterOrder orderNumber={order.orderNumber} /> : null}

      <div className="container-page py-10 sm:py-14">
        {placed === "1" ? (
          <Alert tone="success" title="Thank you — your order was received">
            Your order number is <strong>{order.orderNumber}</strong>. Keep it safe; you can use it
            with your email or phone number to track the order later.
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Order</p>
            <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-3xl">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={order.status === "CANCELLED" ? "danger" : "brand"}>
              {orderStatusLabels[order.status]}
            </Badge>
            <Badge tone={paymentStatusTone(order.paymentStatus)}>
              {paymentStatusLabels[order.paymentStatus]}
            </Badge>
            <Badge tone={order.deliveryFeeStatus === "PENDING_AGREEMENT" ? "warning" : "neutral"}>
              {deliveryFeeStatusLabels[order.deliveryFeeStatus]}
            </Badge>
          </div>
        </div>

        {order.status !== "CANCELLED" ? (
          <ol className="mt-8 grid gap-3 sm:grid-cols-5">
            {STATUS_STEPS.map((step, index) => {
              const done = currentStep >= index;
              return (
                <li
                  key={step}
                  className={
                    done
                      ? "rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-800"
                      : "rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-xs font-medium text-navy-400"
                  }
                >
                  <span className="block text-[10px] uppercase tracking-wide opacity-70">
                    Step {index + 1}
                  </span>
                  {orderStatusLabels[step]}
                </li>
              );
            })}
          </ol>
        ) : (
          <Alert tone="warning" className="mt-6">
            This order was cancelled. If this is unexpected, contact us on {settings.company.phone}.
          </Alert>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              <h2 className="border-b border-navy-100 px-5 py-4 text-base font-semibold text-navy-900">
                Items
              </h2>
              <ul className="divide-y divide-navy-100">
                {order.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-3 px-5 py-4 text-sm">
                    <div>
                      <p className="font-medium text-navy-900">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.quantity} × {formatRwf(item.unitPriceRwf)}
                        {item.sku ? ` · SKU ${item.sku}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-navy-900">{formatRwf(item.lineTotalRwf)}</p>
                  </li>
                ))}
              </ul>
              <dl className="space-y-2 border-t border-navy-100 px-5 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-navy-900">{formatRwf(order.subtotalRwf)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Delivery ({order.deliveryAreaName})</dt>
                  <dd className="text-right text-navy-900">
                    {order.deliveryFeeStatus === "PENDING_AGREEMENT"
                      ? "Confirmed by phone"
                      : order.deliveryFeeStatus === "WAIVED"
                        ? "Waived"
                        : order.deliveryFeeStatus === "FREE"
                          ? "Free"
                          : formatRwf(order.deliveryFeeRwf)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-navy-100 pt-2 text-base font-bold text-navy-900">
                  <dt>Total</dt>
                  <dd>{formatRwf(order.totalRwf)}</dd>
                </div>
              </dl>
              {deliveryIsFree ? (
                <p className="border-t border-navy-100 px-5 py-3 text-xs leading-5 text-emerald-700">
                  Free delivery across Rwanda — no delivery charge applies to this order.
                </p>
              ) : deliveryFeePending ? (
                <p className="border-t border-navy-100 px-5 py-3 text-xs leading-5 text-muted">
                  {settings.store.deliveryNotice} This products total is not the final delivered cost.
                </p>
              ) : order.deliveryFeeStatus === "AGREED" ? (
                <p className="border-t border-navy-100 px-5 py-3 text-xs leading-5 text-muted">
                  Delivery fee agreed by phone: {formatRwf(order.deliveryFeeRwf)}. The order total includes it.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Delivery details</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Name</dt>
                  <dd className="mt-0.5 text-navy-900">{order.customerName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Phone</dt>
                  <dd className="mt-0.5 text-navy-900">{order.customerPhone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Address</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-navy-900">{order.deliveryAddress}</dd>
                </div>
                {order.deliveryNotes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-navy-400">Notes</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-navy-900">{order.deliveryNotes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Order history</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {order.events.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <div>
                      <p className="text-navy-800">{event.message}</p>
                      <p className="text-xs text-navy-400">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Payment</h2>
              <p className="mt-2 text-sm text-navy-700">
                {paymentMethodLabels[order.paymentMethod]}
              </p>
              <p className="mt-1 text-xs text-muted">{paymentStatusLabels[order.paymentStatus]}</p>
              {order.paymentReference ? (
                <p className="mt-2 break-anywhere text-xs text-navy-600">
                  Reference: {order.paymentReference}
                </p>
              ) : null}

              {needsPayment ? (
                <div className="mt-4 rounded-xl bg-surface p-4 text-xs leading-5 text-navy-700">
                  {paymentInstructions(order.paymentMethod, settings)}
                </div>
              ) : null}

              {showReferenceForm ? <PaymentReferenceForm orderNumber={order.orderNumber} /> : null}

              <p className="mt-4 text-xs leading-5 text-muted">
                Payments are only marked as received after our team verifies your reference or the
                provider confirms the transaction. We never store card details.
              </p>
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Need help?</h2>
              <p className="mt-2 text-sm text-muted">Quote your order number when you contact us.</p>
              <div className="mt-3 flex flex-col gap-2">
                <a href={`tel:${settings.company.phone}`} className={buttonClasses("outline", "sm")}>
                  Call {settings.company.phone}
                </a>
                <a
                  href={`https://wa.me/${toInternationalPhone(settings.company.whatsappPhone || settings.company.phone)}?text=${encodeURIComponent(`Hello Uthman IY, I have a question about order ${order.orderNumber}.`)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses("outline", "sm")}
                >
                  WhatsApp about this order
                </a>
                <Link href="/orders/track" className={buttonClasses("ghost", "sm")}>
                  Track another order
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
