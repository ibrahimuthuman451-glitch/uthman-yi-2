import type { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/env";
import { getSiteSettings } from "@/lib/settings";
import { buildPaymentOptions } from "@/lib/payments/options";
import { listDeliveryAreas } from "@/server/services/orders";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Uthman IY order with delivery and payment details.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getSiteSettings();
  const env = getEnv();
  const [areas, options] = await Promise.all([
    listDeliveryAreas(),
    Promise.resolve(buildPaymentOptions(settings, env)),
  ]);

  const enabledOptions = options.filter((option) => option.enabled);

  return (
    <div className="bg-surface">
      <div className="container-page py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-navy-900 sm:text-4xl">Checkout</h1>
            <p className="mt-2 text-sm text-muted">
              We confirm stock and prices on our server before accepting the order.
            </p>
          </div>
          <Link href="/cart" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            ← Back to cart
          </Link>
        </div>

        <div className="mt-8">
          {areas.length === 0 ? (
            <Alert tone="warning" title="Delivery areas are not configured yet">
              Online checkout is paused until Uthman IY confirms delivery areas and fees. Please call
              or message us to place your order.
            </Alert>
          ) : enabledOptions.length === 0 ? (
            <Alert tone="warning" title="No payment method is available">
              A payment method has not been configured for this store yet. Please contact us to
              complete your order.
            </Alert>
          ) : (
            <CheckoutForm
              areas={areas}
              paymentOptions={enabledOptions.map((option) => ({
                method: option.method,
                label: option.label,
                description: option.description,
                instructions: option.instructions,
                requiresReference: option.requiresReference,
                receivingNumber: option.receivingNumber ?? null,
              }))}
              maxQuantityPerItem={settings.store.maxQuantityPerItem}
              bankDetails={
                settings.payments.bankTransfer.enabled
                  ? {
                      bankName: settings.payments.bankTransfer.bankName,
                      accountName: settings.payments.bankTransfer.accountName,
                      accountNumber: settings.payments.bankTransfer.accountNumber,
                    }
                  : null
              }
              deliveryNotice={settings.store.deliveryNotice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
