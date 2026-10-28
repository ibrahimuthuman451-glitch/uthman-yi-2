# Payments

Nothing in this application takes a real payment by itself, and nothing pretends to. This
document describes exactly what exists, what is gated behind configuration, and what the owner
must provide before a method can be offered.

## Current state

| Method | Status | Requirement to activate |
| --- | --- | --- |
| MTN MoMo (manual verification) | **Enabled** — receiving number `0780551125` | Staff verify each reference before dispatch |
| Airtel Money (manual verification) | **Enabled** — receiving number `0727 733 580`, marked **unverified** | The business must confirm this is a valid Uthman IY receiving account |
| Cash on delivery | Implemented but **disabled** | Re-enable in Admin → Settings if the rider workflow allows it |
| Bank transfer | Implemented but **disabled** | Bank name, account name, account number entered in Admin → Settings |
| MTN MoMo Collections API | Implemented but **disabled and untested** | MTN merchant account, subscription key, API user/key, public HTTPS callback URL, and a sandbox test round |
| Airtel Money API | **Not implemented** | Airtel merchant account + API documentation |
| Cards (Stripe/Flutterwave/etc.) | **Not implemented** | Provider account, PCI-compliant hosted checkout, commercial agreement |

MTN MoMo and Airtel Money are two separate methods (`MANUAL_MOBILE_MONEY` and
`MANUAL_AIRTEL_MONEY`), each with its own receiving number and instructions. Enabling or
disabling one never affects the other.

### Airtel Money account caveat

The owner supplied `0727 733 580` as the intended Airtel Money receiving number. It is stored in
the admin-managed settings with `verified: false`, because nobody has independently confirmed that
the number belongs to an active Uthman IY Airtel Money account. Until an administrator ticks
*“I have confirmed this is a valid Uthman IY receiving account”* in Admin → Settings:

- the checkout instruction asks the customer to pay that number and submit the SMS reference;
- the admin screen shows a **“Receiving account not verified”** badge;
- no payment is ever treated as complete from the customer's say-so.

This is **not** an Airtel API integration. There is no automatic Airtel confirmation, no webhook
and no merchant-contract verification in this repository.

A method appears at checkout only when it is enabled **and** its prerequisites exist. The
gating logic lives in `src/lib/payments/options.ts` and is covered by tests.

## Order and payment states

- Every new order is created with status `PENDING_PAYMENT`.
- Cash on delivery orders start `UNPAID`; mobile money and bank transfers start `PENDING`
  (the customer intends to pay, we have not verified it).
- A customer may submit a transaction reference from the order page. This only records the
  reference (`PENDING`, order event `PAYMENT_REFERENCE_SUBMITTED`) — it never marks the order paid.
- A staff member verifies the money in the Uthman IY account or statement, then records the
  confirmation in Admin → Orders → *Record a verified payment*. This sets `paymentStatus = PAID`,
  timestamps `paidAt`, stores who confirmed it, and writes an audit entry.
- Cancelling an order returns reserved stock once and locks the record.

## MTN MoMo API (implemented, untested)

The client in `src/lib/payments/mtn-momo.ts` implements the Collections API flow:

1. `POST /collection/token/` with Basic auth (`MTN_MOMO_API_USER`:`MTN_MOMO_API_KEY`) and
   `Ocp-Apim-Subscription-Key`.
2. `POST /collection/v1_0/requesttopay` with a UUID `X-Reference-Id`, `X-Target-Environment`,
   `X-Callback-Url`, amount in RWF and the payer MSISDN (`2507XXXXXXXX`).
3. `GET /collection/v1_0/requesttopay/{referenceId}` to read the authoritative status.

The webhook endpoint is `POST /api/payments/mtn/webhook`. It **never trusts the callback body**:
it looks up the order by `paymentProviderRef`, re-queries MTN for the status, compares the amount
with the stored total, records a `PaymentEvent` (unique per provider/event) and only then marks the
order paid. Replayed notifications are rejected by the unique constraint; amount mismatches leave
the order pending and add an `PAYMENT_AMOUNT_MISMATCH` event for manual review.

### To activate MTN MoMo

1. Apply for an MTN MoMo developer/merchant account for Rwanda and request Collections API access.
2. Obtain: subscription key (primary), API user and API key (created via the sandbox provisioning
   calls), and the target environment (`sandbox` for testing, `mtnrwanda` for production).
3. Set in the hosting environment:
   `PAYMENTS_MTN_MOMO_ENABLED=true`, `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`,
   `MTN_MOMO_API_KEY`, `MTN_MOMO_TARGET_ENV`, `MTN_MOMO_CALLBACK_URL`
   (for example `https://your-domain.rw/api/payments/mtn/webhook`), `MTN_MOMO_CURRENCY=RWF`.
4. Enable the switch in Admin → Settings → Payments.
5. Test with the MTN sandbox numbers: confirm that a successful sandbox payment marks the order
   paid, that a failed payment records `FAILED`, and that repeating the callback does not double-apply.
6. Only then move `MTN_MOMO_TARGET_ENV` to `mtnrwanda`.

Keep the API key and subscription key out of the repository; use the hosting provider's secret
store. Rotate the keys if they are ever exposed.

## Manual mobile money verification routine (recommended now)

1. Ask the customer to send the exact total to the Uthman IY MTN number and to submit the SMS
   reference on the order page (or at checkout).
2. Check the mobile money statement: amount, sender, reference and time.
3. If it matches, record the payment in Admin → Orders. If it does not, contact the customer and
   leave the order pending.
4. Never mark an order paid from a screenshot alone; verify in the account.

## Not implemented (and not advertised)

- Airtel Money API integration.
- Card payments. If cards are added, use a hosted checkout so card data never touches this
  application, and update the privacy notice.
- Refund automation. Refunds are handled manually and should be documented per case.
- Multi-currency pricing. All prices and orders are in RWF.

## Manual verification routine (MTN MoMo and Airtel Money)

1. The customer selects either **MTN MoMo (manual verification)** or **Airtel Money (manual
   verification)** at checkout and submits the transaction reference from the SMS (at checkout or
   later from the order page).
2. The order stays `paymentStatus = PENDING`, `status = PENDING_PAYMENT`. Submitting a reference
   only writes a `PAYMENT_REFERENCE_SUBMITTED` event.
3. A staff member checks the MTN or Airtel statement for the amount, sender, reference and time,
   then records the confirmation in Admin → Orders → *Record a verified payment*. This sets
   `PAID`, timestamps `paidAt`, stores who confirmed it and writes an audit entry.
4. A screenshot, a typed reference or a customer statement is **not** proof of payment on its own.
   Only the statement check followed by the staff action marks an order paid.
5. Orders that are already paid cannot be re-priced, so the delivery fee and total stay consistent
   with the money received.

No PINs, card numbers, one-time codes or other payment secrets are collected anywhere in this
application. Never ask a customer for their mobile money PIN.

## Delivery fee is not a payment

Delivery is **free across Rwanda**, so every new order is created with `deliveryFeeStatus = FREE`,
`deliveryFeeRwf = 0` and a total equal to the products subtotal. No fee is added at checkout and
nothing is deferred to a phone call.

If an exception is required (for example a special courier), staff can record a fee in Admin →
Orders. That updates the total and writes an audited order event; it does **not** mark the order
paid, dispatched or completed. If the order is already paid, the fee cannot be changed.
