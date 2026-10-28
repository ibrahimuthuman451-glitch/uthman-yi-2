import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonClasses } from "@/components/ui/button";
import { DivisionCard, SoftwareCard } from "@/components/site/cards";
import { CodeIcon, ShopIcon, SparkIcon } from "@/components/ui/icons";
import { listSoftwareProducts } from "@/server/services/content";
import { formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Uthman IY",
  description:
    "Uthman IY is a technology company in Gisozi, Kigali, Rwanda, working across technology commerce, software development and its own software products.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [settings, software] = await Promise.all([getSiteSettings(), listSoftwareProducts()]);
  const { company } = settings;
  const location = [company.addressLine, company.city, company.country].filter(Boolean).join(", ");

  return (
    <>
      <section className="border-b border-navy-100 bg-white py-14 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <p className="eyebrow">About us</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl lg:text-5xl">
              A technology company working across commerce and software.
            </h1>
            <div className="prose-uy mt-5 max-w-2xl text-base leading-8">
              <p>
                Uthman IY is a technology company based in {location}. We work in three connected
                areas: supplying technology products, building software for other organisations, and
                developing our own software products.
              </p>
              <p>
                Our shop exists because businesses and households need reliable equipment and a
                supplier who is clear about price, availability and delivery. Our software work
                exists because many organisations are forced into tools that do not match how they
                operate. Our own products come from problems we see repeatedly in the markets we
                serve.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonClasses("primary", "md")}>
                Contact the team
              </Link>
              <a href={`tel:${company.phone}`} className={buttonClasses("outline", "md")}>
                Call {formatPhone(company.phone)}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-surface p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
              Verified company details
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Company</dt>
                <dd className="font-semibold text-navy-900">{company.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Location</dt>
                <dd className="text-navy-900">{location}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Phone</dt>
                <dd className="text-navy-900">
                  <a href={`tel:${company.phone}`} className="hover:text-brand-700">
                    {formatPhone(company.phone)}
                  </a>
                </dd>
              </div>
              {company.email ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Email</dt>
                  <dd className="break-anywhere text-navy-900">{company.email}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              Only details confirmed by Uthman IY are published here. Information the company has
              not confirmed (such as a street address, opening hours or registration numbers) is not
              invented to fill space.
            </p>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page">
          <SectionHeading
            eyebrow="What we do"
            title="Three divisions, clearly separated"
            description="Each division has its own pages, pricing approach and team focus, so clients and customers always know who they are dealing with."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <DivisionCard
              icon={<ShopIcon className="h-5 w-5" />}
              eyebrow="Division A"
              title="Online technology shop"
              description="Technology products for homes, offices and institutions, with approved pricing in RWF and delivery arrangements confirmed at checkout."
              href="/shop"
              cta="Browse the shop"
            />
            <DivisionCard
              icon={<CodeIcon className="h-5 w-5" />}
              eyebrow="Division B"
              title="Software development"
              description="Client projects across websites, e-commerce, custom systems, mobile apps, AI and automation, delivered with documentation and handover."
              href="/software-development"
              cta="See our services"
            />
            <DivisionCard
              icon={<SparkIcon className="h-5 w-5" />}
              eyebrow="Division C"
              title="Our software"
              description="MatchVision AI, Digital Discipline and Tender AI: products with published, honest development statuses."
              href="/software"
              cta="View the products"
            />
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="How we work"
              title="Clear commitments instead of inflated claims."
            />
            <ul className="mt-6 space-y-4 text-sm text-navy-700">
              {[
                {
                  title: "We publish what is true",
                  body: "Product prices and stock are approved by our team. Software features are labelled by real status. We do not invent clients, awards or performance figures.",
                },
                {
                  title: "We keep payments honest",
                  body: "Payment methods appear only when they are properly configured. Orders stay pending until a payment is verified by our team or confirmed by the provider.",
                },
                {
                  title: "We build for the local context",
                  body: "Sites and systems are tested for the devices, bandwidth and workflows our users actually have, with clear mobile layouts and lightweight pages.",
                },
                {
                  title: "We hand over properly",
                  body: "Documentation, configuration notes and training are part of the work, so you are not dependent on one person's memory.",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-navy-100 bg-white p-4">
                  <p className="font-semibold text-navy-900">{item.title}</p>
                  <p className="mt-1 leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeading eyebrow="Our products" title="Software we own" />
            <div className="mt-6 grid gap-4">
              {software.map((product) => (
                <SoftwareCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
