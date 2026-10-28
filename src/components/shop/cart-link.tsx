"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/cart-context";
import { cn } from "@/lib/utils";

/** Cart link with a live item count (rendered only after hydration). */
export function CartLink({ className }: { className?: string }) {
  const { itemCount, ready } = useCart();

  return (
    <Link
      href="/cart"
      className={cn(
        "relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50",
        className,
      )}
      aria-label={ready && itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.55L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {ready && itemCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
