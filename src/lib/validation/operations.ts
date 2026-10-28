import { z } from "zod";
import { emailSchema, normalizeRwandaPhone, optionalEmailSchema, optionalPhoneSchema } from "./forms";

export const settingsFormSchema = z.object({
  companyName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(1)
    .refine((value) => normalizeRwandaPhone(value) !== null, "Enter a Rwandan phone number"),
  secondaryPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .default("")
    .refine(
      (value) => !value || normalizeRwandaPhone(value) !== null,
      "Enter a Rwandan phone number or leave it blank",
    ),
  email: optionalEmailSchema,
  whatsappPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .default("")
    .refine(
      (value) => !value || normalizeRwandaPhone(value) !== null,
      "Enter a Rwandan phone number or leave it blank",
    ),
  addressLine: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  catalogueNotice: z.string().trim().max(400).optional().default(""),
  orderNotice: z.string().trim().max(400).optional().default(""),
  deliveryNotice: z.string().trim().max(400).optional().default(""),
  stockMode: z.enum(["TRACKED", "ON_REQUEST"]),
  showDemoProducts: z.boolean(),
  maxQuantityPerItem: z.coerce.number().int().min(1).max(100),
  freeDeliveryThreshold: z.coerce.number().int().min(0).max(10_000_000).nullable(),
  cashOnDeliveryEnabled: z.boolean(),
  cashOnDeliveryInstructions: z.string().trim().max(600).optional().default(""),
  manualMomoEnabled: z.boolean(),
  manualMtnNumber: optionalPhoneSchema,
  manualMomoInstructions: z.string().trim().max(600).optional().default(""),
  airtelMoneyEnabled: z.boolean(),
  airtelMoneyNumber: optionalPhoneSchema,
  airtelMoneyVerified: z.boolean(),
  airtelMoneyInstructions: z.string().trim().max(600).optional().default(""),
  bankTransferEnabled: z.boolean(),
  bankName: z.string().trim().max(120).optional().default(""),
  bankAccountName: z.string().trim().max(120).optional().default(""),
  bankAccountNumber: z.string().trim().max(60).optional().default(""),
  bankInstructions: z.string().trim().max(600).optional().default(""),
  mtnMomoApiEnabled: z.boolean(),
  heroEyebrow: z.string().trim().max(120).optional().default(""),
  heroHeadline: z.string().trim().max(120).optional().default(""),
  heroHighlight: z.string().trim().max(120).optional().default(""),
  heroSubheadline: z.string().trim().max(400).optional().default(""),
  announcement: z.string().trim().max(200).optional().default(""),
  // One delivery area per line: "Name | Fee in RWF | active|inactive".
  deliveryAreas: z.string().trim().max(4000).optional().default(""),
}).superRefine((value, ctx) => {
  if (value.manualMomoEnabled && !value.manualMtnNumber) {
    ctx.addIssue({
      path: ["manualMtnNumber"],
      code: z.ZodIssueCode.custom,
      message: "Enter the MTN MoMo receiving number, or disable MTN MoMo",
    });
  }
  if (value.airtelMoneyEnabled && !value.airtelMoneyNumber) {
    ctx.addIssue({
      path: ["airtelMoneyNumber"],
      code: z.ZodIssueCode.custom,
      message: "Enter the Airtel Money receiving number, or disable Airtel Money",
    });
  }
});

export const orderUpdateSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "COMPLETED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(500).optional().default(""),
});

export const manualPaymentSchema = z.object({
  paymentReference: z
    .string()
    .trim()
    .min(3, "Enter the verified transaction reference")
    .max(120),
  note: z.string().trim().max(500).optional().default(""),
});

export const inquiryUpdateSchema = z.object({
  status: z.enum(["NEW", "IN_REVIEW", "CLOSED", "SPAM"]),
  adminNotes: z.string().trim().max(2000).optional().default(""),
});

export const userFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: emailSchema,
  role: z.enum(["ADMIN", "STAFF"]),
  password: z
    .string()
    .max(200)
    .optional()
    .default("")
    .refine(
      (value) =>
        value === "" || (value.length >= 10 && /[A-Za-z]/.test(value) && /\d/.test(value)),
      "Use at least 10 characters including a letter and a number",
    ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});
