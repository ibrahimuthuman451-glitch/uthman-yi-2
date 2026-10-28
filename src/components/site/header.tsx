import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { CartLink } from "@/components/shop/cart-link";
import { mainNav } from "@/lib/constants";
import { buttonClasses } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";

export type HeaderSoftware = { slug: string; name: string };

export function Header({
  phone,
  software,
  announcement,
}: {
  phone: string;
  software: HeaderSoftware[];
  announcement?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {announcement ? (
        <div className="bg-navy-950 px-4 py-2 text-center text-xs font-medium text-white/90">
          {announcement}
        </div>
      ) : null}

      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Uthman IY home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) =>
              item.label === "Our Software" ? (
                <li key={item.href} className="relative">
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-3 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900">
                      {item.label}
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" fill="currentColor">
                        <path d="M5.5 7.5 10 12l4.5-4.5-1.4-1.4L10 9.2 6.9 6.1z" />
                      </svg>
                    </summary>
                    <div className="absolute left-0 top-full z-50 w-72 pt-2">
                      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white p-2 shadow-lift">
                        <Link
                          href="/software"
                          className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-900 hover:bg-navy-50"
                        >
                          All software
                          <span className="mt-0.5 block text-xs font-normal text-muted">
                            Uthman IY&apos;s own product line
                          </span>
                        </Link>
                        <div className="my-1 h-px bg-navy-100" />
                        {software.map((product) => (
                          <Link
                            key={product.slug}
                            href={`/software/${product.slug}`}
                            className="block rounded-xl px-3 py-2 text-sm text-navy-700 hover:bg-navy-50 hover:text-navy-900"
                          >
                            {product.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </details>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={`tel:${phone}`}
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50 xl:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 5.5C4 4.7 4.7 4 5.5 4h2.2c.7 0 1.3.5 1.5 1.2l.8 3a1.5 1.5 0 0 1-.7 1.7l-1.3.8a12 12 0 0 0 5.3 5.3l.8-1.3a1.5 1.5 0 0 1 1.7-.7l3 .8c.7.2 1.2.8 1.2 1.5v2.2c0 .8-.7 1.5-1.5 1.5C10.4 20 4 13.6 4 5.5Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {formatPhone(phone)}
          </a>
          <CartLink />
          <Link href="/shop" className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
            Shop products
          </Link>

          <details className="group relative lg:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-navy-200 text-navy-800 [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full z-50 w-[min(22rem,calc(100vw-2rem))] pt-2">
              <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white p-3 shadow-lift">
                <nav aria-label="Mobile">
                  <ul className="space-y-1">
                    {mainNav.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-navy-800 hover:bg-navy-50"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="my-2 h-px bg-navy-100" />
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Our software
                  </p>
                  <ul className="space-y-1">
                    {software.map((product) => (
                      <li key={product.slug}>
                        <Link
                          href={`/software/${product.slug}`}
                          className="flex min-h-11 items-center rounded-xl px-3 text-sm text-navy-700 hover:bg-navy-50"
                        >
                          {product.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-3 grid gap-2">
                  <Link href="/shop" className={buttonClasses("primary", "md", "w-full")}>
                    Shop products
                  </Link>
                  <a href={`tel:${phone}`} className={buttonClasses("outline", "md", "w-full")}>
                    Call {formatPhone(phone)}
                  </a>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
