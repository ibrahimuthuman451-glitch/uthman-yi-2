import { CartProvider } from "@/components/shop/cart-context";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSiteSettings } from "@/lib/settings";
import { listSoftwareProducts } from "@/server/services/content";
import { getSiteUrl } from "@/lib/env";
import { toInternationalPhone } from "@/lib/utils";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, software] = await Promise.all([getSiteSettings(), listSoftwareProducts()]);
  const softwareNav = software.map((product) => ({ slug: product.slug, name: product.name }));

  const organisationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.company.name,
    url: getSiteUrl(),
    telephone: `+${toInternationalPhone(settings.company.phone)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: settings.company.city,
      addressRegion: settings.company.city,
      addressCountry: "RW",
      streetAddress: settings.company.addressLine,
    },
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
