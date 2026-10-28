"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/shop/add-to-cart";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { formatRwf } from "@/lib/money";
import { MAX_PER_ITEM } from "@/components/shop/cart-context";

export function PurchasePanel({
  product,
  purchasable,
  stock,
  priceRwf,
}: {
  product: {
    productId: string;
    slug: string;
    name: string;
    priceRwf: number | null;
    imageUrl: string | null;
  };
  purchasable: boolean;
  stock: number;
  priceRwf: number | null;
}) {
  const max = Math.max(1, Math.min(MAX_PER_ITEM, stock));
  const [quantity, setQuantity] = useState(1);

  if (!purchasable) {
    return (
      <div className="rounded-xl border border-navy-100 bg-surface p-4">
        <p className="text-sm font-semibold text-navy-900">
          {priceRwf === null ? "Price on request" : formatRwf(priceRwf)}
        </p>
        <p className="mt-1 text-sm text-muted">
          This product cannot be ordered online right now. Send an enquiry and our team will
          confirm availability, price and delivery.
        </p>
        <Link
          href={`/contact?type=PRODUCT_ENQUIRY&product=${product.slug}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Enquire about this product
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-2xl font-bold text-navy-900">{formatRwf(priceRwf)}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted">Quantity</span>
          <QuantityStepper value={quantity} onChange={setQuantity} max={max} />
        </div>
      </div>
      <AddToCartButton product={product} quantity={quantity} size="lg" />
      <p className="text-xs leading-5 text-muted">
        Stock is confirmed again by our server when you place the order. Delivery fees are shown
        at checkout before you confirm.
      </p>
    </div>
  );
}
