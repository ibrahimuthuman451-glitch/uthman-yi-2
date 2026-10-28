import "server-only";

import type { Order, OrderItem, PaymentMethod, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getSiteSettings } from "@/lib/settings";
import { getPaymentOption, isPrepaidMethod } from "@/lib/payments/options";
import { priceOrder, PricingError, type PriceableProduct } from "@/lib/orders/pricing";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { getProductsByIds } from "@/server/services/catalog";
import { requestToPay } from "@/lib/payments/mtn-momo";

/**
 * Order creation and lifecycle.
 *
 * The browser only ever sends product ids and quantities. Prices, delivery
 * fees, stock checks and totals are computed here from the database inside a
 * transaction, which is the only path that writes an Order.
 */

export type CreateOrderInput = {
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAreaId: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  idempotencyKey: string;
};

export type CreateOrderFailure = {
  ok: false;
  code:
    | "EMPTY_CART"
    | "INVALID_QUANTITY"
    | "QUANTITY_LIMIT"
    | "DUPLICATE_ITEM"
    | "UNKNOWN_PRODUCT"
    | "NOT_PURCHASABLE"
    | "INSUFFICIENT_STOCK"
    | "INVALID_DELIVERY_FEE"
    | "INVALID_DELIVERY_AREA"
    | "PAYMENT_METHOD_UNAVAILABLE"
    | "STOCK_CHANGED"
    | "ORDER_FAILED";
  message: string;
};

export type CreateOrderSuccess = {
  ok: true;
  order: Order & { items: OrderItem[] };
  /** Non-fatal notice, e.g. the MTN payment prompt could not be started. */
  warning?: string;
};

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

function failure(code: CreateOrderFailure["code"], message: string): CreateOrderFailure {
  return { ok: false, code, message };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const settings = await getSiteSettings();
  const env = getEnv();

  const paymentOption = getPaymentOption(input.paymentMethod, settings, env);
  if (!paymentOption) {
    return failure(
      "PAYMENT_METHOD_UNAVAILABLE",
      "The selected payment method is not available. Please choose another option.",
    );
  }

  const deliveryArea = await db.deliveryArea.findFirst({
    where: { id: input.deliveryAreaId, isActive: true },
  });
  if (!deliveryArea) {
    return failure(
      "INVALID_DELIVERY_AREA",
      "Select an available delivery area so we can calculate the delivery fee.",
    );
  }

  // Idempotency: a double submit must return the original order, not create one.
  const existing = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { items: true },
  });
  if (existing) {
    return { ok: true, order: existing };
  }

  const products = await getProductsByIds(input.items.map((item) => item.productId));
  const productMap = new Map<string, PriceableProduct>(
    products.map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        priceRwf: product.priceRwf,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        dataStatus: product.dataStatus,
        isPublished: product.isPublished,
        archivedAt: product.archivedAt,
      },
    ]),
  );

  let pricing;
  try {
    pricing = priceOrder({
      items: input.items,
      products: productMap,
      deliveryFeeRwf: deliveryArea.feeRwf,
      maxQuantityPerItem: settings.store.maxQuantityPerItem,
      freeDeliveryThreshold: settings.store.freeDeliveryThreshold,
      stockMode: settings.store.stockMode,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return failure(error.code, error.message);
    }
    throw error;
  }

  const orderNumber = generateOrderNumber();

  try {
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING_PAYMENT",
          paymentStatus: isPrepaidMethod(input.paymentMethod) ? "PENDING" : "UNPAID",
          paymentMethod: input.paymentMethod,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          deliveryAreaId: deliveryArea.id,
          deliveryAreaName: deliveryArea.name,
          deliveryAddress: input.deliveryAddress,
          deliveryNotes: input.deliveryNotes ?? null,
          subtotalRwf: pricing.subtotalRwf,
          deliveryFeeRwf: pricing.deliveryFeeRwf,
          totalRwf: pricing.totalRwf,
          // Delivery is free across Rwanda, so a zero fee is a settled state
          // (FREE), not something still to be agreed. A fixed-fee area is
          // agreed by definition.
          deliveryFeeStatus: pricing.deliveryFeeRwf > 0 ? "AGREED" : "FREE",
          deliveryFeeAgreedRwf: pricing.deliveryFeeRwf > 0 ? pricing.deliveryFeeRwf : null,
          deliveryFeeAgreedAt: pricing.deliveryFeeRwf > 0 ? new Date() : null,
          paymentReference: input.paymentReference?.trim() || null,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: pricing.lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              sku: line.sku,
              unitPriceRwf: line.unitPriceRwf,
              quantity: line.quantity,
              lineTotalRwf: line.lineTotalRwf,
            })),
          },
          events: {
            create: {
              type: "ORDER_CREATED",
              message: `Order placed online with ${input.paymentMethod
                .replaceAll("_", " ")
                .toLowerCase()}.`,
            },
          },
        },
        include: { items: true },
      });

      // Stock reservation.
      // TRACKED: the conditional update guarantees two concurrent orders cannot
      // oversell the same unit. ON_REQUEST: no inventory figure is trusted, so
      // stock is only decremented when it is known to cover the order; the
      // order itself is confirmed by phone before dispatch.
      for (const line of pricing.lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count === 0) {
          if (settings.store.stockMode === "TRACKED") {
            throw new PricingError(
              "INSUFFICIENT_STOCK",
              `Stock for ${line.productName} changed while you were checking out. Please review your cart.`,
              line.productName,
            );
          }
          continue;
        }
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            delta: -line.quantity,
            reason: "ORDER_PLACED",
            note:
              settings.store.stockMode === "TRACKED"
                ? `Reserved for order ${orderNumber}`
                : `Stock decremented for order ${orderNumber} (availability also confirmed by phone)`,
            orderId: created.id,
          },
        });
      }

      return created;
    });

    return await maybeStartMomoPayment(order, input);
  } catch (error) {
    if (error instanceof PricingError) {
      return failure(error.code, error.message);
    }
    if (isUniqueViolation(error)) {
      const retry = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true },
      });
      if (retry) return { ok: true, order: retry };
      console.error("[orders] order number collision", error);
      return failure("ORDER_FAILED", "We could not save your order. Please try again.");
    }
    console.error("[orders] createOrder failed", error);
    return failure("ORDER_FAILED", "We could not save your order. Please try again.");
  }
}

/** Starts an MTN MoMo prompt after the order row is safely committed. */
async function maybeStartMomoPayment(
  order: Order & { items: OrderItem[] },
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (input.paymentMethod !== "MTN_MOMO_API") {
    return { ok: true, order };
  }

  try {
    const result = await requestToPay({
      amountRwf: order.totalRwf,
      payerMsisdn: order.customerPhone.replace(/^0/, "250"),
      externalId: order.orderNumber,
    });
    await db.order.update({
      where: { id: order.id },
      data: { paymentProviderRef: result.referenceId, paymentStatus: "PENDING" },
    });
    await db.orderEvent.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_REQUESTED",
        message: "MTN MoMo payment prompt requested. Awaiting provider confirmation.",
      },
    });
    return { ok: true, order: { ...order, paymentProviderRef: result.referenceId } };
  } catch (error) {
    console.error("[orders] MTN MoMo request failed", error);
    await db.orderEvent.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_REQUEST_FAILED",
        message:
          "The MTN MoMo payment prompt could not be started. The order is saved and our team will contact the customer.",
      },
    });
    return {
      ok: true,
      order,
      warning:
        "Your order was saved, but the MTN MoMo payment prompt could not be started. Our team will contact you to complete the payment.",
    };
  }
}

const orderDetailInclude = {
  items: { orderBy: { id: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  return db.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    include: orderDetailInclude,
  });
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  return db.order.findUnique({ where: { id }, include: orderDetailInclude });
}

/**
 * Order tracking for guests: the order number alone is not enough, the visitor
 * must also know the email address or phone number used at checkout.
 */
export async function trackOrder(input: {
  orderNumber: string;
  contact: string;
}): Promise<OrderDetail | null> {
  const order = await getOrderByNumber(input.orderNumber);
  if (!order) return null;

  const contact = input.contact.trim().toLowerCase();
  if (contact.includes("@")) {
    return order.customerEmail.toLowerCase() === contact ? order : null;
  }

  const digits = contact.replace(/\D/g, "");
  const normalised = digits.startsWith("250") && digits.length === 12 ? `0${digits.slice(3)}` : digits;
  return order.customerPhone === normalised ? order : null;
}

export async function listDeliveryAreas() {
  return db.deliveryArea.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, feeRwf: true, notes: true },
  });
}

export type StaffActor = { id: string; name: string; email: string };

/** Reserves stock back when an order is cancelled (exactly once). */
async function restoreStock(
  tx: Prisma.TransactionClient,
  order: OrderDetail,
  actorLabel: string,
): Promise<void> {
  for (const item of order.items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        delta: item.quantity,
        reason: "ORDER_CANCELLED",
        note: `Stock returned from cancelled order ${order.orderNumber} (${actorLabel})`,
        orderId: order.id,
      },
    });
  }
}

/**
 * Updates the fulfilment status. Cancelling returns reserved stock to the
 * catalogue exactly once; marking an order paid records the payment timestamp.
 */
export async function updateOrderStatus(input: {
  orderId: string;
  status: Order["status"];
  actor: StaffActor;
  note?: string;
}): Promise<{ ok: boolean; message: string }> {
  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, message: "Order not found." };

  if (order.status === input.status) {
    return { ok: false, message: `Order is already marked as ${input.status}.` };
  }
  if (order.status === "CANCELLED") {
    return { ok: false, message: "A cancelled order cannot be changed. Create a new order instead." };
  }
  if (order.status === "COMPLETED") {
    return { ok: false, message: "A completed order cannot be changed." };
  }

  await db.$transaction(async (tx) => {
    if (input.status === "CANCELLED") {
      await restoreStock(tx, order, input.actor.email);
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        ...(input.status === "PAID" && order.paymentStatus !== "PAID"
          ? { paymentStatus: "PAID", paidAt: new Date(), paymentConfirmedBy: input.actor.email }
          : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: "STATUS_UPDATED",
        message:
          input.note?.trim() ||
          `Status changed from ${order.status} to ${input.status}.`,
        actorId: input.actor.id,
        actorLabel: input.actor.email,
      },
    });
  });

  return { ok: true, message: `Order updated to ${input.status.replaceAll("_", " ").toLowerCase()}.` };
}

/**
 * Records an administrator-verified manual payment (mobile money or bank
 * transfer). This is the only place a manual payment can be marked as paid.
 */
export async function confirmManualPayment(input: {
  orderId: string;
  paymentReference: string;
  note?: string;
  actor: StaffActor;
}): Promise<{ ok: boolean; message: string }> {
  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.paymentStatus === "PAID") {
    return { ok: false, message: "This order is already marked as paid." };
  }
  if (order.status === "CANCELLED") {
    return { ok: false, message: "Cancelled orders cannot be marked as paid." };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentReference: input.paymentReference,
        paymentConfirmedBy: input.actor.email,
        status: order.status === "PENDING_PAYMENT" ? "PAID" : order.status,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_CONFIRMED",
        message: `Payment confirmed manually with reference ${input.paymentReference}.${input.note ? ` Note: ${input.note}` : ""}`,
        actorId: input.actor.id,
        actorLabel: input.actor.email,
      },
    });
  });

  return { ok: true, message: "Payment recorded and order marked as paid." };
}

/** Customer-submitted transaction reference; never marks the order as paid. */
export async function submitPaymentReference(input: {
  orderNumber: string;
  paymentReference: string;
}): Promise<{ ok: boolean; message: string }> {
  const order = await getOrderByNumber(input.orderNumber);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.paymentStatus === "PAID") {
    return { ok: false, message: "This order is already marked as paid." };
  }
  if (order.status === "CANCELLED") {
    return { ok: false, message: "This order was cancelled." };
  }
  if (
    order.paymentMethod !== "MANUAL_MOBILE_MONEY" &&
    order.paymentMethod !== "MANUAL_AIRTEL_MONEY" &&
    order.paymentMethod !== "BANK_TRANSFER"
  ) {
    return {
      ok: false,
      message: "This order does not use a manual payment method, so no transaction reference is needed.",
    };
  }

  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: { paymentReference: input.paymentReference, paymentStatus: "PENDING" },
    }),
    db.orderEvent.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_REFERENCE_SUBMITTED",
        message: `Customer submitted payment reference ${input.paymentReference}. Awaiting verification.`,
      },
    }),
  ]);

  return {
    ok: true,
    message:
      "Thank you. Your reference was received and our team will verify the payment before dispatch.",
  };
}

export type AdminOrderQuery = {
  search?: string;
  status?: Order["status"] | "ALL";
  page?: number;
  pageSize?: number;
};

export async function listOrdersForAdmin(query: AdminOrderQuery) {
  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const search = query.search?.trim().slice(0, 80) ?? "";

  const where: Prisma.OrderWhereInput = {
    ...(query.status && query.status !== "ALL" ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { customerEmail: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search.replace(/\s/g, "") } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    orders,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderStats() {
  const [total, awaitingPayment, toProcess, completed, revenue, newInquiries, lowStock] =
    await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: "PENDING_PAYMENT" } }),
      db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED"] } } }),
      db.order.count({ where: { status: "COMPLETED" } }),
      db.order.aggregate({
        _sum: { totalRwf: true },
        where: { paymentStatus: "PAID" },
      }),
      db.inquiry.count({ where: { status: "NEW" } }),
      db.product.count({
        where: {
          archivedAt: null,
          isPublished: true,
          stock: { lte: db.product.fields.lowStockThreshold },
        },
      }),
    ]);

  return {
    totalOrders: total,
    awaitingPayment,
    toProcess,
    completed,
    paidRevenueRwf: revenue._sum.totalRwf ?? 0,
    newInquiries,
    lowStockCount: lowStock,
  };
}

/**
 * Records the delivery fee agreed with the customer by phone.
 *
 * Nationwide delivery has no published fee, so the order starts with
 * PENDING_AGREEMENT and a products-only total. Staff record the agreed amount
 * (or waive it) here; the server recalculates the total and writes an event.
 * A paid order is never re-priced, because that would break reconciliation.
 */
export async function recordDeliveryFeeAgreement(input: {
  orderId: string;
  status: "AGREED" | "WAIVED";
  agreedFeeRwf?: number | null;
  note?: string;
  actor: StaffActor;
}): Promise<{ ok: boolean; message: string }> {
  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    return { ok: false, message: "A cancelled or completed order cannot be re-priced." };
  }
  if (order.paymentStatus === "PAID") {
    return {
      ok: false,
      message:
        "This order is already paid, so the delivery fee cannot be changed. Record the difference in an internal note instead.",
    };
  }

  const fee = input.status === "WAIVED" ? 0 : input.agreedFeeRwf;
  if (fee === null || fee === undefined || !Number.isInteger(fee) || fee < 0) {
    return { ok: false, message: "Enter the agreed delivery fee in whole Rwandan francs." };
  }
  if (fee > 5_000_000) {
    return { ok: false, message: "That delivery fee looks incorrect. Check the amount and try again." };
  }

  const total = order.subtotalRwf + fee;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        deliveryFeeStatus: input.status,
        deliveryFeeAgreedRwf: fee,
        deliveryFeeAgreedAt: new Date(),
        deliveryFeeAgreedBy: input.actor.email,
        deliveryFeeRwf: fee,
        totalRwf: total,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: input.status === "WAIVED" ? "DELIVERY_FEE_WAIVED" : "DELIVERY_FEE_AGREED",
        message:
          input.status === "WAIVED"
            ? `Delivery fee waived by phone.${input.note ? ` Note: ${input.note}` : ""}`
            : `Delivery fee agreed by phone: ${fee} RWF. Order total is now ${total} RWF.${input.note ? ` Note: ${input.note}` : ""}`,
        actorId: input.actor.id,
        actorLabel: input.actor.email,
      },
    });
  });

  return {
    ok: true,
    message:
      input.status === "WAIVED"
        ? "Delivery fee waived; the order total is now the products total."
        : `Delivery fee recorded. Order total updated to ${total} RWF.`,
  };
}
