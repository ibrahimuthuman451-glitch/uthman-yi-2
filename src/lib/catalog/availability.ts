import type { ProductDataStatus } from "@prisma/client";

export type AvailabilityTone = "success" | "warning" | "danger" | "neutral";

export type ProductAvailabilityInput = {
  dataStatus: ProductDataStatus;
  isPublished: boolean;
  archivedAt: Date | null;
  priceRwf: number | null;
  stock: number;
  lowStockThreshold: number;
};

export type ProductAvailability = {
  /** True only when the listing can actually be added to a cart. */
  purchasable: boolean;
  label: string;
  tone: AvailabilityTone;
  /** Machine-readable explanation used by checkout validation. */
  reason:
    | "OK"
    | "ARCHIVED"
    | "REFERENCE"
    | "UNPUBLISHED"
    | "NO_PRICE"
    | "OUT_OF_STOCK";
  /** True for listings seeded purely for demonstration. */
  isDemo: boolean;
};

/**
 * Single source of truth for whether a product can be sold.
 * Used by the shop UI, the cart validator and the order service so the three
 * layers cannot disagree.
 */
export type StockMode = "TRACKED" | "ON_REQUEST";

export function getProductAvailability(
  product: ProductAvailabilityInput,
  stockMode: StockMode = "TRACKED",
): ProductAvailability {
  const isDemo = product.dataStatus === "DEMO";

  if (product.archivedAt) {
    return {
      purchasable: false,
      label: "No longer available",
      tone: "neutral",
      reason: "ARCHIVED",
      isDemo,
    };
  }

  if (product.dataStatus === "REFERENCE") {
    return {
      purchasable: false,
      label: "Reference listing",
      tone: "neutral",
      reason: "REFERENCE",
      isDemo: false,
    };
  }

  if (!product.isPublished) {
    return {
      purchasable: false,
      label: "Not published",
      tone: "neutral",
      reason: "UNPUBLISHED",
      isDemo,
    };
  }

  if (product.priceRwf === null || product.priceRwf === undefined) {
    return {
      purchasable: false,
      label: "Price on request",
      tone: "warning",
      reason: "NO_PRICE",
      isDemo,
    };
  }

  // With stock on request the shop does not pretend to know the quantity: the
  // order is accepted and availability is confirmed by phone before dispatch.
  if (stockMode === "ON_REQUEST") {
    return {
      purchasable: true,
      label: "Available to order",
      tone: "warning",
      reason: "OK",
      isDemo,
    };
  }

  if (product.stock <= 0) {
    return {
      purchasable: false,
      label: "Out of stock",
      tone: "danger",
      reason: "OUT_OF_STOCK",
      isDemo,
    };
  }

  if (product.stock <= product.lowStockThreshold) {
    return {
      purchasable: true,
      label: `Only ${product.stock} left`,
      tone: "warning",
      reason: "OK",
      isDemo,
    };
  }

  return {
    purchasable: true,
    label: "In stock",
    tone: "success",
    reason: "OK",
    isDemo,
  };
}

/** Human-readable message for checkout failures. */
export function availabilityMessage(availability: ProductAvailability): string {
  switch (availability.reason) {
    case "ARCHIVED":
      return "is no longer available";
    case "REFERENCE":
      return "is a reference catalogue entry and cannot be ordered until Uthman IY publishes an approved price";
    case "UNPUBLISHED":
      return "is not currently published";
    case "NO_PRICE":
      return "does not have an approved price yet";
    case "OUT_OF_STOCK":
      return "is out of stock";
    default:
      return "is available";
  }
}
