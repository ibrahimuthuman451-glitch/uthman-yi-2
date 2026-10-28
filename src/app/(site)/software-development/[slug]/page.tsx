import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceBySlug, listServices, readStringArray } from "@/server/services/content";
import { ButtonLink } from "@/components/ui/button";
import { InquiryForm } from "@/components/site/inquiry-form";
import { ServiceIcon, CheckIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found" };
  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/software-development/${service.slug}` },
    openGraph: { title: `${service.title} | Uthman IY`, description: service.summary },
  };
}

export default async function ServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [all] = await Promise.all([listServices()]);
  const others = all.filter((item) => item.id !== service.id).slice(0, 3);
  const benefits = readStringArray(service.benefits);
  const deliverables = readStringArray(service.deliverables);

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.summary,
    provider: { "@type": "Organization", name: "Uthman IY" },
    areaServed: { "@type": "Country", name: "Rwanda" },
  };

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="container-page py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <Link href="/" className="hover:text-brand-700">Home</Link>{" "}
            <span aria-hidden="true">/</span>{" "}
            <Link href="/software-development" className="hover:text-brand-700">
              Software development
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-navy-700">{service.title}</span>
          </nav>
          <div className="mt-6 flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
              <ServiceIcon name={service.icon} className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow">Software development service</p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
                {service.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{service.summary}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <div className="prose-uy whitespace-pre-line text-base leading-8">{service.description}</div>

          {benefits.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xl font-bold text-navy-900">Business benefits</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-3 rounded-xl border border-navy-100 bg-white p-4 text-sm text-navy-700">
                    <span className="mt-0.5 text-brand-600">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span className="leading-6">{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {deliverables.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xl font-bold text-navy-900">What the engagement includes</h2>
              <ol className="mt-4 space-y-3">
                {deliverables.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm text-navy-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/contact?type=SOFTWARE_DEVELOPMENT" size="md">
              Request a quote
            </ButtonLink>
            <ButtonLink href="/software-development" variant="outline" size="md">
              All services
            </ButtonLink>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-bold text-navy-900">Discuss {service.title.toLowerCase()}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Send the details and we will reply with questions and next steps.
            </p>
            <div className="mt-4">
              <InquiryForm
                mode="product"
                defaultType="SOFTWARE_DEVELOPMENT"
                defaultSubject={`${service.title} enquiry`}
                submitLabel="Request a consultation"
                messageHint="What are you trying to build or improve?"
                messageRows={4}
              />
            </div>
          </div>

          {others.length > 0 ? (
            <div className="rounded-2xl border border-navy-100 bg-surface p-5">
              <h2 className="text-sm font-semibold text-navy-900">Other services</h2>
              <ul className="mt-3 space-y-2">
                {others.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/software-development/${item.slug}`}
                      className="block rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-navy-800 hover:text-brand-700"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
    </>
  );
}
