import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { InquiryType } from "@prisma/client";
import { getSoftwareProductBySlug, listSoftwareProducts, readFeatures, readStringArray } from "@/server/services/content";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { InquiryForm } from "@/components/site/inquiry-form";
import { softwareStatusTone } from "@/components/site/cards";
import { featureStatusLabels, softwareStatusLabels } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const inquiryTypeBySlug: Record<string, InquiryType> = {
  "matchvision-ai": "MATCHVISION_AI",
  "digital-discipline": "DIGITAL_DISCIPLINE",
  "tender-ai": "TENDER_AI",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getSoftwareProductBySlug(slug);
  if (!product) return { title: "Software product not found" };
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/software/${product.slug}` },
    openGraph: { title: `${product.name} | Uthman IY`, description: product.summary },
  };
}

export default async function SoftwareProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getSoftwareProductBySlug(slug);
  if (!product) notFound();

  const all = await listSoftwareProducts();
  const others = all.filter((item) => item.id !== product.id);
  const features = readFeatures(product.features);
  const audience = readStringArray(product.audience);
  const inquiryType = inquiryTypeBySlug[product.slug] ?? "OTHER";

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <Link href="/" className="hover:text-brand-700">Home</Link>{" "}
            <span aria-hidden="true">/</span>{" "}
            <Link href="/software" className="hover:text-brand-700">Our software</Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-navy-700">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={softwareStatusTone(product.status)}>
                  {softwareStatusLabels[product.status]}
                </Badge>
                <span className="text-xs font-medium uppercase tracking-wide text-navy-400">
                  Uthman IY product
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>
              <p className="mt-3 text-lg leading-8 text-muted">{product.tagline}</p>
              {product.statusNote ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  <strong className="font-semibold">Current status:</strong> {product.statusNote}
                </div>
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={`#early-access`} className={buttonClasses("primary", "lg")}>
                  {product.ctaLabel}
                </Link>
                <Link href="/contact?type=PARTNERSHIP" className={buttonClasses("outline", "lg")}>
                  Discuss a partnership
                </Link>
              </div>
              {product.demoUrl ? (
                <p className="mt-3 text-xs text-muted">
                  A demonstration link is published below. It is labelled with its limitations and
                  should not be treated as a production service.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-navy-100 bg-surface p-5">
              <h2 className="text-sm font-semibold text-navy-900">Who it is for</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {audience.map((item) => (
                  <li key={item}>
                    <Badge tone="neutral">{item}</Badge>
                  </li>
                ))}
              </ul>
              <h2 className="mt-5 text-sm font-semibold text-navy-900">The problem</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{product.summary}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold text-navy-900">About {product.name}</h2>
            <div className="prose-uy mt-4 whitespace-pre-line">{product.description}</div>

            <h2 className="mt-10 text-xl font-bold text-navy-900">Feature status</h2>
            <p className="mt-2 text-sm text-muted">
              Features are labelled by what actually exists. Nothing here is presented as available
              unless it is genuinely implemented and tested.
            </p>
            <ul className="mt-4 space-y-3">
              {features.map((feature) => (
                <li key={feature.title} className="rounded-xl border border-navy-100 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        feature.status === "LIVE"
                          ? "success"
                          : feature.status === "EXPERIMENTAL"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {featureStatusLabels[feature.status] ?? feature.status}
                    </Badge>
                    <h3 className="text-sm font-semibold text-navy-900">{feature.title}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{feature.description}</p>
                </li>
              ))}
            </ul>

            {product.demoUrl ? (
              <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5">
                <h2 className="text-base font-semibold text-navy-900">Demonstration</h2>
                <p className="mt-2 text-sm leading-6 text-navy-700">
                  The demonstration below shows early functionality only. It is not a production
                  service and results should not be treated as accurate.
                </p>
                <a
                  href={product.demoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClasses("primary", "md", "mt-4")}
                >
                  Open the demonstration
                </a>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-navy-200 bg-surface p-5">
                <h2 className="text-base font-semibold text-navy-900">No public demo yet</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  There is no verified public demonstration for {product.name} at this time. We do
                  not publish screenshots or statistics that have not been produced by the real
                  product.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div id="early-access" className="scroll-mt-24 rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-lg font-bold text-navy-900">{product.ctaLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tell us how you would use {product.name}. We will reply with the current status and
                whether early testing is possible.
              </p>
              <div className="mt-4">
                <InquiryForm
                  mode="product"
                  defaultType={inquiryType}
                  productSlug={product.slug}
                  defaultSubject={`${product.name} — ${product.ctaLabel}`}
                  submitLabel={product.ctaLabel}
                  messageHint="Share your role, organisation and what you would like to test."
                  messageRows={4}
                />
              </div>
            </div>

            {others.length > 0 ? (
              <div className="rounded-2xl border border-navy-100 bg-surface p-5">
                <h2 className="text-sm font-semibold text-navy-900">Other Uthman IY products</h2>
                <ul className="mt-3 space-y-2">
                  {others.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/software/${item.slug}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-navy-800 hover:text-brand-700"
                      >
                        {item.name}
                        <span className="text-xs font-normal text-navy-400">
                          {softwareStatusLabels[item.status]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
