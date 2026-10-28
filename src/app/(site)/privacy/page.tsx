import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What information Uthman IY collects through this website and how it is used.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Privacy</p>
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">Privacy notice</h1>
      <p className="mt-3 text-sm text-muted">
        This notice explains what this website collects and why. It describes the current
        implementation, not a future marketing plan.
      </p>

      <div className="prose-uy mt-8 text-[15px] leading-7">
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Order details:</strong> name, email address, phone number, delivery address,
            delivery notes, ordered items and payment reference. These are required to fulfil an
            order.
          </li>
          <li>
            <strong>Inquiry details:</strong> the name, email address, optional phone number, optional
            company, subject and message you submit through a form.
          </li>
          <li>
            <strong>Staff accounts:</strong> name, email address, a hashed password and session
            records for administrators of this website.
          </li>
          <li>
            <strong>Technical records:</strong> audit entries for administrative actions, rate-limit
            counters keyed by IP address, and standard server logs.
          </li>
        </ul>

        <h2>Cookies and browser storage</h2>
        <ul>
          <li>
            Your shopping cart is kept in your browser&apos;s local storage. It contains product ids and
            quantities, plus display names and prices that are re-checked on our server.
          </li>
          <li>
            A signed, HTTP-only cookie gives short-lived access to your own order page after checkout
            or after you prove knowledge of the order number and contact detail.
          </li>
          <li>
            Staff sessions use an HTTP-only cookie. No advertising or analytics cookies are set by
            this implementation.
          </li>
        </ul>

        <h2>How we use the information</h2>
        <p>
          To process and deliver orders, answer inquiries, provide software support and keep the
          website secure. We do not sell personal data, and we do not send marketing messages unless
          you ask us to.
        </p>

        <h2>Payment information</h2>
        <p>
          Mobile money and bank transfer payments are verified using the transaction reference you
          provide. We never collect or store card numbers or mobile money PINs on this website.
        </p>

        <h2>Sharing</h2>
        <p>
          Order and inquiry information is visible to authorised Uthman IY staff. Where a payment
          provider is configured, the provider receives the information necessary to confirm the
          payment. Hosting and database providers store the data on our behalf.
        </p>

        <h2>Retention and your choices</h2>
        <p>
          Order records are kept for business and accounting purposes. You can ask us to correct or
          delete inquiry information that is not needed for an order. Contact us on{" "}
          {formatPhone(settings.company.phone)} or through the{" "}
          <Link href="/contact?type=PARTNERSHIP">contact form</Link>.
        </p>

        <h2>Changes</h2>
        <p>
          If the website starts using an analytics service, email provider or new payment provider,
          this notice and the configuration documentation will be updated before it is enabled.
        </p>
      </div>
    </div>
  );
}
