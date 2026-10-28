import type { Metadata } from "next";
import Link from "next/link";
import { TrackOrderForm } from "@/components/shop/track-order-form";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check the status of an Uthman IY order using your order number and the email address or phone number used at checkout.",
  robots: { index: false, follow: false },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const settings = await getSiteSettings();

  return (
    <div className="bg-surface">
      <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <p className="eyebrow">Order tracking</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Track your order</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Enter your order number together with the email address or phone number you used at
            checkout. We only show an order when both match, so order details stay private.
          </p>

          <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
            <TrackOrderForm defaultOrderNumber={order ?? ""} />
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            Lost your order number? Call{" "}
            <a className="font-semibold text-brand-700" href={`tel:${settings.company.phone}`}>
              {settings.company.phone}
            </a>{" "}
            or <Link className="font-semibold text-brand-700" href="/contact?type=ORDER_SUPPORT">send an order-support message</Link>.
          </p>
        </div>

        <aside className="rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="text-base font-semibold text-navy-900">How order status works</h2>
          <ol className="mt-4 space-y-4 text-sm text-navy-700">
            {[
              { title: "Awaiting payment", body: "The order is saved. For cash on delivery and manual payments, our team confirms the payment before dispatch." },
              { title: "Paid", body: "Payment has been verified by our team or confirmed by the payment provider." },
              { title: "Processing", body: "We are preparing your items and confirming the delivery arrangement with you." },
              { title: "Out for delivery", body: "Your order is on the way to the delivery address you provided." },
              { title: "Completed", body: "The order has been delivered and closed." },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {index + 1}
                </span>
                <span>
                  <span className="font-semibold text-navy-900">{step.title}.</span> {step.body}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
