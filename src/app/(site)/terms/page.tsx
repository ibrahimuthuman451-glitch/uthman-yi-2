import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { formatPhone } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order terms",
  description: "How ordering, pricing, delivery and payment work in the Uthman IY online shop.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const areas = settings.store.catalogueNotice;

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Terms</p>
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">Order terms</h1>
      <p className="mt-3 text-sm text-muted">
        These terms describe how the Uthman IY online shop currently operates. They are written in
        plain language and can be updated as the business confirms more details.
      </p>
      <p className="mt-1 text-xs text-navy-400">Last updated {formatDate(new Date())}</p>

      <div className="prose-uy mt-8 text-[15px] leading-7">
        <h2>1. Who you are ordering from</h2>
        <p>
          The shop is operated by {settings.company.name}, located in{" "}
          {[settings.company.addressLine, settings.company.city, settings.company.country]
            .filter(Boolean)
            .join(", ")}
          . You can reach us on {formatPhone(settings.company.phone)}.
        </p>

        <h2>2. Prices and availability</h2>
        <p>
          Prices are shown in Rwandan francs (RWF). A price is only valid for the listing it appears
          on. Stock is checked again on our server when you place an order; if an item is no longer
          available we will contact you to adjust or cancel the order.
        </p>
        <p>
          Demonstration listings are labelled and are not real products. Listings imported from
          other companies for research are never sold as Uthman IY products.
        </p>

        <h2>3. Delivery</h2>
        <p>{areas}</p>
        <p>
          The delivery area you select determines the delivery fee shown at checkout. If we cannot
          deliver to the address you provided, we will contact you before dispatch to agree an
          alternative.
        </p>

        <h2>4. Payment</h2>
        <p>
          We only offer payment methods that have been configured by Uthman IY. For mobile money and
          bank transfers, the order remains pending until our team verifies your payment reference.
          Cash on delivery is paid to the rider when the order arrives. We never ask for card
          details through this website and do not store them.
        </p>

        <h2>5. Cancellations</h2>
        <p>
          Contact us as soon as possible if you need to cancel. Orders that have not been dispatched
          can usually be cancelled; if a payment has already been confirmed, refund arrangements will
          be agreed with you directly.
        </p>

        <h2>6. Problems with an order</h2>
        <p>
          If something is wrong with an order, call {formatPhone(settings.company.phone)} or use the{" "}
          <Link href="/contact?type=ORDER_SUPPORT">order support form</Link> and quote your order
          number. Keep the packaging and any receipt until the issue is resolved.
        </p>

        <h2>7. Business information</h2>
        <p>
          Details such as the company&apos;s registration number or tax information are published once
          confirmed by the owner. We do not display invented business credentials.
        </p>
      </div>
    </div>
  );
}
