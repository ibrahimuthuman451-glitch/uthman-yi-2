import { describe, expect, it } from "vitest";
import { getProductAvailability } from "@/lib/catalog/availability";

const base = {
  dataStatus: "APPROVED" as const,
  isPublished: true,
  archivedAt: null,
  priceRwf: 50000,
  stock: 10,
  lowStockThreshold: 3,
};

describe("getProductAvailability", () => {
  it("marks an approved, published, in-stock product as purchasable", () => {
    const result = getProductAvailability(base);
    expect(result.purchasable).toBe(true);
    expect(result.reason).toBe("OK");
    expect(result.label).toBe("In stock");
  });

  it("flags low stock but still allows ordering", () => {
    const result = getProductAvailability({ ...base, stock: 2 });
    expect(result.purchasable).toBe(true);
    expect(result.label).toBe("Only 2 left");
  });

  it("never lets a reference listing be ordered", () => {
    const result = getProductAvailability({ ...base, dataStatus: "REFERENCE", priceRwf: null });
    expect(result.purchasable).toBe(false);
    expect(result.reason).toBe("REFERENCE");
    expect(result.isDemo).toBe(false);
  });

  it("treats demo listings as labelled sample data", () => {
    const result = getProductAvailability({ ...base, dataStatus: "DEMO" });
    expect(result.isDemo).toBe(true);
    expect(result.purchasable).toBe(true);
  });

  it("offers products with no stock figure when stock is confirmed by phone", () => {
    const result = getProductAvailability({ ...base, stock: 0 }, "ON_REQUEST");
    expect(result.purchasable).toBe(true);
    expect(result.label).toBe("Available to order");
    expect(result.reason).toBe("OK");
  });

  it("still refuses reference listings and missing prices in on-request mode", () => {
    expect(
      getProductAvailability({ ...base, dataStatus: "REFERENCE", priceRwf: null }, "ON_REQUEST").reason,
    ).toBe("REFERENCE");
    expect(getProductAvailability({ ...base, priceRwf: null }, "ON_REQUEST").reason).toBe("NO_PRICE");
  });

  it("blocks unpublished, archived, unpriced and out-of-stock listings", () => {
    expect(getProductAvailability({ ...base, isPublished: false }).reason).toBe("UNPUBLISHED");
    expect(getProductAvailability({ ...base, archivedAt: new Date() }).reason).toBe("ARCHIVED");
    expect(getProductAvailability({ ...base, priceRwf: null }).reason).toBe("NO_PRICE");
    const out = getProductAvailability({ ...base, stock: 0 });
    expect(out.reason).toBe("OUT_OF_STOCK");
    expect(out.purchasable).toBe(false);
  });
});
