import type { ProductDataStatus } from "@prisma/client";
import { getProductAvailability } from "@/lib/catalog/availability";

/**
 * Pure order pricing. No database access, no browser input is trusted.
 *
 * The cart in the browser only stores product identifiers and quantities. The
 * server loads products from the database and calls this function, so a forged
 * price, discount or total cannot reach an order.
 */

export type PriceableProduct = {
  id: string;
  name: string;
  sku: string | null;
  priceRwf: number | null;
  stock: number;
  lowStockThreshold: number;
  dataStatus: ProductDataStatus;
  isPublished: boolean;
  archivedAt: Date | null;
};

export type RequestedItem = {
  productId: string;
  quantity: number;
};

export type PricedLine = {
  productId: string;
  productName: string;
  sku: string | null;
  unitPriceRwf: number;
  quantity: number;
  lineTotalRwf: number;
};

export type OrderPricing = {
  lines: PricedLine[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  totalRwf: number;
  itemCount: number;
};

export type PricingErrorCode =
  | "EMPTY_CART"
  | "INVALID_QUANTITY"
  | "QUANTITY_LIMIT"
  | "DUPLICATE_ITEM"
  | "UNKNOWN_PRODUCT"
  | "NOT_PURCHASABLE"
  | "INSUFFICIENT_STOCK"
  | "INVALID_DELIVERY_FEE";

export class PricingError extends Error {
  code: PricingErrorCode;
  productName?: string;

  constructor(code: PricingErrorCode, message: string, productName?: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
    this.productName = productName;
  }
}

export type PriceOrderInput = {
  items: RequestedItem[];
  /** Products keyed by id, as loaded from the database by the caller. */
  products: Map<string, PriceableProduct>;
  deliveryFeeRwf: number;
  maxQuantityPerItem: number;
  freeDeliveryThreshold?: number | null;
  /** ON_REQUEST skips the stock ceiling; availability is confirmed by phone. */
  stockMode?: "TRACKED" | "ON_REQUEST";
};

export function priceOrder(input: PriceOrderInput): OrderPricing {
  const { items, products, maxQuantityPerItem } = input;
  const stockMode = input.stockMode ?? "TRACKED";

  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError("EMPTY_CART", "Your cart is empty.");
  }

  if (!Number.isInteger(input.deliveryFeeRwf) || input.deliveryFeeRwf < 0) {
    throw new PricingError(
      "INVALID_DELIVERY_FEE",
      "The selected delivery option is not available.",
    );
  }

  const seen = new Set<string>();
  const lines: PricedLine[] = [];

  for (const item of items) {
    if (!item || typeof item.productId !== "string" || !item.productId) {
      throw new PricingError("UNKNOWN_PRODUCT", "One of the cart items is invalid.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new PricingError(
        "INVALID_QUANTITY",
        "Quantities must be whole numbers of at least 1.",
      );
    }
    if (item.quantity > maxQuantityPerItem) {
      throw new PricingError(
        "QUANTITY_LIMIT",
        `You can order at most ${maxQuantityPerItem} units of a single product online. Contact us for bulk orders.`,
      );
    }
    if (seen.has(item.productId)) {
      throw new PricingError(
        "DUPLICATE_ITEM",
        "The same product appears twice in your cart.",
      );
    }
    seen.add(item.productId);

    const product = products.get(item.productId);
    if (!product) {
      throw new PricingError(
        "UNKNOWN_PRODUCT",
        "One of the products in your cart no longer exists.",
      );
    }

    const availability = getProductAvailability(
      {
        dataStatus: product.dataStatus,
        isPublished: product.isPublished,
        archivedAt: product.archivedAt,
        priceRwf: product.priceRwf,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
      },
      stockMode,
    );

    if (!availability.purchasable) {
      throw new PricingError(
        "NOT_PURCHASABLE",
        `${product.name} cannot be ordered right now (${availability.label.toLowerCase()}).`,
        product.name,
      );
    }

    // Defensive: availability already checks this, but the price must exist
    // before any arithmetic happens.
    if (product.priceRwf === null) {
      throw new PricingError(
        "NOT_PURCHASABLE",
        `${product.name} does not have an approved price.`,
        product.name,
      );
    }

    if (stockMode === "TRACKED" && product.stock < item.quantity) {
      throw new PricingError(
        "INSUFFICIENT_STOCK",
        `Only ${product.stock} unit(s) of ${product.name} are available.`,
        product.name,
      );
    }

    const lineTotalRwf = product.priceRwf * item.quantity;
    lines.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPriceRwf: product.priceRwf,
      quantity: item.quantity,
      lineTotalRwf,
    });
  }

  const subtotalRwf = lines.reduce((total, line) => total + line.lineTotalRwf, 0);
  const threshold = input.freeDeliveryThreshold;
  const deliveryFeeRwf =
    typeof threshold === "number" && threshold > 0 && subtotalRwf >= threshold
      ? 0
      : input.deliveryFeeRwf;

  return {
    lines,
    subtotalRwf,
    deliveryFeeRwf,
    totalRwf: subtotalRwf + deliveryFeeRwf,
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
  };
}
