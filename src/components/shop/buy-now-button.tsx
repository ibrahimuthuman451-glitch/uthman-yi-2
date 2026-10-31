"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart-context";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Skips the cart: replaces its contents with this single product and goes
 * straight to checkout. Clearing first keeps "buy now" honest - the customer
 * pays for exactly what they clicked, not for leftovers from an earlier visit.
 */
export function BuyNowButton({
  product,
  quantity = 1,
  size = "md",
  className,
  label = "Buy now",
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
  const { buyNow } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClasses("secondary", size, cn("w-full", className))}
      onClick={() => {
        buyNow(
          {
            productId: product.productId,
            slug: product.slug,
            name: product.name,
            priceRwf: product.priceRwf,
            imageUrl: product.imageUrl,
          },
          quantity,
        );
        startTransition(() => {
          router.push("/checkout");
        });
      }}
      aria-live="polite"
    >
      {pending ? "Opening checkout…" : label}
    </button>
  );
}
