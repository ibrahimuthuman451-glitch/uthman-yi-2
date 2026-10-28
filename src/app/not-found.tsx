import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        The link may be out of date. Try the shop, our software products, or contact us and we will
        point you in the right direction.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          Back to home
        </Link>
        <Link href="/shop" className={buttonClasses("outline", "md")}>
          Browse the shop
        </Link>
        <Link href="/contact" className={buttonClasses("outline", "md")}>
          Contact us
        </Link>
      </div>
    </div>
  );
}
