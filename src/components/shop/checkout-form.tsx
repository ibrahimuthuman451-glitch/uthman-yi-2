"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/cart-context";
import { placeOrderAction } from "@/app/actions/checkout";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatRwf } from "@/lib/money";
import type { PaymentMethod } from "@prisma/client";

type DeliveryArea = { id: string; name: string; feeRwf: number; notes: string | null };
type PaymentOption = {
  method: PaymentMethod;
  label: string;
  description: string;
  instructions: string;
  requiresReference: boolean;
  receivingNumber: string | null;
};

type ServerItem = {
  productId: string;
  slug: string;
  name: string;
  priceRwf: number | null;
  stock: number;
  purchasable: boolean;
  availabilityLabel: string;
  isDemo: boolean;
};

export function CheckoutForm({
  areas,
  paymentOptions,
  maxQuantityPerItem,
  bankDetails,
  deliveryNotice,
}: {
  areas: DeliveryArea[];
  paymentOptions: PaymentOption[];
  maxQuantityPerItem: number;
  bankDetails: { bankName: string; accountName: string; accountNumber: string } | null;
  deliveryNotice: string;
}) {
  const { items, ready, clearCart } = useCart();
  const [state, formAction, pending] = useActionState(placeOrderAction, initialActionState);
  const [serverItems, setServerItems] = useState<Record<string, ServerItem>>({});
  const [deliveryAreaId, setDeliveryAreaId] = useState(areas[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentOptions[0]?.method ?? "CASH_ON_DELIVERY",
  );
  const [checking, setChecking] = useState(true);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const validate = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setServerItems({});
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        const data = (await response.json()) as { items: ServerItem[] };
        setServerItems(Object.fromEntries(data.items.map((item) => [item.productId, item])));
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void validate(items.map((item) => item.productId));
  }, [ready, items, validate]);

  // Clear the browser cart once the server has created the order and redirected.
  const ordersData = state.data?.orderNumber;
  useEffect(() => {
    if (state.status === "success" && typeof ordersData === "string") clearCart();
  }, [state.status, ordersData, clearCart]);

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === deliveryAreaId) ?? areas[0],
    [areas, deliveryAreaId],
  );
  const selectedOption = paymentOptions.find((option) => option.method === paymentMethod);

  const lines = items.map((item) => ({ item, server: serverItems[item.productId] }));
  const blocked = lines.some(
    (line) =>
      !line.server ||
      !line.server.purchasable ||
      line.item.quantity > (line.server?.stock ?? 0) ||
      line.item.quantity < 1 ||
      line.item.quantity > maxQuantityPerItem,
  );
  const subtotal = lines.reduce(
    (total, line) => total + (line.server?.priceRwf ?? 0) * line.item.quantity,
    0,
  );
  const deliveryFee = selectedArea?.feeRwf ?? 0;
  const deliveryIsFree = deliveryFee === 0;
  const total = subtotal + deliveryFee;
  const hasDemo = lines.some((line) => line.server?.isDemo);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center text-sm text-muted">
        Loading checkout…
      </div>
    );
  }

  if (items.length === 0 && state.status !== "success") {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-navy-900">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Add products to your cart before checking out.
        </p>
        <Link href="/shop" className={buttonClasses("primary", "md", "mt-5")}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start" noValidate>
      <input type="hidden" name="items" value={JSON.stringify(items.map((item) => ({ productId: item.productId, quantity: item.quantity })))} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot field for spam bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="checkout-website">Website</label>
        <input id="checkout-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-6">
        {state.status === "error" ? (
          <Alert tone="error" title="We could not place this order">
            {state.message}
          </Alert>
        ) : null}
        {state.status === "success" ? (
          <Alert tone="success" title="Order received">
            {state.message}{" "}
            {typeof ordersData === "string" ? (
              <Link className="font-semibold underline" href={`/orders/${ordersData}`}>
                View your order
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <section className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-navy-900">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="customerName" required error={state.fieldErrors?.customerName}>
              <Input id="customerName" name="customerName" autoComplete="name" required maxLength={120} />
            </Field>
            <Field label="Phone number" htmlFor="customerPhone" required error={state.fieldErrors?.customerPhone} hint="Used to confirm delivery. Format: 07XX XXX XXX">
              <Input id="customerPhone" name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0780 551 125" />
            </Field>
            <Field label="Email address" htmlFor="customerEmail" required error={state.fieldErrors?.customerEmail} className="sm:col-span-2">
              <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" required maxLength={254} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-navy-900">Delivery</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Delivery area" htmlFor="deliveryAreaId" required error={state.fieldErrors?.deliveryAreaId} hint="The delivery fee for the selected area is applied to your order.">
              <Select
                id="deliveryAreaId"
                name="deliveryAreaId"
                value={deliveryAreaId}
                onChange={(event) => setDeliveryAreaId(event.target.value)}
                required
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} — {area.feeRwf === 0 ? "free delivery" : formatRwf(area.feeRwf)}
                  </option>
                ))}
              </Select>
            </Field>
            {selectedArea?.notes ? (
              <p className="text-xs leading-5 text-amber-800">{selectedArea.notes}</p>
            ) : null}
            <Field label="Delivery address" htmlFor="deliveryAddress" required error={state.fieldErrors?.deliveryAddress} hint="Include the district, sector, street and a landmark so the rider can find you.">
              <Textarea id="deliveryAddress" name="deliveryAddress" required maxLength={400} rows={3} />
            </Field>
            <Field label="Delivery notes (optional)" htmlFor="deliveryNotes" error={state.fieldErrors?.deliveryNotes}>
              <Textarea id="deliveryNotes" name="deliveryNotes" maxLength={500} rows={2} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-navy-900">Payment method</h2>
          <p className="mt-1 text-xs text-muted">
            Only methods configured by Uthman IY are shown. No payment is taken automatically.
          </p>
          <div className="mt-4 space-y-3">
            {paymentOptions.map((option) => (
              <label
                key={option.method}
                className={
                  paymentMethod === option.method
                    ? "block cursor-pointer rounded-xl border border-brand-400 bg-brand-50/60 p-4"
                    : "block cursor-pointer rounded-xl border border-navy-200 p-4 hover:border-brand-300"
                }
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.method}
                    checked={paymentMethod === option.method}
                    onChange={() => setPaymentMethod(option.method)}
                    className="mt-1 h-4 w-4 border-navy-300 text-brand-600 focus:ring-brand-500"
                    required
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy-900">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{option.description}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>

          {selectedOption ? (
            <div className="mt-4 rounded-xl bg-surface p-4 text-xs leading-5 text-navy-700">
              <p className="font-semibold text-navy-900">How this works</p>
              <p className="mt-1">{selectedOption.instructions}</p>
              {selectedOption.receivingNumber ? (
                <p className="mt-2">
                  Pay to:{" "}
                  <span className="font-semibold text-navy-900">
                    {selectedOption.receivingNumber.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}
                  </span>
                </p>
              ) : null}
              {selectedOption.method === "BANK_TRANSFER" && bankDetails ? (
                <p className="mt-2">
                  {bankDetails.bankName} · {bankDetails.accountName} · {bankDetails.accountNumber}
                </p>
              ) : null}
            </div>
          ) : null}

          {selectedOption?.requiresReference ? (
            <div className="mt-4">
              <Field
                label="Payment reference (optional now)"
                htmlFor="paymentReference"
                error={state.fieldErrors?.paymentReference}
                hint="If you have already paid, enter the transaction reference. You can also submit it later from your order page."
              >
                <Input id="paymentReference" name="paymentReference" maxLength={120} />
              </Field>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold text-navy-900">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.map(({ item, server }) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.quantity} × {formatRwf(server?.priceRwf ?? null)}
                </p>
                {server && !server.purchasable ? (
                  <p className="mt-0.5 text-xs font-medium text-red-700">{server.availabilityLabel}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-medium text-navy-900">
                {formatRwf((server?.priceRwf ?? 0) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {hasDemo ? (
          <div className="mt-4">
            <Badge tone="demo">Includes demo listings</Badge>
            <p className="mt-2 text-xs leading-5 text-amber-900">
              Demonstration listings are sample data for testing this store, not real inventory.
            </p>
          </div>
        ) : null}

        <dl className="mt-4 space-y-2 border-t border-navy-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium text-navy-900">{formatRwf(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Delivery{selectedArea ? ` (${selectedArea.name})` : ""}</dt>
            <dd className="text-right font-medium text-emerald-700">
              {deliveryIsFree ? "Free" : formatRwf(deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-navy-100 pt-3 text-base font-semibold text-navy-900">
            <dt>Total</dt>
            <dd>{formatRwf(total)}</dd>
          </div>
        </dl>

        {deliveryNotice ? (
          <p className="mt-3 rounded-lg bg-surface p-3 text-xs leading-5 text-navy-700">{deliveryNotice}</p>
        ) : null}

        <div className="mt-4">
          <Checkbox
            name="consent"
            id="consent"
            required
            label={
              <span>
                I confirm the details above and accept the{" "}
                <Link href="/terms" className="font-semibold text-brand-700 underline" target="_blank">
                  order terms
                </Link>
                .
              </span>
            }
          />
          {state.fieldErrors?.consent ? (
            <p className="field-error">{state.fieldErrors.consent.join(" ")}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending || checking || blocked}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
        <p className="mt-3 text-xs leading-5 text-muted">
          You will receive an order number on the next page. Keep it to track your order. Payment is
          only marked as received after our team or the provider confirms it.
        </p>
      </aside>
    </form>
  );
}
