"use client";

import { useActionState } from "react";
import { trackOrderAction } from "@/app/actions/checkout";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function TrackOrderForm({ defaultOrderNumber = "" }: { defaultOrderNumber?: string }) {
  const [state, formAction, pending] = useActionState(trackOrderAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Field
        label="Order number"
        htmlFor="orderNumber"
        required
        error={state.fieldErrors?.orderNumber}
        hint="Looks like UY-261025-7K4Q. It is shown on your order confirmation."
      >
        <Input
          id="orderNumber"
          name="orderNumber"
          defaultValue={defaultOrderNumber}
          placeholder="UY-261025-7K4Q"
          autoCapitalize="characters"
          required
        />
      </Field>
      <Field
        label="Email or phone used on the order"
        htmlFor="contact"
        required
        error={state.fieldErrors?.contact}
        hint="We check that this matches the order before showing its details."
      >
        <Input id="contact" name="contact" placeholder="you@example.com or 0780 551 125" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Looking up your order…" : "View order"}
      </Button>
    </form>
  );
}
