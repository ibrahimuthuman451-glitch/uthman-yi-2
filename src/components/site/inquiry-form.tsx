"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { InquiryType } from "@prisma/client";
import { submitInquiryAction } from "@/app/actions/inquiries";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";

export function InquiryForm({
  mode = "contact",
  defaultType = "PRODUCT_ENQUIRY",
  productSlug,
  defaultSubject = "",
  submitLabel = "Send message",
  messageHint,
  messageRows = 5,
}: {
  mode?: "contact" | "product";
  defaultType?: InquiryType;
  productSlug?: string;
  defaultSubject?: string;
  submitLabel?: string;
  messageHint?: string;
  messageRows?: number;
}) {
  const [state, formAction, pending] = useActionState(submitInquiryAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="type" value={defaultType} />
      {productSlug ? <input type="hidden" name="productSlug" value={productSlug} /> : null}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="inquiry-website">Website</label>
        <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "success" ? (
        <Alert tone="success" title="Message received">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert tone="error" title="Message not sent">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="inquiry-name" required error={state.fieldErrors?.name}>
          <Input id="inquiry-name" name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Email address" htmlFor="inquiry-email" required error={state.fieldErrors?.email}>
          <Input
            id="inquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Field>
        <Field
          label="Phone number (optional)"
          htmlFor="inquiry-phone"
          error={state.fieldErrors?.phone}
          hint="Rwandan mobile number, e.g. 0780 551 125"
        >
          <Input id="inquiry-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label="Company (optional)" htmlFor="inquiry-company" error={state.fieldErrors?.company}>
          <Input id="inquiry-company" name="company" autoComplete="organization" maxLength={120} />
        </Field>
      </div>

      {mode === "contact" ? (
        <Field label="Subject" htmlFor="inquiry-subject" required error={state.fieldErrors?.subject}>
          <Input
            id="inquiry-subject"
            name="subject"
            defaultValue={defaultSubject}
            required
            maxLength={160}
          />
        </Field>
      ) : (
        <input type="hidden" name="subject" value={defaultSubject} />
      )}

      <Field
        label={mode === "contact" ? "Message" : "Tell us about your interest"}
        htmlFor="inquiry-message"
        required
        error={state.fieldErrors?.message}
        hint={messageHint ?? "Do not include passwords, card numbers or other sensitive data."}
      >
        <Textarea id="inquiry-message" name="message" rows={messageRows} required maxLength={4000} />
      </Field>

      <Checkbox
        id="inquiry-consent"
        name="consent"
        required
        label={
          <span>
            I agree that Uthman IY may reply to me using the contact details above, as described in
            the{" "}
            <Link href="/privacy" className="font-semibold text-brand-700 underline">
              privacy notice
            </Link>
            .
          </span>
        }
      />
      {state.fieldErrors?.consent ? (
        <p className="field-error">{state.fieldErrors.consent.join(" ")}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : submitLabel}
      </Button>
      <p className="text-xs leading-5 text-muted">
        Your message is stored securely in our system. If email delivery is not configured on this
        deployment, we will still see your message and reply using your details.
      </p>
    </form>
  );
}
