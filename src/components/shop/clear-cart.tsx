"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart-context";

/** Clears the browser cart after a successful order and removes the ?placed flag. */
export function ClearCartAfterOrder({ orderNumber }: { orderNumber: string }) {
  const { clearCart, ready } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    clearCart();
    router.replace(`/orders/${orderNumber}`, { scroll: false });
  }, [ready, clearCart, router, orderNumber]);

  return null;
}
