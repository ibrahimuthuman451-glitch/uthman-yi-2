import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { softwareStatusLabels } from "@/lib/constants";
import type { Service, SoftwareProduct } from "@prisma/client";

export function DivisionCard({
  icon,
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-card transition-shadow hover:shadow-lift">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        {cta}
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function softwareStatusTone(status: SoftwareProduct["status"]) {
  switch (status) {
    case "LIVE":
      return "success" as const;
    case "TESTING":
      return "brand" as const;
    case "IN_DEVELOPMENT":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function SoftwareCard({ product }: { product: SoftwareProduct }) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: product.accentColor }}
        aria-hidden="true"
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={softwareStatusTone(product.status)}>
            {softwareStatusLabels[product.status]}
          </Badge>
          <span className="text-xs font-medium uppercase tracking-wide text-navy-400">
            Uthman IY product
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-navy-900">
          <Link href={`/software/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted">{product.summary}</p>
        <Link
          href={`/software/${product.slug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          View product
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-5 transition-colors hover:border-brand-200">
      <h3 className="text-base font-semibold text-navy-900">
        <Link href={`/software-development/${service.slug}`} className="hover:text-brand-700">
          {service.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{service.summary}</p>
      <Link
        href={`/software-development/${service.slug}`}
        className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Learn more →
      </Link>
    </article>
  );
}

export function ContactBand({
  phone,
  whatsapp,
  email,
}: {
  phone: string;
  whatsapp: string;
  email?: string;
}) {
  return (
    <div className="rounded-3xl bg-navy-950 px-6 py-10 text-white sm:px-10 lg:px-14">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow text-brand-300">Talk to Uthman IY</p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Tell us what you need built, supplied or improved.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-navy-200">
            Send a message and our team will respond using the contact details you provide. For
            urgent product questions, call the number below.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/contact?type=SOFTWARE_DEVELOPMENT" className={buttonClasses("primary", "lg", "w-full")}>
            Request a quote
          </Link>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClasses("outline", "lg", "w-full border-white/20 bg-transparent text-white hover:bg-white/10")}
          >
            Chat on WhatsApp
          </a>
          <a
            href={`tel:${phone}`}
            className="text-center text-sm font-medium text-navy-200 hover:text-white"
          >
            Or call {phone}
          </a>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="break-anywhere text-center text-xs text-navy-300 hover:text-white"
            >
              {email}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
