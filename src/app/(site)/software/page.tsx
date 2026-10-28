import type { Metadata } from "next";
import Link from "next/link";
import { listSoftwareProducts, readFeatures } from "@/server/services/content";
import { SoftwareCard } from "@/components/site/cards";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { featureStatusLabels, softwareStatusLabels } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our software",
  description:
    "Uthman IY builds and owns MatchVision AI (football analytics), Digital Discipline (focus and digital habits) and Tender AI (tender discovery). See the honest status of each product.",
  alternates: { canonical: "/software" },
};

export default async function SoftwareOverviewPage() {
  const products = await listSoftwareProducts();

  return (
    <>
      <section className="hero-grid bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="eyebrow text-brand-300">Division C</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Our software: products built and owned by Uthman IY.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-navy-200">
            These products are separate from our client development work. Each one is at a different
            stage, and every product page states what exists today, what is experimental and what is
            still planned.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact?type=PARTNERSHIP" className={buttonClasses("primary", "lg")}>
              Discuss a partnership
            </Link>
            <Link
              href="/software-development"
              className={buttonClasses(
                "outline",
                "lg",
                "border-white/25 bg-transparent text-white hover:bg-white/10",
              )}
            >
              Client software development
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page">
          <SectionHeading
            eyebrow="The product line"
            title="Three products, three different problems."
            description="We do not merge these products into one bundle: MatchVision AI, Digital Discipline and Tender AI serve different users and are tracked separately."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {products.map((product) => (
              <SoftwareCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <div className="container-page">
          <SectionHeading
            eyebrow="How we label progress"
            title="Every feature carries its real status."
            description="You should never have to guess whether a feature exists. These labels are used across all three products."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {(["LIVE", "EXPERIMENTAL", "PLANNED"] as const).map((status) => (
              <div key={status} className="rounded-2xl border border-navy-100 bg-white p-5">
                <Badge tone={status === "LIVE" ? "success" : status === "EXPERIMENTAL" ? "warning" : "neutral"}>
                  {featureStatusLabels[status]}
                </Badge>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {status === "LIVE"
                    ? "Released and usable by customers today."
                    : status === "EXPERIMENTAL"
                      ? "Work in progress that may change or be withdrawn. Not sold as a finished feature."
                      : "Designed and scheduled, but not available yet."}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {products.map((product) => {
              const features = readFeatures(product.features);
              return (
                <details
                  key={product.id}
                  className="group rounded-2xl border border-navy-100 bg-white p-5"
                >
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
                    <span>
                      {product.name} status summary{" "}
                      <Badge tone="brand">{softwareStatusLabels[product.status]}</Badge>
                    </span>
                    <span className="text-xs font-medium text-brand-700 group-open:hidden">Show</span>
                    <span className="hidden text-xs font-medium text-brand-700 group-open:inline">Hide</span>
                  </summary>
                  <ul className="mt-4 space-y-2 text-sm">
                    {features.map((feature) => (
                      <li key={feature.title} className="flex flex-wrap items-center gap-2 text-muted">
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
                        <span className="font-medium text-navy-800">{feature.title}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/software/${product.slug}`}
                    className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Open {product.name} page →
                  </Link>
                </details>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
}
