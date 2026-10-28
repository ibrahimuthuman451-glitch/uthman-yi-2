import "server-only";

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";
import {
  getPriceReviewStateFromSettings,
  type PriceReviewKind,
} from "@/lib/price-review";

/**
 * Records that a person completed a reference-price review.
 *
 * This deliberately does **not** touch any product price, and it never claims
 * that supplier prices were retrieved automatically. INTERNAL_CHECK means the
 * existing catalogue was re-read; SUPPLIER_CONFIRMED means a person confirmed
 * the price with the supplier.
 */
export async function recordPriceReview(input: {
  kind: Exclude<PriceReviewKind, "NONE">;
  note?: string;
  actor: { id: string; email: string };
  now?: Date;
}): Promise<{ ok: boolean; message: string; reviewedAt: Date }> {
  const reviewedAt = input.now ?? new Date();
  const settings = await getSiteSettings();

  await updateSiteSettings(
    {
      priceReview: {
        intervalDays: settings.priceReview.intervalDays || 7,
        referenceCapturedAt: settings.priceReview.referenceCapturedAt,
        lastReviewedAt: reviewedAt.toISOString(),
        lastReviewedBy: input.actor.email,
        lastReviewKind: input.kind,
        lastReviewNote: (input.note ?? "").slice(0, 500),
      },
    },
    input.actor.id,
  );

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "price_review.recorded",
    entityType: "SiteSetting",
    entityId: "site",
    metadata: {
      kind: input.kind,
      note: input.note ?? "",
      reviewedAt: reviewedAt.toISOString(),
      pricesChanged: false,
      supplierPricesRetrievedAutomatically: false,
    },
  });

  return {
    ok: true,
    reviewedAt,
    message:
      input.kind === "SUPPLIER_CONFIRMED"
        ? "Review recorded. Supplier prices were confirmed by a person and no product price was changed by this action."
        : "Review recorded. The existing catalogue was checked; supplier prices were not retrieved and no product price was changed.",
  };
}

/** Review state plus the provenance rows an administrator needs to inspect. */
export async function getPriceReviewOverview() {
  const settings = await getSiteSettings();
  const state = getPriceReviewStateFromSettings(settings);

  const [approvedCount, withReferenceCount, stale] = await Promise.all([
    db.product.count({
      where: { dataStatus: "APPROVED", archivedAt: null, priceRwf: { not: null } },
    }),
    db.product.count({
      where: { archivedAt: null, referencePriceRwf: { not: null } },
    }),
    db.product.findMany({
      where: { archivedAt: null, referenceRetrievedAt: { not: null } },
      orderBy: { referenceRetrievedAt: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        priceRwf: true,
        referencePriceRwf: true,
        referenceSource: true,
        referenceRetrievedAt: true,
      },
    }),
  ]);

  return { settings, state, approvedCount, withReferenceCount, stale };
}
