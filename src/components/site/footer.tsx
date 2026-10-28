import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { mainNav } from "@/lib/constants";
import { formatPhone, toInternationalPhone } from "@/lib/utils";
import type { SiteSettings } from "@/lib/settings-defaults";

export function Footer({
  settings,
  software,
}: {
  settings: SiteSettings;
  software: { slug: string; name: string }[];
}) {
  const { company } = settings;
  const whatsapp = company.whatsappPhone || company.phone;

  return (
    <footer className="mt-24 bg-navy-950 text-navy-100">
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-navy-200">
              Technology commerce and software solutions from Gisozi, Kigali. Products, custom
              software and Uthman IY&apos;s own analytics and productivity tools.
            </p>
            {settings.content.announcement ? (
              <p className="mt-4 text-xs text-brand-200">{settings.content.announcement}</p>
            ) : null}
          </div>

          <nav aria-label="Footer">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Company</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-navy-200 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Our software">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Our software</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {software.map((product) => (
                <li key={product.slug}>
                  <Link
                    href={`/software/${product.slug}`}
                    className="text-navy-200 transition-colors hover:text-white"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/orders/track"
                  className="text-navy-200 transition-colors hover:text-white"
                >
                  Track an order
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Contact</h2>
            <address className="mt-4 space-y-1 text-sm not-italic text-navy-200">
              <p className="font-semibold text-white">{company.name}</p>
              <p>
                {[company.addressLine, company.city, company.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>
                <a href={`tel:${company.phone}`} className="hover:text-white">
                  {formatPhone(company.phone)}
                </a>
              </p>
              {company.secondaryPhone ? (
                <p>
                  <a href={`tel:${company.secondaryPhone}`} className="hover:text-white">
                    {formatPhone(company.secondaryPhone)}
                  </a>
                </p>
              ) : null}
              {company.email ? (
                <p>
                  <a href={`mailto:${company.email}`} className="break-anywhere hover:text-white">
                    {company.email}
                  </a>
                </p>
              ) : null}
            </address>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${toInternationalPhone(whatsapp)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                WhatsApp
              </a>
              <Link
                href="/contact"
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Send a message
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Uthman IY. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-navy-100">
              Order terms
            </Link>
            <Link href="/privacy" className="hover:text-navy-100">
              Privacy
            </Link>
            <Link href="/admin/login" className="hover:text-navy-100">
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
