import { z } from "zod";

/**
 * Shared validation.
 *
 * Every public form and every administrative mutation is validated here on the
 * server. Client-side `required` attributes are a convenience only.
 */

/** Normalises Rwandan mobile numbers to local format 07XXXXXXXX. */
export function normalizeRwandaPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local = digits;
  if (digits.startsWith("250") && digits.length === 12) {
    local = `0${digits.slice(3)}`;
  }
  // Accept only Rwandan mobile ranges (72/73/78/79) in local format.
  return /^07[2389]\d{7}$/.test(local) ? local : null;
}

const requiredString = (label: string, min: number, max: number) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .max(254, "Email address is too long")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((value, ctx) => {
    const normalised = normalizeRwandaPhone(value);
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a Rwandan mobile number, e.g. 0780 551 125",
      });
      return z.NEVER;
    }
    return normalised;
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .optional()
  .default("")
  .transform((value, ctx) => {
    if (!value) return "";
    const normalised = normalizeRwandaPhone(value);
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a Rwandan mobile number or leave this blank",
      });
      return z.NEVER;
    }
    return normalised;
  });

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(254)
  .optional()
  .default("")
  .transform((value, ctx) => {
    if (!value) return "";
    const parsed = z.string().email().safeParse(value.toLowerCase());
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address or leave this blank",
      });
      return z.NEVER;
    }
    return parsed.data;
  });

export const inquiryTypeSchema = z.enum([
  "PRODUCT_ENQUIRY",
  "ORDER_SUPPORT",
  "SOFTWARE_DEVELOPMENT",
  "MATCHVISION_AI",
  "DIGITAL_DISCIPLINE",
  "TENDER_AI",
  "PARTNERSHIP",
  "OTHER",
]);

export const contactFormSchema = z.object({
  type: inquiryTypeSchema,
  name: requiredString("Full name", 2, 120),
  email: emailSchema,
  phone: optionalPhoneSchema,
  company: z.string().trim().max(120).optional().default(""),
  subject: requiredString("Subject", 3, 160),
  message: requiredString("Message", 10, 4000),
  productSlug: z.string().trim().max(120).optional().default(""),
  // Honeypot: real visitors never fill this hidden field.
  website: z.string().max(0, "Spam detected").optional().default(""),
  consent: z
    .string()
    .optional()
    .refine((value) => value === "on", "Please confirm that we may reply to you"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const cartItemSchema = z.object({
  productId: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const cartPayloadSchema = z.array(cartItemSchema).min(1).max(50);

export function parseCartPayload(json: string): z.SafeParseReturnType<unknown, z.infer<typeof cartPayloadSchema>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    parsed = null;
  }
  return cartPayloadSchema.safeParse(parsed);
}

export const paymentMethodSchema = z.enum([
  "CASH_ON_DELIVERY",
  "MANUAL_MOBILE_MONEY",
  "MANUAL_AIRTEL_MONEY",
  "BANK_TRANSFER",
  "MTN_MOMO_API",
]);

export const checkoutFormSchema = z.object({
  customerName: requiredString("Full name", 2, 120),
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  deliveryAreaId: z.string().trim().min(1, "Select a delivery area"),
  deliveryAddress: requiredString("Delivery address", 10, 400),
  deliveryNotes: z.string().trim().max(500).optional().default(""),
  paymentMethod: paymentMethodSchema,
  paymentReference: z.string().trim().max(120).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(100),
  items: z.string().min(2, "Your cart is empty"),
  consent: z
    .string()
    .optional()
    .refine((value) => value === "on", "Please accept the order terms"),
  website: z.string().max(0, "Spam detected").optional().default(""),
});

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^UY-\d{6}-[A-Z2-9]{4}$/, "Enter the order number, e.g. UY-261025-7K4Q"),
  contact: requiredString("Email or phone number", 5, 254),
});

export const paymentReferenceSubmissionSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().min(6).max(30),
  paymentReference: requiredString("Transaction reference", 4, 120),
});
