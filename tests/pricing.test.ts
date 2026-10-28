import { describe, expect, it } from "vitest";
import { priceOrder, PricingError, type PriceableProduct } from "@/lib/orders/pricing";

function product(overrides: Partial<PriceableProduct> = {}): PriceableProduct {
  return {
    id: "p1",
    name: "Test camera",
    sku: "T-1",
    priceRwf: 100_000,
    stock: 5,
    lowStockThreshold: 2,
    dataStatus: "APPROVED",
    isPublished: true,
    archivedAt: null,
    ...overrides,
  };
}

function products(...items: PriceableProduct[]) {
  return new Map(items.map((item) => [item.id, item]));
}

const base = { deliveryFeeRwf: 2_000, maxQuantityPerItem: 20 };

describe("priceOrder", () => {
  it("calculates line totals, delivery fee and total in whole francs", () => {
    const result = priceOrder({
      ...base,
      items: [{ productId: "p1", quantity: 2 }],
      products: products(product()),
    });

    expect(result.subtotalRwf).toBe(200_000);
    expect(result.deliveryFeeRwf).toBe(2_000);
    expect(result.totalRwf).toBe(202_000);
    expect(result.itemCount).toBe(2);
    expect(result.lines[0]).toMatchObject({ unitPriceRwf: 100_000, quantity: 2, lineTotalRwf: 200_000 });
  });

  it("ignores any price supplied by the caller (browser) because only DB products are priced", () => {
    const result = priceOrder({
      ...base,
      items: [{ productId: "p1", quantity: 1, priceRwf: 1 } as never],
      products: products(product()),
    });
    expect(result.totalRwf).toBe(102_000);
  });

  it("rejects an empty cart", () => {
    expect(() => priceOrder({ ...base, items: [], products: products(product()) })).toThrowError(
      PricingError,
    );
  });

  it("rejects fractional and zero quantities", () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      try {
        priceOrder({ ...base, items: [{ productId: "p1", quantity }], products: products(product()) });
        throw new Error("expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(PricingError);
        expect((error as PricingError).code).toBe("INVALID_QUANTITY");
      }
    }
  });

  it("enforces the configured per-item limit", () => {
    try {
      priceOrder({
        ...base,
        maxQuantityPerItem: 3,
        items: [{ productId: "p1", quantity: 4 }],
        products: products(product({ stock: 50 })),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect((error as PricingError).code).toBe("QUANTITY_LIMIT");
    }
  });

  it("rejects duplicate product lines", () => {
    try {
      priceOrder({
        ...base,
        items: [
          { productId: "p1", quantity: 1 },
          { productId: "p1", quantity: 1 },
        ],
        products: products(product()),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect((error as PricingError).code).toBe("DUPLICATE_ITEM");
    }
  });

  it("rejects reference listings and unpublished products", () => {
    for (const overrides of [
      { dataStatus: "REFERENCE" as const, priceRwf: null },
      { isPublished: false },
      { archivedAt: new Date() },
      { priceRwf: null },
    ]) {
      try {
        priceOrder({
          ...base,
          items: [{ productId: "p1", quantity: 1 }],
          products: products(product(overrides)),
        });
        throw new Error("expected failure");
      } catch (error) {
        expect((error as PricingError).code).toBe("NOT_PURCHASABLE");
      }
    }
  });

  it("rejects quantities above available stock", () => {
    try {
      priceOrder({
        ...base,
        items: [{ productId: "p1", quantity: 6 }],
        products: products(product({ stock: 5 })),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect((error as PricingError).code).toBe("INSUFFICIENT_STOCK");
    }
  });

  it("rejects unknown products and invalid delivery fees", () => {
    try {
      priceOrder({ ...base, items: [{ productId: "missing", quantity: 1 }], products: products(product()) });
    } catch (error) {
      expect((error as PricingError).code).toBe("UNKNOWN_PRODUCT");
    }

    try {
      priceOrder({
        ...base,
        deliveryFeeRwf: -1,
        items: [{ productId: "p1", quantity: 1 }],
        products: products(product()),
      });
    } catch (error) {
      expect((error as PricingError).code).toBe("INVALID_DELIVERY_FEE");
    }
  });

  it("allows ordering without a stock figure when stock is confirmed by phone", () => {
    const result = priceOrder({
      ...base,
      stockMode: "ON_REQUEST",
      items: [{ productId: "p1", quantity: 4 }],
      products: products(product({ stock: 0 })),
    });
    expect(result.subtotalRwf).toBe(400_000);
    expect(result.totalRwf).toBe(402_000);
  });

  it("still rejects unpriced reference listings in on-request mode", () => {
    try {
      priceOrder({
        ...base,
        stockMode: "ON_REQUEST",
        items: [{ productId: "p1", quantity: 1 }],
        products: products(product({ dataStatus: "REFERENCE", priceRwf: null })),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect((error as PricingError).code).toBe("NOT_PURCHASABLE");
    }
  });

  it("waives delivery once the free-delivery threshold is reached", () => {
    const free = priceOrder({
      ...base,
      freeDeliveryThreshold: 150_000,
      items: [{ productId: "p1", quantity: 2 }],
      products: products(product()),
    });
    expect(free.deliveryFeeRwf).toBe(0);
    expect(free.totalRwf).toBe(200_000);

    const paid = priceOrder({
      ...base,
      freeDeliveryThreshold: 500_000,
      items: [{ productId: "p1", quantity: 1 }],
      products: products(product()),
    });
    expect(paid.deliveryFeeRwf).toBe(2_000);
  });
});
