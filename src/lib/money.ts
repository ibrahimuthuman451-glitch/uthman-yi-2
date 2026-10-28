/**
 * Money helpers.
 *
 * Rwandan francs have no minor unit, so every amount is stored and calculated
 * as an integer number of francs. Formatting is centralised here so prices,
 * order totals and admin screens always agree.
 */

/**
 * Formats an integer amount in RWF, e.g. 650000 -> "RWF 650,000".
 *
 * The currency label is written explicitly instead of relying on ICU: the
 * en-RW locale renders the franc as "RF", which is ambiguous for customers and
 * in exported invoices. "RWF" is used consistently across the site.
 */
export function formatRwf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "Price on request";
  }
  return `RWF ${formatRwfAmount(amount)}`;
}

/** Plain grouped number without currency prefix, e.g. "650,000". */
export function formatRwfAmount(amount: number): string {
  return new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  );
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Parses user input (e.g. "650,000" or " 650000 RWF ") into an integer amount.
 * Returns null when the input is not a non-negative whole number.
 */
export function parseRwfInput(input: string): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[,\s]/g, "").replace(/rwf/gi, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

export type CartLineInput = {
  /** Server-side unit price. Never trust a price sent by the browser. */
  unitPriceRwf: number;
  quantity: number;
};

/** Multiplies unit price by quantity using integers only. */
export function lineTotal(unitPriceRwf: number, quantity: number): number {
  return Math.round(unitPriceRwf) * Math.round(quantity);
}

/** Sums line totals. */
export function sumLines(lines: CartLineInput[]): number {
  return lines.reduce(
    (total, line) => total + lineTotal(line.unitPriceRwf, line.quantity),
    0,
  );
}
