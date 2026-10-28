import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { listFeaturedProducts, listPublicCategories } from "@/server/services/catalog";
import { listServices, listSoftwareProducts } from "@/server/services/content";
import { ProductCard } from "@/components/shop/product-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { CodeIcon, ShopIcon, SparkIcon } from "@/components/ui/icons";
import {
  ContactBand,
  DivisionCard,
  ServiceCard,
  SoftwareCard,
  softwareStatusTone,
} from "@/components/site/cards";
import { softwareStatusLabels } from "@/lib/constants";
import { SUPPORTED_BRANDS } from "@/lib/catalogue/brand";
import { formatPhone, toInternationalPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const [featured, software, services, categories] = await Promise.all([
    listFeaturedProducts(4),
    listSoftwareProducts(),
    listServices(),
    listPublicCategories(),
  ]);

  const hasDemoListings = featured.some((product) => product.isDemo);
  const whatsapp = toInternationalPhone(settings.company.whatsappPhone || settings.company.phone);
  const productCategories = categories.filter((category) => category._count.products > 0).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="hero-grid relative overflow-hidden bg-navy-950 text-white">
        <div className="container-page relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
              {settings.content.heroEyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-[3.6rem]">
              {settings.content.heroHeadline}{" "}
              <span className="text-brand-300">{settings.content.heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-navy-200 sm:text-lg">
              {settings.content.heroSubheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className={buttonClasses("primary", "lg")}>
                Shop products
              </Link>
              <Link
                href="/software"
                className={buttonClasses(
                  "outline",
                  "lg",
                  "border-white/25 bg-transparent text-white hover:bg-white/10",
                )}
              >
                Explore our software
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Location</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {[settings.company.addressLine, settings.company.city]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Call us</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  <a href={`tel:${settings.company.phone}`} className="hover:text-brand-200">
                    {formatPhone(settings.company.phone)}
                  </a>
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs uppercase tracking-wide text-navy-400">Divisions</dt>
                <dd className="mt-1 text-sm font-medium text-white">Shop · Software · Products</dd>
              </div>
            </dl>
          </div>

          {/* Composition of real, current information - no invented metrics. */}
          <div className="relative">
            <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                  In the shop
                </p>
                <Link href="/shop" className="text-xs font-medium text-navy-200 hover:text-white">
                  Browse →
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(productCategories.length > 0
                  ? productCategories
                  : [
                      { id: "cctv", name: "CCTV Cameras", slug: "cctv-cameras" },
                      { id: "starlink", name: "Starlink Kits", slug: "starlink-kits-routers" },
                    ]
                ).map((category) => (
                  <span
                    key={category.id}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-navy-100"
                  >
                    {category.name}
                  </span>
                ))}
              </div>

              <div className="mt-6 h-px bg-white/10" />

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                Our software
              </p>
              <ul className="mt-3 space-y-2.5">
                {software.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/software/${product.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/40 px-3 py-2.5 transition-colors hover:border-white/25"
                    >
                      <span className="text-sm font-semibold text-white">{product.name}</span>
                      <Badge tone={softwareStatusTone(product.status)}>
                        {softwareStatusLabels[product.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-xl border border-white/10 bg-navy-900/40 px-3 py-3 text-xs leading-5 text-navy-200">
                Product statuses are reviewed by the Uthman IY team. Early-stage products are
                labelled as such and are not presented as finished.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divisions */}
      <Section>
        <div className="container-page">
          <SectionHeading
            eyebrow="Three divisions, one company"
            title="Technology commerce, custom software, and our own products."
            description="Each division has its own team focus and its own pages, so you always know what you are buying or commissioning."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <DivisionCard
              icon={<ShopIcon className="h-5 w-5" />}
              eyebrow="Division A"
              title="Online technology shop"
              description="Surveillance, networking, power and intercom equipment, with delivery in Kigali and clear RWF pricing."
              href="/shop"
              cta="Browse the catalogue"
            />
            <DivisionCard
              icon={<CodeIcon className="h-5 w-5" />}
              eyebrow="Division B"
              title="Software development"
              description="Websites, e-commerce, custom business systems, mobile apps, automation and technical support."
              href="/software-development"
              cta="See our services"
            />
            <DivisionCard
              icon={<SparkIcon className="h-5 w-5" />}
              eyebrow="Division C"
              title="Our software"
              description="MatchVision AI, Digital Discipline and Tender AI: products built and owned by Uthman IY."
              href="/software"
              cta="Explore the products"
            />
          </div>
        </div>
      </Section>

      {/* Brands we stock - text only, no third-party logo files are used. */}
      <div className="border-y border-navy-100 bg-white">
        <div className="container-page flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">
            Brands we stock
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {SUPPORTED_BRANDS.map((brand) => (
              <Link
                key={brand.key}
                href={`/shop?brand=${brand.key}`}
                className="group flex flex-col"
              >
                <span className="font-display text-lg font-extrabold tracking-tight text-navy-800 group-hover:text-brand-700">
                  {brand.label}
                </span>
                <span className="text-[11px] text-navy-400">{brand.blurb}</span>
              </Link>
            ))}
            <Link href="/shop" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              Shop all {"→"}
            </Link>
          </div>
        </div>
      </div>

      {/* Featured products */}
      <Section tone="surface">
        <div className="container-page">
          <SectionHeading
            eyebrow="Shop"
            title="Featured products"
            description={settings.store.catalogueNotice}
            action={
              <Link href="/shop" className={buttonClasses("outline", "md")}>
                View all products
              </Link>
            }
          />

          {hasDemoListings ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong className="font-semibold">Demonstration catalogue:</strong> the listings
              below are sample data for reviewing the shop and checkout. They are not real stock,
              specifications or approved Uthman IY prices. Real listings appear once an
              administrator publishes approved products.
            </p>
          ) : null}

          {featured.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center">
              <p className="text-base font-semibold text-navy-900">The catalogue is being prepared</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
                Uthman IY has not published approved products yet. Product photography, prices and
                specifications must be confirmed by the owner before they appear here. Tell us what
                you need and we will source it.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/contact?type=PRODUCT_ENQUIRY" className={buttonClasses("primary", "md")}>
                  Ask about a product
                </Link>
                <a
                  href={`tel:${settings.company.phone}`}
                  className={buttonClasses("outline", "md")}
                >
                  Call {formatPhone(settings.company.phone)}
                </a>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Our software */}
      <Section>
        <div className="container-page">
          <SectionHeading
            eyebrow="Our software"
            title="Products we build, own and support."
            description="Separate from client work, these are Uthman IY products at different stages of development. Each page states exactly what exists today."
            action={
              <Link href="/software" className={buttonClasses("outline", "md")}>
                All software products
              </Link>
            }
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {software.map((product) => (
              <SoftwareCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </Section>

      {/* Software development services */}
      <Section tone="surface">
        <div className="container-page">
          <SectionHeading
            eyebrow="Software development"
            title="Build the system your business actually needs."
            description="We design and deliver websites, stores, internal systems and automation, then document them so your team can operate them."
            action={
              <Link
                href="/software-development"
                className={buttonClasses("primary", "md")}
              >
                Explore services
              </Link>
            }
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.slice(0, 8).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </Section>

      {/* About strip */}
      <Section>
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">About Uthman IY</p>
              <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl">
                A Kigali technology company working across commerce and software.
              </h2>
              <div className="prose-uy mt-4">
                <p>
                  Uthman IY operates from {[settings.company.addressLine, settings.company.city, settings.company.country].filter(Boolean).join(", ")}. We supply technology products
                  to homes and businesses, and we build software for organisations that need
                  systems shaped around their own processes.
                </p>
                <p>
                  We are deliberately careful about what we publish: product prices and stock are
                  approved by our team, software features are labelled by their real status, and
                  payment options appear only when they are properly configured.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about" className={buttonClasses("secondary", "md")}>
                  More about us
                </Link>
                <Link href="/contact" className={buttonClasses("outline", "md")}>
                  Contact the team
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-surface p-6 sm:p-8">
              <h3 className="text-base font-semibold text-navy-900">What you can do here</h3>
              <ul className="mt-4 space-y-4 text-sm text-navy-700">
                {[
                  {
                    title: "Buy technology products",
                    body: "Browse verified listings, check availability and place an order with a delivery area you choose.",
                  },
                  {
                    title: "Commission software",
                    body: "Request a quote for a website, store, business system, mobile app or automation project.",
                  },
                  {
                    title: "Follow product development",
                    body: "See the honest status of MatchVision AI, Digital Discipline and Tender AI, and register interest.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>
                      <span className="font-semibold text-navy-900">{item.title}.</span>{" "}
                      {item.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <div className="container-page pb-4">
        <ContactBand
          phone={settings.company.phone}
          whatsapp={whatsapp}
          email={settings.company.email}
        />
      </div>
    </>
  );
}
