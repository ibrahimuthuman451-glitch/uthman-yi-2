/**
 * Weekly reference-price review.
 *
 * Uthman IY reviews supplier reference prices every seven days. There is no
 * automated supplier feed, so the application only tracks *when* a person
 * reviewed the information - it never fetches prices and never edits them.
 */
export const DEFAULT_REVIEW_INTERVAL_DAYS = 7;

export type PriceReviewKind = "NONE" | "INTERNAL_CHECK" | "SUPPLIER_CONFIRMED";

export const priceReviewKindLabels: Record<PriceReviewKind, string> = {
  NONE: "No review recorded",
  INTERNAL_CHECK: "Existing catalogue checked internally (supplier not contacted)",
  SUPPLIER_CONFIRMED: "Supplier price confirmed by a person",
};

export type PriceReviewState = {
  intervalDays: number;
  lastReviewedAt: Date | null;
  /** The date the schedule counts from: last review, else the capture date. */
  basisAt: Date | null;
  dueAt: Date | null;
  isDue: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar day key in Rwanda time, e.g. "2026-11-02". */
function kigaliDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayKeyToUtcMs(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getPriceReviewState(input: {
  lastReviewedAt?: Date | string | null;
  referenceCapturedAt?: Date | string | null;
  intervalDays?: number;
  now?: Date;
}): PriceReviewState {
  const intervalDays =
    typeof input.intervalDays === "number" && input.intervalDays > 0
      ? Math.trunc(input.intervalDays)
      : DEFAULT_REVIEW_INTERVAL_DAYS;
  const now = input.now ?? new Date();
  const lastReviewedAt = toDate(input.lastReviewedAt);
  const referenceCapturedAt = toDate(input.referenceCapturedAt);
  const basisAt = lastReviewedAt ?? referenceCapturedAt;

  if (!basisAt) {
    return {
      intervalDays,
      lastReviewedAt: null,
      basisAt: null,
      dueAt: null,
      isDue: true,
      isOverdue: false,
      daysUntilDue: null,
      label: "No reference data on record - review needed",
      tone: "danger",
    };
  }

  const dueAt = new Date(basisAt.getTime() + intervalDays * DAY_MS);
  const dueKeyMs = dayKeyToUtcMs(kigaliDayKey(dueAt));
  const todayKeyMs = dayKeyToUtcMs(kigaliDayKey(now));
  const daysUntilDue = Math.round((dueKeyMs - todayKeyMs) / DAY_MS);
  const isDue = daysUntilDue <= 0;
  const isOverdue = daysUntilDue < 0;

  const label = isOverdue
    ? `Price review overdue by ${Math.abs(daysUntilDue)} day(s)`
    : isDue
      ? "Price review due today"
      : `Next price review in ${daysUntilDue} day(s)`;

  return {
    intervalDays,
    lastReviewedAt,
    basisAt,
    dueAt,
    isDue,
    isOverdue,
    daysUntilDue,
    label,
    tone: isOverdue ? "danger" : isDue ? "warning" : "success",
  };
}

export function getPriceReviewStateFromSettings(
  settings: {
    priceReview: {
      intervalDays: number;
      referenceCapturedAt: string | null;
      lastReviewedAt: string | null;
    };
  },
  now?: Date,
): PriceReviewState {
  return getPriceReviewState({
    intervalDays: settings.priceReview.intervalDays,
    lastReviewedAt: settings.priceReview.lastReviewedAt,
    referenceCapturedAt: settings.priceReview.referenceCapturedAt,
    now,
  });
}
