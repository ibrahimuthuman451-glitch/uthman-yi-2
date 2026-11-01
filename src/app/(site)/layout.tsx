import { CartProvider } from "@/components/shop/cart-context";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSiteSettings } from "@/lib/settings";
import { listSoftwareProducts } from "@/server/services/content";
import { getSiteUrl } from "@/lib/env";
import { toInternationalPhone } from "@/lib/utils";
import { getOfficialLogoPath } from "@/components/site/logo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, software] = await Promise.all([getSiteSettings(), listSoftwareProducts()]);
  const softwareNav = software.map((product) => ({ slug: product.slug, name: product.name }));
  const siteUrl = getSiteUrl();
  const logoPath = getOfficialLogoPath();

  /**
   * LocalBusiness data. Google cross-checks this against the Google Business
   * Profile, so name, address, phone and hours are read from the same settings
   * the site displays - never typed twice.
   */
  const acceptedPayments = [
    settings.payments.manualMobileMoney.enabled ? "MTN MoMo" : "",
    settings.payments.manualAirtelMoney.enabled ? "Airtel Money" : "",
    settings.payments.cashOnDelivery.enabled ? "Cash" : "",
    settings.payments.bankTransfer.enabled ? "Bank transfer" : "",
  ].filter(Boolean);

  const organisationJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "ElectronicsStore", "LocalBusiness"],
    "@id": `${siteUrl}/#organisation`,
    name: settings.company.name,
    url: siteUrl,
    telephone: `+${toInternationalPhone(settings.company.phone)}`,
    ...(settings.company.email ? { email: settings.company.email } : {}),
    ...(logoPath ? { logo: `${siteUrl}${logoPath}`, image: `${siteUrl}${logoPath}` } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.company.addressLine,
      addressLocality: settings.company.city,
      addressRegion: settings.company.region,
      addressCountry: "RW",
    },
    areaServed: { "@type": "Country", name: "Rwanda" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: settings.company.openingHours.days,
        opens: settings.company.openingHours.opens,
        closes: settings.company.openingHours.closes,
      },
    ],
    currenciesAccepted: "RWF",
    priceRange: "RWF",
    ...(acceptedPayments.length > 0 ? { paymentAccepted: acceptedPayments.join(", ") } : {}),
    ...(settings.company.servicesOffered.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: settings.company.servicesOffered.map((service, index) => ({
              "@type": "Offer",
              position: index + 1,
              itemOffered: { "@type": "Service", name: service },
            })),
          },
        }
      : {}),
  };

  return (
    <CartProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-navy-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Header
        phone={settings.company.phone}
        software={softwareNav}
        announcement={settings.content.announcement}
      />
      <main id="main-content">{children}</main>
      <Footer settings={settings} software={softwareNav} />
      <script
        type="application/ld+json"
        // JSON-LD is generated from server-side settings, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
      />
    </CartProvider>
  );
}
