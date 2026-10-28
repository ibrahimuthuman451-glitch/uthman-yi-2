import Link from "next/link";
import { requireStaff } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { hasOfficialLogo } from "@/components/site/logo";
import { getSiteSettings } from "@/lib/settings";
import { getPriceReviewStateFromSettings } from "@/lib/price-review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  const [newInquiries, awaitingOrders, settings] = await Promise.all([
    db.inquiry.count({ where: { status: "NEW" } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }).catch(() => 0),
    getSiteSettings(),
  ]);
  const priceReview = getPriceReviewStateFromSettings(settings);

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders", badge: awaitingOrders },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/price-review", label: "Price review", badge: priceReview.isDue ? 1 : 0 },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/inquiries", label: "Inquiries", badge: newInquiries },
    { href: "/admin/software", label: "Software products" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/reference-catalogue", label: "Reference research" },
    { href: "/admin/catalogue", label: "Import / export" },
    { href: "/admin/settings", label: "Settings" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/users", label: "Staff accounts" },
          { href: "/admin/audit", label: "Audit log" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy-950 text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-display text-lg font-extrabold">
              Uthman <span className="text-brand-300">IY</span>
            </Link>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-200">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-xs text-navy-200 hover:text-white">
              View site ↗
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-white">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-navy-400">{user.role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-6 py-6 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl bg-navy-900 p-2">
            <AdminNav items={items} />
          </div>
          {!hasOfficialLogo() ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <p className="font-semibold">Official logo pending</p>
              <p className="mt-1">
                Add the owner&apos;s logo file to <code>public/brand/</code> so the header and footer
                use the official mark. See <code>public/brand/README.md</code>.
              </p>
            </div>
          ) : null}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
