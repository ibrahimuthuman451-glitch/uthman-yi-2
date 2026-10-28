import type { Metadata } from "next";
import Link from "next/link";
import type { InquiryType } from "@prisma/client";
import { getSiteSettings } from "@/lib/settings";
import { inquiryTypeLabels } from "@/lib/constants";
import { formatPhone, toInternationalPhone } from "@/lib/utils";
import { InquiryForm } from "@/components/site/inquiry-form";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Uthman IY",
  description:
    "Contact Uthman IY in Gisozi, Kigali on 0780551125 for product enquiries, order support, software development quotes or software product early access.",
  alternates: { canonical: "/contact" },
};

const CONTACT_TYPES: InquiryType[] = [
  "PRODUCT_ENQUIRY",
  "ORDER_SUPPORT",
  "SOFTWARE_DEVELOPMENT",
  "MATCHVISION_AI",
  "DIGITAL_DISCIPLINE",
  "TENDER_AI",
  "PARTNERSHIP",
];

const DEFAULT_SUBJECTS: Partial<Record<InquiryType, string>> = {
  PRODUCT_ENQUIRY: "Product enquiry",
  ORDER_SUPPORT: "Order support",
  SOFTWARE_DEVELOPMENT: "Software development quote request",
  MATCHVISION_AI: "MatchVision AI enquiry",
  DIGITAL_DISCIPLINE: "Digital Discipline enquiry",
  TENDER_AI: "Tender AI enquiry",
  PARTNERSHIP: "Partnership / other enquiry",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; product?: string }>;
}) {
  const { type, product } = await searchParams;
  const settings = await getSiteSettings();
  const selectedType = (CONTACT_TYPES.includes(type as InquiryType) ? type : "PRODUCT_ENQUIRY") as InquiryType;
  const whatsapp = toInternationalPhone(settings.company.whatsappPhone || settings.company.phone);
  const location = [settings.company.addressLine, settings.company.city, settings.company.country]
    .filter(Boolean)
    .join(", ");

  const subject = product
    ? `Product enquiry: ${product.replace(/-/g, " ")}`
    : DEFAULT_SUBJECTS[selectedType] ?? "Enquiry";

  return (
    <div className="bg-surface">
      <div className="container-page py-10 sm:py-14">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">Talk to Uthman IY</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Choose the department that fits your question, or call us directly. We reply using the
          contact details you provide.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Company details</h2>
              <address className="mt-3 space-y-1 text-sm not-italic text-navy-700">
                <p className="font-semibold text-navy-900">{settings.company.name}</p>
                <p>{location}</p>
                <p>
                  <a className="font-medium text-brand-700 hover:text-brand-800" href={`tel:${settings.company.phone}`}>
                    {formatPhone(settings.company.phone)}
                  </a>
                </p>
                {settings.company.secondaryPhone ? (
                  <p>
                    <a className="font-medium text-brand-700 hover:text-brand-800" href={`tel:${settings.company.secondaryPhone}`}>
                      {formatPhone(settings.company.secondaryPhone)}
                    </a>
                  </p>
                ) : null}
                {settings.company.email ? (
                  <p>
                    <a className="break-anywhere text-brand-700" href={`mailto:${settings.company.email}`}>
                      {settings.company.email}
                    </a>
                  </p>
                ) : null}
              </address>

              <div className="mt-4 grid gap-2">
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Chat on WhatsApp
                </a>
                <a
                  href={`tel:${settings.company.phone}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-300"
                >
                  Call {formatPhone(settings.company.phone)}
                </a>
              </div>

              {!settings.company.email ? (
                <p className="mt-3 text-xs leading-5 text-muted">
                  An email address has not been published yet, so we do not display one. Use the
                  form, phone or WhatsApp and our team will respond.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
              <h2 className="text-base font-semibold text-navy-900">Inquiry categories</h2>
              <ul className="mt-3 space-y-1.5">
                {CONTACT_TYPES.map((option) => (
                  <li key={option}>
                    <Link
                      href={`/contact?type=${option}`}
                      aria-current={selectedType === option ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center rounded-lg px-3 py-2 text-sm",
                        selectedType === option
                          ? "bg-brand-50 font-semibold text-brand-800"
                          : "text-navy-700 hover:bg-navy-50",
                      )}
                    >
                      {inquiryTypeLabels[option]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Alert tone="info" title="Urgent order problem?">
              Call {formatPhone(settings.company.phone)} and quote your order number. Include it in
              your message if you prefer to write.
            </Alert>
          </div>

          <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-7">
            <h2 className="text-xl font-bold text-navy-900">Send a message</h2>
            <p className="mt-2 text-sm text-muted">
              Category: <strong className="font-semibold text-navy-800">{inquiryTypeLabels[selectedType]}</strong>
            </p>
            <div className="mt-5">
              <InquiryForm
                mode="contact"
                defaultType={selectedType}
                defaultSubject={subject}
                productSlug={product}
                submitLabel="Send message"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
