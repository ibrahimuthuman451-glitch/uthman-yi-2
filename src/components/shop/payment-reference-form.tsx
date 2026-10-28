"use client";

import { useActionState } from "react";
import { submitPaymentReferenceAction } from "@/app/actions/checkout";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function PaymentReferenceForm({ orderNumber }: { orderNumber: string }) {
  const [state, formAction, pending] = useActionState(
    submitPaymentReferenceAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      {state.status === "success" ? (
        <Alert tone="success" className="mb-4">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert tone="error" className="mb-4">
          {state.message}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Transaction reference"
          htmlFor="paymentReference"
          error={state.fieldErrors?.paymentReference}
          hint="From your mobile money SMS or bank receipt. Our team verifies it before dispatch."
          className="flex-1"
        >
          <Input id="paymentReference" name="paymentReference" required maxLength={120} />
        </Field>
        <Button type="submit" disabled={pending} className="sm:w-auto">
          {pending ? "Submitting…" : "Submit reference"}
        </Button>
      </div>
    </form>
  );
}
