import { describe, expect, it } from "vitest";
import { getPriceReviewState } from "@/lib/price-review";

const DAY = 24 * 60 * 60 * 1000;

 describe("weekly reference-price review schedule", () => {
  it("is due seven days after the last recorded review", () => {
    const lastReviewedAt = new Date("2026-10-26T09:00:00Z");
    const dueSoon = getPriceReviewState({
      lastReviewedAt,
      intervalDays: 7,
      now: new Date(lastReviewedAt.getTime() + 6 * DAY),
    });
    expect(dueSoon.isDue).toBe(false);
    expect(dueSoon.daysUntilDue).toBe(1);
    expect(dueSoon.dueAt?.toISOString()).toBe("2026-11-02T09:00:00.000Z");

    const dueToday = getPriceReviewState({
      lastReviewedAt,
      intervalDays: 7,
      now: new Date("2026-11-02T06:00:00Z"),
    });
    expect(dueToday.isDue).toBe(true);
    expect(dueToday.isOverdue).toBe(false);
    expect(dueToday.label).toContain("due today");
  });

  it("reports an overdue review with the number of days late", () => {
    const state = getPriceReviewState({
      lastReviewedAt: "2026-10-01T08:00:00Z",
      intervalDays: 7,
      now: new Date("2026-10-20T08:00:00Z"),
    });
    expect(state.isDue).toBe(true);
    expect(state.isOverdue).toBe(true);
    expect(state.label).toMatch(/overdue by 12 day\(s\)/);
    expect(state.tone).toBe("danger");
  });

  it("falls back to the reference capture date when no review was recorded", () => {
    const state = getPriceReviewState({
      lastReviewedAt: null,
      referenceCapturedAt: "2026-10-26T08:45:00Z",
      intervalDays: 7,
      now: new Date("2026-10-26T12:00:00Z"),
    });
    expect(state.lastReviewedAt).toBeNull();
    expect(state.basisAt?.toISOString()).toBe("2026-10-26T08:45:00.000Z");
    expect(state.dueAt?.toISOString()).toBe("2026-11-02T08:45:00.000Z");
    expect(state.isDue).toBe(false);
  });

  it("asks for a review when there is no reference date at all", () => {
    const state = getPriceReviewState({ now: new Date("2026-10-26T12:00:00Z") });
    expect(state.isDue).toBe(true);
    expect(state.dueAt).toBeNull();
    expect(state.tone).toBe("danger");
    expect(state.label).toMatch(/No reference data/i);
  });

  it("ignores an invalid interval instead of scheduling in the past", () => {
    const state = getPriceReviewState({
      lastReviewedAt: "2026-10-26T09:00:00Z",
      intervalDays: 0,
      now: new Date("2026-10-27T09:00:00Z"),
    });
    expect(state.intervalDays).toBe(7);
    expect(state.isDue).toBe(false);
  });
});
