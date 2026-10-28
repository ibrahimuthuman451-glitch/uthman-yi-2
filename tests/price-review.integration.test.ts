import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { recordPriceReview } from "@/server/services/price-review";

/**
 * Recording a review must be honest: it changes the schedule only, never a
 * price, and it never claims that supplier prices were fetched automatically.
 */

const suffix = Date.now().toString(36);
let originalSettings: unknown = null;
let actor: { id: string; name: string; email: string } = { id: "", name: "", email: "" };
const productIds: string[] = [];

beforeAll(async () => {
  const row = await db.siteSetting.findUnique({ where: { key: "site" } });
  originalSettings = row?.value ?? null;

  const user = await db.user.create({
    data: {
      name: "Review Tester",
      email: `review-${suffix}@test.local`,
      passwordHash: "unused",
      role: "STAFF",
    },
  });
  actor = { id: user.id, name: user.name, email: user.email };

  const product = await db.product.create({
    data: {
      name: `Review price product ${suffix}`,
      slug: `review-price-${suffix}`,
      sku: `REVIEW-${suffix}`,
      priceRwf: 250_000,
      referencePriceRwf: 240_000,
      referenceSource: "test supplier",
      referenceRetrievedAt: new Date("2026-10-26T08:45:00Z"),
      stock: 0,
      dataStatus: "APPROVED",
      isPublished: true,
    },
  });
  productIds.push(product.id);
});

afterAll(async () => {
  await db.auditLog.deleteMany({ where: { actorId: actor.id } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.user.deleteMany({ where: { id: actor.id } });
  if (originalSettings) {
    await db.siteSetting.update({
      where: { key: "site" },
      data: { value: originalSettings as never },
    });
  }
  await db.$disconnect();
});

describe("recording a reference-price review", () => {
  it("records an internal check without touching prices", async () => {
    const before = await db.product.findUniqueOrThrow({ where: { id: productIds[0] } });

    const result = await recordPriceReview({
      kind: "INTERNAL_CHECK",
      note: "Re-read the catalogue; no supplier contact",
      actor,
      now: new Date("2026-10-28T10:00:00Z"),
    });

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/supplier prices were not retrieved/i);

    const settings = await getSiteSettings();
    expect(settings.priceReview.lastReviewedAt).toBe("2026-10-28T10:00:00.000Z");
    expect(settings.priceReview.lastReviewedBy).toBe(actor.email);
    expect(settings.priceReview.lastReviewKind).toBe("INTERNAL_CHECK");
    expect(settings.priceReview.lastReviewNote).toContain("no supplier contact");

    const after = await db.product.findUniqueOrThrow({ where: { id: productIds[0] } });
    expect(after.priceRwf).toBe(before.priceRwf);
    expect(after.referencePriceRwf).toBe(before.referencePriceRwf);
    expect(after.referenceSource).toBe(before.referenceSource);
    expect(after.referenceRetrievedAt?.toISOString()).toBe(
      before.referenceRetrievedAt?.toISOString(),
    );
  });

  it("keeps the audit trail honest about what was and was not verified", async () => {
    const log = await db.auditLog.findFirst({
      where: { actorId: actor.id, action: "price_review.recorded" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    const metadata = log?.metadata as Record<string, unknown>;
    expect(metadata.pricesChanged).toBe(false);
    expect(metadata.supplierPricesRetrievedAutomatically).toBe(false);
    expect(metadata.kind).toBe("INTERNAL_CHECK");
  });

  it("distinguishes a supplier-confirmed review and still changes no price", async () => {
    const before = await db.product.findUniqueOrThrow({ where: { id: productIds[0] } });
    const result = await recordPriceReview({
      kind: "SUPPLIER_CONFIRMED",
      note: "Supplier confirmed the price list",
      actor,
      now: new Date("2026-11-04T10:00:00Z"),
    });

    expect(result.message).toMatch(/confirmed by a person/i);
    const settings = await getSiteSettings();
    expect(settings.priceReview.lastReviewKind).toBe("SUPPLIER_CONFIRMED");
    expect(settings.priceReview.lastReviewedAt).toBe("2026-11-04T10:00:00.000Z");

    const after = await db.product.findUniqueOrThrow({ where: { id: productIds[0] } });
    expect(after.priceRwf).toBe(before.priceRwf);
  });
});
