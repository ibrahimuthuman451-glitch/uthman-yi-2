"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/cart-context";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { ProductMedia } from "@/components/shop/product-media";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatRwf } from "@/lib/money";

type ServerItem = {
  productId: string;
  slug: string;
  name: string;
  priceRwf: number | null;
  imageUrl: string | null;
  stock: number;
  purchasable: boolean;
  availabilityLabel: string;
  availabilityReason: string;
  isDemo: boolean;
};

export function CartView({
  maxQuantityPerItem,
  orderNotice,
}: {
  maxQuantityPerItem: number;
  orderNotice: string;
}) {
  const { items, ready, removeItem, setQuantity, clearCart } = useCart();
  const [serverItems, setServerItems] = useState<Record<string, ServerItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setServerItems({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        setError("We could not refresh prices and stock. Please reload the page.");
        return;
      }
      const data = (await response.json()) as { items: ServerItem[] };
      setServerItems(Object.fromEntries(data.items.map((item) => [item.productId, item])));
    } catch {
      setError("We could not refresh prices and stock. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void validate(items.map((item) => item.productId));
  }, [ready, items, validate]);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center text-sm text-muted">
        Loading your cart…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-navy-900">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Browse the technology shop and add the products you need. Delivery options and payment
          methods are confirmed at checkout.
        </p>
        <Link href="/shop" className={buttonClasses("primary", "md", "mt-6")}>
          Browse products
        </Link>
      </div>
    );
  }

  const lines = items.map((item) => ({ item, server: serverItems[item.productId] }));
  const blocked = lines.filter(
    (line) => !line.server || !line.server.purchasable || line.item.quantity > (line.server?.stock ?? 0),
  );
  const subtotal = lines.reduce((total, line) => {
    const price = line.server?.priceRwf ?? line.item.priceRwf ?? 0;
    return total + price * line.item.quantity;
  }, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div>
        {error ? (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <ul className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white">
          {lines.map(({ item, server }) => {
            const price = server?.priceRwf ?? item.priceRwf;
            const unavailable = !server || !server.purchasable;
            const overStock = server ? item.quantity > server.stock : false;

            return (
              <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
                <Link
                  href={`/shop/${item.slug}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-navy-100 bg-surface sm:h-24 sm:w-24"
                >
                  <ProductMedia src={item.imageUrl} alt={item.name} name={item.name} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/shop/${item.slug}`}
                        className="text-sm font-semibold text-navy-900 hover:text-brand-700 sm:text-base"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{formatRwf(price)} each</span>
                        {server?.isDemo ? <Badge tone="demo">Demo listing</Badge> : null}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-navy-900 sm:text-base">
                      {formatRwf((price ?? 0) * item.quantity)}
                    </p>
                  </div>

                  {unavailable ? (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      {server ? server.availabilityLabel : "No longer available"} — remove this item
                      to continue.
                    </p>
                  ) : overStock ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Only {server?.stock} unit(s) available. Reduce the quantity to continue.
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(quantity) => setQuantity(item.productId, quantity)}
                      max={Math.max(1, Math.min(maxQuantityPerItem, server?.stock ?? maxQuantityPerItem))}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-xs font-semibold text-navy-500 underline underline-offset-4 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between">
          <Link href="/shop" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            ← Continue shopping
          </Link>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-medium text-navy-500 underline underline-offset-4 hover:text-red-700"
          >
            Clear cart
          </button>
        </div>
      </div>

      <aside className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-navy-900">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium text-navy-900">{formatRwf(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-right font-medium text-emerald-700">Free across Rwanda</dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-navy-100 pt-4 text-base font-semibold text-navy-900">
          <span>Total before delivery</span>
          <span>{formatRwf(subtotal)}</span>
        </div>

        {blocked.length > 0 ? (
          <Alert tone="warning" className="mt-4">
            {loading
              ? "Checking availability…"
              : "Some items need attention before you can check out."}
          </Alert>
        ) : null}

        <Link
          href={blocked.length > 0 ? "/cart" : "/checkout"}
          aria-disabled={blocked.length > 0}
          className={buttonClasses(
            "primary",
            "lg",
            blocked.length > 0 ? "mt-4 w-full pointer-events-none opacity-60" : "mt-4 w-full",
          )}
        >
          Proceed to checkout
        </Link>
        <p className="mt-3 text-xs leading-5 text-muted">{orderNotice}</p>
        <p className="mt-3 text-xs leading-5 text-navy-400">
          Prices and stock are verified by our server when you place the order.
        </p>
      </aside>
    </div>
  );
}
