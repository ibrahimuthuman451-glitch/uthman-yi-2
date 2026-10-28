import type { PaymentMethod } from "@prisma/client";
import type { SiteSettings } from "@/lib/settings-defaults";
import { formatPhone } from "@/lib/utils";

/**
 * Customer-facing payment instructions per method.
 *
 * These strings describe manual verification only. They never claim that a
 * payment has been received, and they never contain credentials or PINs.
 */
export function paymentInstructions(
  method: PaymentMethod,
  settings: SiteSettings,
): string {
  const { payments } = settings;

  switch (method) {
    case "CASH_ON_DELIVERY":
      return payments.cashOnDelivery.instructions;
    case "MANUAL_MOBILE_MONEY":
      return `${payments.manualMobileMoney.instructions} MTN MoMo number: ${formatPhone(
        payments.manualMobileMoney.mtnNumber,
      )}.`;
    case "MANUAL_AIRTEL_MONEY":
      return `${payments.manualAirtelMoney.instructions} Airtel Money number: ${formatPhone(
        payments.manualAirtelMoney.number,
      )}.`;
    case "BANK_TRANSFER":
      return `${payments.bankTransfer.instructions} ${payments.bankTransfer.bankName} - ${payments.bankTransfer.accountName} - ${payments.bankTransfer.accountNumber}.`;
    default:
      return "Your payment is being confirmed by the payment provider. This page will show the result once it is confirmed.";
  }
}

/** Manual methods where a customer can submit a transaction reference. */
export function acceptsPaymentReference(method: PaymentMethod): boolean {
  return (
    method === "MANUAL_MOBILE_MONEY" ||
    method === "MANUAL_AIRTEL_MONEY" ||
    method === "BANK_TRANSFER"
  );
}
