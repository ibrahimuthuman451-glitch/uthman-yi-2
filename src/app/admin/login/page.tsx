import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-display text-2xl font-extrabold text-white">
          Uthman <span className="text-brand-300">IY</span>
          <span className="mt-1 block text-xs font-medium uppercase tracking-[0.2em] text-navy-400">
            Administration
          </span>
        </Link>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-xl font-bold text-navy-900">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Authorised Uthman IY staff only. All administrative actions are audited.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">
          <Link href="/" className="hover:text-white">
            ← Return to the Uthman IY website
          </Link>
        </p>
      </div>
    </div>
  );
}
