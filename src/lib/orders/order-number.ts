import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 ambiguity

/** Date stamp in the Africa/Kigali timezone, e.g. 2026-10-25 -> "261025". */
function kigaliDateStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Kigali",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

/**
 * Human-friendly order number: UY-261025-7K4Q.
 * Uniqueness is enforced by the database; callers retry on collision.
 */
export function generateOrderNumber(date = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `UY-${kigaliDateStamp(date)}-${suffix}`;
}

export function isOrderNumberFormat(value: string): boolean {
  return /^UY-\d{6}-[A-Z2-9]{4}$/.test(value);
}
