import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  confirmManualPayment,
  createOrder,
  getOrderByNumber,
  recordDeliveryFeeAgreement,
  submitPaymentReference,
  trackOrder,
  updateOrderStatus,
} from "@/server/services/orders";

/**
 * Integration tests against the real PostgreSQL database.
 * These cover the money path: server-side pricing, stock reservation,
 * idempotency, overselling, cancellation and payment confirmation.
 */

const suffix = Date.now().toString(36);
let categoryId = "";
let productId = "";
let referenceProductId = "";
let deliveryAreaId = "";
let zeroFeeAreaId = "";
const createdOrderIds: string[] = [];

let actor: { id: string; name: string; email: string } = { id: "", name: "Test Staff", email: "" };

/** Test-only helper: stock is consumed by earlier tests, so reset it per case. */
async function resetStock(units = 10) {
  await db.product.update({ where: { id: productId }, data: { stock: units } });
}

let originalSettings: unknown = null;

async function setSiteSettings(patch: { stockMode?: "TRACKED" | "ON_REQUEST"; cashOnDelivery?: boolean }) {
  const row = await db.siteSetting.findUniqueOrThrow({ where: { key: "site" } });
  const value = row.value as Record<string, unknown>;
  const store = (value.store ?? {}) as Record<string, unknown>;
  const payments = (value.payments ?? {}) as Record<string, unknown>;
  const cod = (payments.cashOnDelivery ?? {}) as Record<string, unknown>;
  await db.siteSetting.update({
    where: { key: "site" },
    data: {
      value: {
        ...value,
        store: { ...store, ...(patch.stockMode ? { stockMode: patch.stockMode } : {}) },
        payments: {
          ...payments,
          cashOnDelivery: {
            ...cod,
            ...(patch.cashOnDelivery === undefined ? {} : { enabled: patch.cashOnDelivery }),
          },
        },
      } as never,
    },
  });
}

beforeAll(async () => {
  // These tests exercise the TRACKED stock rules and cash-on-delivery orders,
  // so they pin those settings and restore the owner's configuration afterwards.
  const row = await db.siteSetting.findUnique({ where: { key: "site" } });
  originalSettings = row?.value ?? null;
  await setSiteSettings({ stockMode: "TRACKED", cashOnDelivery: true });

  const category = await db.category.create({
    data: { name: `Test category ${suffix}`, slug: `test-category-${suffix}` },
  });
  categoryId = category.id;

  const product = await db.product.create({
    data: {
      name: `Test camera ${suffix}`,
      slug: `test-camera-${suffix}`,
      sku: `TEST-${suffix}`,
      categoryId,
      priceRwf: 100_000,
      stock: 5,
      lowStockThreshold: 1,
      dataStatus: "APPROVED",
      isPublished: true,
    },
  });
  productId = product.id;

  const reference = await db.product.create({
    data: {
      name: `Reference item ${suffix}`,
      slug: `reference-item-${suffix}`,
      sku: `REF-${suffix}`,
      categoryId,
      priceRwf: null,
      stock: 10,
      dataStatus: "REFERENCE",
      isPublished: true,
    },
  });
  referenceProductId = reference.id;

  const area = await db.deliveryArea.create({
    data: { name: `Test area ${suffix}`, feeRwf: 2_000, isActive: true },
  });
  deliveryAreaId = area.id;

  const zeroFeeArea = await db.deliveryArea.create({
    data: { name: `Nationwide test area ${suffix}`, feeRwf: 0, isActive: true },
  });
  zeroFeeAreaId = zeroFeeArea.id;

  // Order events reference a real staff account (foreign key enforced).
  const staff = await db.user.create({
    data: {
      name: "Test Staff",
      email: `staff-${suffix}@test.local`,
      passwordHash: "not-used-in-tests",
      role: "STAFF",
    },
  });
  actor = { id: staff.id, name: staff.name, email: staff.email };
});

afterAll(async () => {
  await db.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await db.stockMovement.deleteMany({ where: { productId: { in: [productId, referenceProductId] } } });
  await db.product.deleteMany({ where: { id: { in: [productId, referenceProductId] } } });
  await db.deliveryArea.deleteMany({ where: { id: { in: [deliveryAreaId, zeroFeeAreaId] } } });
  await db.category.deleteMany({ where: { id: categoryId } });
  await db.user.deleteMany({ where: { id: actor.id } });
  if (originalSettings) {
    await db.siteSetting.update({
      where: { key: "site" },
      data: { value: originalSettings as never },
    });
  }
  await db.$disconnect();
});

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId, quantity: 2 }],
    customerName: "Test Customer",
    customerEmail: "customer@test.local",
    customerPhone: "0780551125",
    deliveryAreaId,
    deliveryAddress: "KG 11 Ave, Gisozi, Kigali",
    paymentMethod: "CASH_ON_DELIVERY" as const,
    idempotencyKey: `test-${suffix}-${Math.random().toString(36).slice(2, 10)}`,
    ...overrides,
  };
}

describe("order creation", () => {
  it("prices on the server, reserves stock and records a movement", async () => {
    const result = await createOrder(baseInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdOrderIds.push(result.order.id);

    expect(result.order.subtotalRwf).toBe(200_000);
    expect(result.order.deliveryFeeRwf).toBe(2_000);
    expect(result.order.totalRwf).toBe(202_000);
    expect(result.order.status).toBe("PENDING_PAYMENT");
    expect(result.order.paymentStatus).toBe("UNPAID");

    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(3);

    const movements = await db.stockMovement.findMany({
      where: { orderId: result.order.id, reason: "ORDER_PLACED" },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(-2);
  });

  it("returns the original order for a repeated idempotency key without taking more stock", async () => {
    await resetStock(2);
    const key = `idem-${suffix}`;
    const first = await createOrder(baseInput({ idempotencyKey: key }));
    const second = await createOrder(baseInput({ idempotencyKey: key }));
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    createdOrderIds.push(first.order.id);

    expect(second.order.orderNumber).toBe(first.order.orderNumber);
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(0);
  });

  it("refuses to oversell", async () => {
    await resetStock(3);
    const result = await createOrder(baseInput({ items: [{ productId, quantity: 15 }] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INSUFFICIENT_STOCK");
  });

  it("refuses reference listings without an approved price", async () => {
    const result = await createOrder(baseInput({ items: [{ productId: referenceProductId, quantity: 1 }] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_PURCHASABLE");
  });

  it("refuses payment methods that are not configured", async () => {
    const result = await createOrder(baseInput({ paymentMethod: "MTN_MOMO_API" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PAYMENT_METHOD_UNAVAILABLE");
  });

  it("refuses inactive or unknown delivery areas", async () => {
    const result = await createOrder(baseInput({ deliveryAreaId: "not-a-real-area" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_DELIVERY_AREA");
  });
});

describe("stock on request", () => {
  it("accepts an order with no stock figure and leaves inventory untouched", async () => {
    await setSiteSettings({ stockMode: "ON_REQUEST", cashOnDelivery: true });
    await resetStock(0);

    const created = await createOrder(
      baseInput({ items: [{ productId, quantity: 3 }], idempotencyKey: `onrequest-${suffix}` }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    expect(created.order.status).toBe("PENDING_PAYMENT");
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(0);

    const movements = await db.stockMovement.count({
      where: { orderId: created.order.id, reason: "ORDER_PLACED" },
    });
    expect(movements).toBe(0);
  });

  it("returns to tracked stock rules afterwards", async () => {
    await setSiteSettings({ stockMode: "TRACKED", cashOnDelivery: true });
    await resetStock(1);
    const result = await createOrder(
      baseInput({ items: [{ productId, quantity: 2 }], idempotencyKey: `tracked-${suffix}` }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INSUFFICIENT_STOCK");
  });
});

describe("order lifecycle", () => {
  it("confirms a manual payment and records an order event", async () => {
    await resetStock();
    const created = await createOrder(baseInput({ paymentMethod: "MANUAL_MOBILE_MONEY" }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);
    expect(created.order.paymentStatus).toBe("PENDING");

    const confirmation = await confirmManualPayment({
      orderId: created.order.id,
      paymentReference: `MOMO-${suffix}`,
      note: "Verified in statement",
      actor,
    });
    expect(confirmation.ok).toBe(true);

    const refreshed = await getOrderByNumber(created.order.orderNumber);
    expect(refreshed?.paymentStatus).toBe("PAID");
    expect(refreshed?.status).toBe("PAID");
    expect(refreshed?.paymentReference).toBe(`MOMO-${suffix}`);
    expect(refreshed?.events.some((event) => event.type === "PAYMENT_CONFIRMED")).toBe(true);

    const again = await confirmManualPayment({
      orderId: created.order.id,
      paymentReference: "duplicate",
      actor,
    });
    expect(again.ok).toBe(false);
  });

  it("returns stock once when an order is cancelled and locks cancelled orders", async () => {
    await resetStock();
    const created = await createOrder(baseInput({ items: [{ productId, quantity: 1 }], idempotencyKey: `cancel-${suffix}` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    const before = await db.product.findUniqueOrThrow({ where: { id: productId } });
    const cancel = await updateOrderStatus({
      orderId: created.order.id,
      status: "CANCELLED",
      actor,
      note: "Customer changed their mind",
    });
    expect(cancel.ok).toBe(true);

    const after = await db.product.findUniqueOrThrow({ where: { id: productId } });
    expect(after.stock).toBe(before.stock + 1);

    const secondCancel = await updateOrderStatus({
      orderId: created.order.id,
      status: "CANCELLED",
      actor,
    });
    expect(secondCancel.ok).toBe(false);

    const third = await updateOrderStatus({ orderId: created.order.id, status: "PROCESSING", actor });
    expect(third.ok).toBe(false);
  });

  it("tracks an order only with the matching email or phone", async () => {
    await resetStock();
    const created = await createOrder(baseInput({ idempotencyKey: `track-${suffix}` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    const byEmail = await trackOrder({
      orderNumber: created.order.orderNumber,
      contact: "CUSTOMER@test.local",
    });
    expect(byEmail?.id).toBe(created.order.id);

    const byPhone = await trackOrder({
      orderNumber: created.order.orderNumber,
      contact: "+250 780 551 125",
    });
    expect(byPhone?.id).toBe(created.order.id);

    const wrong = await trackOrder({
      orderNumber: created.order.orderNumber,
      contact: "someone-else@test.local",
    });
    expect(wrong).toBeNull();
  });
});

describe("approved selling price vs reference price", () => {
  it("charges the approved selling price and never the historical reference price", async () => {
    await setSiteSettings({ stockMode: "TRACKED", cashOnDelivery: true });
    const product = await db.product.create({
      data: {
        name: `Priced product ${suffix}`,
        slug: `priced-product-${suffix}`,
        sku: `PRICED-${suffix}`,
        categoryId,
        priceRwf: 111_000,
        referencePriceRwf: 77_777,
        referenceSource: "test supplier reference",
        referenceRetrievedAt: new Date("2026-10-26T08:45:00Z"),
        stock: 5,
        dataStatus: "APPROVED",
        isPublished: true,
      },
    });

    const created = await createOrder(
      baseInput({
        items: [{ productId: product.id, quantity: 2 }],
        idempotencyKey: `price-${suffix}`,
      }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    expect(created.order.items[0].unitPriceRwf).toBe(111_000);
    expect(created.order.items[0].lineTotalRwf).toBe(222_000);
    expect(created.order.subtotalRwf).toBe(222_000);
    expect(created.order.totalRwf).toBe(224_000); // + 2,000 test delivery fee
    expect(created.order.totalRwf).not.toBe(2 * 77_777 + 2_000);

    // The stored order keeps the approved price, not the reference price.
    const stored = await getOrderByNumber(created.order.orderNumber);
    expect(stored?.items[0].unitPriceRwf).toBe(111_000);

    await db.order.delete({ where: { id: created.order.id } });
    await db.stockMovement.deleteMany({ where: { productId: product.id } });
    await db.product.delete({ where: { id: product.id } });
  });
});

describe("delivery agreed by phone", () => {
  it("treats a zero-fee area as free delivery and lets staff override it", async () => {
    await setSiteSettings({ stockMode: "TRACKED", cashOnDelivery: true });
    await resetStock(10);

    const created = await createOrder(
      baseInput({
        items: [{ productId, quantity: 1 }],
        deliveryAreaId: zeroFeeAreaId,
        idempotencyKey: `delivery-${suffix}`,
      }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    expect(created.order.deliveryFeeStatus).toBe("FREE");
    expect(created.order.deliveryFeeRwf).toBe(0);
    expect(created.order.totalRwf).toBe(created.order.subtotalRwf);

    const agreed = await recordDeliveryFeeAgreement({
      orderId: created.order.id,
      status: "AGREED",
      agreedFeeRwf: 7_000,
      note: "Agreed by phone",
      actor,
    });
    expect(agreed.ok).toBe(true);

    const afterAgreement = await getOrderByNumber(created.order.orderNumber);
    expect(afterAgreement?.deliveryFeeStatus).toBe("AGREED");
    expect(afterAgreement?.deliveryFeeAgreedRwf).toBe(7_000);
    expect(afterAgreement?.deliveryFeeRwf).toBe(7_000);
    expect(afterAgreement?.totalRwf).toBe((afterAgreement?.subtotalRwf ?? 0) + 7_000);
    expect(afterAgreement?.deliveryFeeAgreedBy).toBe(actor.email);
    expect(
      afterAgreement?.events.some((event) => event.type === "DELIVERY_FEE_AGREED"),
    ).toBe(true);

    // Agreeing a delivery fee must not be confused with payment or delivery.
    expect(afterAgreement?.paymentStatus).toBe("UNPAID");
    expect(afterAgreement?.status).toBe("PENDING_PAYMENT");

    const waived = await recordDeliveryFeeAgreement({
      orderId: created.order.id,
      status: "WAIVED",
      actor,
    });
    expect(waived.ok).toBe(true);
    const afterWaiver = await getOrderByNumber(created.order.orderNumber);
    expect(afterWaiver?.deliveryFeeStatus).toBe("WAIVED");
    expect(afterWaiver?.deliveryFeeRwf).toBe(0);
    expect(afterWaiver?.totalRwf).toBe(afterWaiver?.subtotalRwf);
  });

  it("refuses to re-price a paid order", async () => {
    await resetStock(10);
    const created = await createOrder(
      baseInput({ idempotencyKey: `delivery-paid-${suffix}` }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    const paid = await confirmManualPayment({
      orderId: created.order.id,
      paymentReference: `PAID-${suffix}`,
      actor,
    });
    expect(paid.ok).toBe(true);

    const result = await recordDeliveryFeeAgreement({
      orderId: created.order.id,
      status: "AGREED",
      agreedFeeRwf: 3_000,
      actor,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/already paid/i);
  });
});

describe("Airtel Money manual verification", () => {
  it("stays pending when the customer submits a reference and is only paid after staff verification", async () => {
    await setSiteSettings({ stockMode: "TRACKED", cashOnDelivery: true });
    await resetStock(10);

    const created = await createOrder(
      baseInput({
        paymentMethod: "MANUAL_AIRTEL_MONEY",
        idempotencyKey: `airtel-${suffix}`,
      }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdOrderIds.push(created.order.id);

    expect(created.order.paymentMethod).toBe("MANUAL_AIRTEL_MONEY");
    expect(created.order.paymentStatus).toBe("PENDING");
    expect(created.order.status).toBe("PENDING_PAYMENT");

    const submitted = await submitPaymentReference({
      orderNumber: created.order.orderNumber,
      paymentReference: `AIRTEL-${suffix}`,
    });
    expect(submitted.ok).toBe(true);

    const afterReference = await getOrderByNumber(created.order.orderNumber);
    expect(afterReference?.paymentReference).toBe(`AIRTEL-${suffix}`);
    expect(afterReference?.paymentStatus).toBe("PENDING");
    expect(afterReference?.status).toBe("PENDING_PAYMENT");
    expect(afterReference?.paidAt).toBeNull();

    // Only an authorised staff verification can mark it paid.
    const confirmed = await confirmManualPayment({
      orderId: created.order.id,
      paymentReference: `AIRTEL-${suffix}`,
      note: "Verified in the Airtel statement",
      actor,
    });
    expect(confirmed.ok).toBe(true);

    const paid = await getOrderByNumber(created.order.orderNumber);
    expect(paid?.paymentStatus).toBe("PAID");
    expect(paid?.paymentConfirmedBy).toBe(actor.email);

    // A customer cannot re-submit evidence on a paid order.
    const resubmit = await submitPaymentReference({
      orderNumber: created.order.orderNumber,
      paymentReference: "second-reference",
    });
    expect(resubmit.ok).toBe(false);
  });
});
