import type { Metadata } from "next";
import Link from "next/link";
import { listServices, readStringArray } from "@/server/services/content";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ServiceIcon } from "@/components/ui/icons";
import { Alert } from "@/components/ui/alert";
import { InquiryForm } from "@/components/site/inquiry-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Software development services",
  description:
    "Uthman IY builds websites, e-commerce stores, custom business software, web and mobile applications, AI solutions and automation for organisations in Rwanda.",
  alternates: { canonical: "/software-development" },
};

export default async function SoftwareDevelopmentPage() {
  const services = await listServices();

  return (
    <>
      <section className="hero-grid bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-brand-300">Division B</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Software development, built around your operation.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-navy-200">
              We design and deliver websites, online stores, internal systems, mobile applications
              and automation for businesses and institutions. Every engagement starts with your
              process, not a template.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#request-quote" size="lg">
                Request a quote
              </ButtonLink>
              <Link
                href="/software"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Explore our own products
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
              How we work
            </p>
            <ol className="mt-4 space-y-4 text-sm text-navy-100">
              {[
                "Understand the process and the people using it",
                "Agree scope, data model and success criteria in writing",
                "Build in short iterations with your feedback",
                "Test on real devices and real data volumes",
                "Hand over with documentation and training",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-100">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Section>
        <div className="container-page">
          <SectionHeading
            eyebrow="Services"
            title="What we build and support"
            description="Each service has its own page with the business benefits and what you receive. Choose the closest fit and tell us about your project."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const benefits = readStringArray(service.benefits);
              return (
                <article
                  key={service.id}
                  className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <ServiceIcon name={service.icon} className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-navy-900">
                    <Link href={`/software-development/${service.slug}`} className="hover:text-brand-700">
                      {service.title}
                    </Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted">{service.summary}</p>
                  {benefits[0] ? (
                    <p className="mt-3 text-xs leading-5 text-navy-500">• {benefits[0]}</p>
                  ) : null}
                  <Link
                    href={`/software-development/${service.slug}`}
                    className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Service details →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section tone="surface" id="request-quote">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Request a quote"
              title="Tell us about the project."
              description="Share the problem, who it affects and any deadline. We will reply with questions, an approach and an honest view of what is realistic."
            />
            <div className="mt-6 space-y-4">
              <Alert tone="info" title="What helps us quote accurately">
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>The process you want to improve, and who uses it today</li>
                  <li>Any system or spreadsheet currently in use</li>
                  <li>Whether you need a website, internal system, mobile app or integration</li>
                  <li>Your target launch window and budget range, if known</li>
                </ul>
              </Alert>
              <p className="text-xs leading-5 text-muted">
                We do not publish invented client logos, testimonials or project statistics. Work we
                can show will only be shared with the client&apos;s permission.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-bold text-navy-900">Request a consultation</h2>
            <p className="mt-2 text-sm text-muted">
              Your message goes to the Uthman IY software team.
            </p>
            <div className="mt-4">
              <InquiryForm
                mode="product"
                defaultType="SOFTWARE_DEVELOPMENT"
                defaultSubject="Software development quote request"
                submitLabel="Request a quote"
                messageHint="Describe the project, timeline and any existing system. Do not include passwords or card details."
                messageRows={6}
              />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
