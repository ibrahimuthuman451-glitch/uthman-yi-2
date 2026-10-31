/**
 * USSD deep links for mobile money payments.
 *
 * A web page cannot open a USSD session by itself - no browser exposes an API
 * for it. The closest possible behaviour is a `tel:` link that carries the whole
 * USSD string, so the handset opens the dialer with every menu step pre-filled
 * and the customer only presses Call and enters their MoMo PIN.
 *
 * A PIN must never be generated or embedded by us: the string stops before it.
 *
 * MTN Rwanda paths (verified against MTN Rwanda, 2026):
 *   *182#                          main menu
 *   *182*1*1*<msisdn>*<amount>#    send money to an MTN number
 *   *182*8*1*<code>*<amount>#      pay a MoMoPay merchant code
 */

/** Default MTN Rwanda "send money to an MTN number" path. */
export const DEFAULT_MTN_TRANSFER_TEMPLATE = "*182*1*1*{msisdn}*{amount}#";

/** Merchant (MoMoPay) path, used when a vendor code is configured instead. */
export const DEFAULT_MTN_MERCHANT_TEMPLATE = "*182*8*1*{code}*{amount}#";

export const MTN_MENU_CODE = "*182#";
export const AIRTEL_MENU_CODE = "*500#";

export type UssdPrompt = {
  /** Literal string the customer would dial, e.g. "*182*1*1*0780551125*84000#". */
  code: string;
  /** `tel:` href with the terminator hash percent-encoded. */
  href: string;
  /** Digits-only receiving number. */
  msisdn: string;
  amountRwf: number;
};

/** Keeps digits only; accepts 07…, 250…, +250… and spaced/dashed formats. */
export function normaliseMsisdn(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

/**
 * Builds the `tel:` href for a USSD string.
 *
 * `#` ends the fragment of a tel: URL, so an unescaped code reaches the dialer
 * truncated at the first hash and the payment never starts. `*` is left as-is
 * because several dialers reject a fully percent-encoded code.
 */
export function ussdHref(code: string): string | null {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return null;
  return `tel:${trimmed.replace(/#/g, "%23")}`;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Pre-fills "send money to an MTN number" with the amount owed. */
export function buildMomoTransferPrompt(input: {
  msisdn: string;
  amountRwf: number;
  /** Overridable so an operator can follow a different menu path without a deploy. */
  template?: string;
}): UssdPrompt | null {
  const msisdn = normaliseMsisdn(input.msisdn);
  if (!msisdn || !isPositiveInteger(input.amountRwf)) return null;

  const template = (input.template ?? "").trim() || DEFAULT_MTN_TRANSFER_TEMPLATE;
  const code = template
    .replace("{msisdn}", msisdn)
    .replace("{amount}", String(input.amountRwf));

  const href = ussdHref(code);
  if (!href) return null;

  return { code, href, msisdn, amountRwf: input.amountRwf };
}

/** Pre-fills a MoMoPay merchant payment (needs the business's vendor code). */
export function buildMomoMerchantPrompt(input: {
  code: string;
  amountRwf: number;
  template?: string;
}): UssdPrompt | null {
  const vendorCode = (input.code ?? "").replace(/\D/g, "");
  if (!vendorCode || !isPositiveInteger(input.amountRwf)) return null;

  const template = (input.template ?? "").trim() || DEFAULT_MTN_MERCHANT_TEMPLATE;
  const code = template
    .replace("{code}", vendorCode)
    .replace("{amount}", String(input.amountRwf));

  const href = ussdHref(code);
  if (!href) return null;

  return { code, href, msisdn: vendorCode, amountRwf: input.amountRwf };
}
