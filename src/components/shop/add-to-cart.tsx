"use client";

import { useState, useTransition } from "react";
import { useCart, MAX_PER_ITEM } from "@/components/shop/cart-context";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  product,
  quantity = 1,
  size = "md",
  className,
  label = "Add to cart",
}: {
  product: {
    productId: string;
    slug: string;
    name: string;
    priceRwf: number | null;
    imageUrl: string | null;
  };
  quantity?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={buttonClasses(added ? "secondary" : "primary", size, cn("w-full", className))}
      onClick={() => {
        addItem(
          {
            productId: product.productId,
            slug: product.slug,
            name: product.name,
            priceRwf: product.priceRwf,
            imageUrl: product.imageUrl,
          },
          Math.min(MAX_PER_ITEM, Math.max(1, quantity)),
        );
        setAdded(true);
        startTransition(() => {
          window.setTimeout(() => setAdded(false), 2000);
        });
      }}
      aria-live="polite"
    >
      {added ? "Added to cart" : label}
    </button>
  );
}
