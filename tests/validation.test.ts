import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  contactFormSchema,
  normalizeRwandaPhone,
  parseCartPayload,
  trackOrderSchema,
} from "@/lib/validation/forms";
import { generateOrderNumber, isOrderNumberFormat } from "@/lib/orders/order-number";
import { formatRwf, parseRwfInput } from "@/lib/money";
import { paymentMethodSchema } from "@/lib/validation/forms";
import { parseDeliveryAreaLines } from "@/lib/validation/settings-lines";

describe("Rwandan phone normalisation", () => {
  it("accepts local and international formats", () => {
    expect(normalizeRwandaPhone("0780551125")).toBe("0780551125");
    expect(normalizeRwandaPhone("+250 780 551 125")).toBe("0780551125");
    expect(normalizeRwandaPhone("250780551125")).toBe("0780551125");
  });

  it("rejects invalid prefixes and lengths", () => {
    expect(normalizeRwandaPhone("0755555555")).toBeNull();
    expect(normalizeRwandaPhone("07805511")).toBeNull();
    expect(normalizeRwandaPhone("not a phone")).toBeNull();
  });
});

const validCheckout = {
  customerName: "Test Customer",
  customerEmail: "Test@Example.com",
  customerPhone: "0780551125",
  deliveryAreaId: "area_1",
  deliveryAddress: "KG 11 Ave, Gisozi, near the market",
  deliveryNotes: "Call on arrival",
  paymentMethod: "CASH_ON_DELIVERY",
  paymentReference: "",
  idempotencyKey: "8f2c1b7e-1234-4a9b-9c1d-abcdef123456",
  items: JSON.stringify([{ productId: "p1", quantity: 2 }]),
  consent: "on",
  website: "",
};

describe("checkout validation", () => {
  it("accepts a valid submission and lowercases the email", () => {
    const result = checkoutFormSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerEmail).toBe("test@example.com");
      expect(result.data.customerPhone).toBe("0780551125");
    }
  });

  it("rejects a missing terms acceptance", () => {
    const result = checkoutFormSchema.safeParse({ ...validCheckout, consent: "" });
    expect(result.success).toBe(false);
  });

  it("rejects honeypot submissions", () => {
    const result = checkoutFormSchema.safeParse({ ...validCheckout, website: "http://spam" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phones, emails and short addresses", () => {
    expect(checkoutFormSchema.safeParse({ ...validCheckout, customerPhone: "12345" }).success).toBe(false);
    expect(checkoutFormSchema.safeParse({ ...validCheckout, customerEmail: "nope" }).success).toBe(false);
    expect(checkoutFormSchema.safeParse({ ...validCheckout, deliveryAddress: "Kigali" }).success).toBe(false);
  });

  it("rejects malformed cart payloads and hostile quantities", () => {
    expect(parseCartPayload("not json").success).toBe(false);
    expect(parseCartPayload("[]").success).toBe(false);
    expect(parseCartPayload(JSON.stringify([{ productId: "p1", quantity: 0 }])).success).toBe(false);
    expect(parseCartPayload(JSON.stringify([{ productId: "p1", quantity: -5 }])).success).toBe(false);
    expect(parseCartPayload(JSON.stringify([{ productId: "p1", quantity: 1.5 }])).success).toBe(false);
  });
});

describe("contact form validation", () => {
  const base = {
    type: "PRODUCT_ENQUIRY" as const,
    name: "Test Person",
    email: "person@example.com",
    phone: "",
    company: "",
    subject: "CCTV question",
    message: "I would like to ask about availability of cameras.",
    productSlug: "",
    website: "",
    consent: "on",
  };

  it("accepts a valid inquiry", () => {
    expect(contactFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects unknown inquiry types and short messages", () => {
    expect(contactFormSchema.safeParse({ ...base, type: "HACK" }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...base, message: "hi" }).success).toBe(false);
  });
});

describe("payment method validation", () => {
  it("accepts both manual mobile money methods", () => {
    expect(paymentMethodSchema.safeParse("MANUAL_MOBILE_MONEY").success).toBe(true);
    expect(paymentMethodSchema.safeParse("MANUAL_AIRTEL_MONEY").success).toBe(true);
  });

  it("rejects an invented payment method", () => {
    expect(paymentMethodSchema.safeParse("FREE_MONEY").success).toBe(false);
  });
});

describe("order numbers and money helpers", () => {
  it("generates a correctly formatted, unique-looking order number", () => {
    const first = generateOrderNumber(new Date("2026-10-25T10:00:00Z"));
    const second = generateOrderNumber(new Date("2026-10-25T10:00:00Z"));
    expect(isOrderNumberFormat(first)).toBe(true);
    expect(first.startsWith("UY-261025-")).toBe(true);
    expect(first).not.toBe(second);
  });

  it("validates tracking input format", () => {
    expect(trackOrderSchema.safeParse({ orderNumber: "uy-261025-7k4q", contact: "0780551125" }).success).toBe(true);
    expect(trackOrderSchema.safeParse({ orderNumber: "12345", contact: "0780551125" }).success).toBe(false);
  });

  it("formats RWF amounts without decimals and parses admin input", () => {
    expect(formatRwf(650000)).toContain("650,000");
    expect(formatRwf(null)).toBe("Price on request");
    expect(parseRwfInput("650,000")).toBe(650000);
    expect(parseRwfInput("650000 RWF")).toBe(650000);
    expect(parseRwfInput("12.5")).toBeNull();
    expect(parseRwfInput("-10")).toBeNull();
  });
});

describe("delivery area parsing", () => {
  it("parses valid lines and reports errors", () => {
    const ok = parseDeliveryAreaLines("Kigali CBD | 5000 | active\nGisozi | 3000 | active | Gate pickup");
    expect(ok.errors).toEqual([]);
    expect(ok.areas).toHaveLength(2);
    expect(ok.areas[0].feeRwf).toBe(5000);
    expect(ok.areas[1].notes).toBe("Gate pickup");

    const badFee = parseDeliveryAreaLines("Kigali | abc | active");
    expect(badFee.errors.length).toBe(1);
    expect(badFee.areas).toHaveLength(0);

    const duplicate = parseDeliveryAreaLines("Kigali | 1000 | active\nKigali | 2000 | active");
    expect(duplicate.errors.length).toBe(1);
    expect(duplicate.errors[0]).toContain("duplicate");
  });
});
