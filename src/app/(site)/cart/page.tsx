import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { CartView } from "@/components/shop/cart-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the technology products in your Uthman IY cart before checkout.",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const settings = await getSiteSettings();

  return (
    <div className="bg-surface">
      <div className="container-page py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-navy-900 sm:text-4xl">Your cart</h1>
        <p className="mt-2 text-sm text-muted">
          Review quantities and availability. Delivery and payment are confirmed on the next step.
        </p>
        <div className="mt-8">
          <CartView
            maxQuantityPerItem={settings.store.maxQuantityPerItem}
            orderNotice={settings.store.orderNotice}
          />
        </div>
      </div>
    </div>
  );
}
