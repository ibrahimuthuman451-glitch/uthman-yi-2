/**
 * Business settings defaults (pure module, safe to import from scripts).
 *
 * Only information supplied by the owner is pre-filled. Everything the owner
 * has not confirmed (email address, street address, opening hours, bank
 * details) stays empty and the UI hides it instead of inventing a value.
 */

import { isProduction } from "./env";

export type SiteSettings = {
  company: {
    name: string;
    phone: string;
    secondaryPhone: string;
    email: string;
    addressLine: string;
    city: string;
    country: string;
    whatsappPhone: string;
  };
  store: {
    currency: "RWF";
    /**
     * TRACKED enforces the stock column (orders are refused when stock is short).
     * ON_REQUEST lets customers order with stock confirmed by phone before
     * dispatch - used when no reliable inventory figure exists yet.
     */
    stockMode: "TRACKED" | "ON_REQUEST";
    showDemoProducts: boolean;
    catalogueNotice: string;
    orderNotice: string;
    deliveryNotice: string;
    freeDeliveryThreshold: number | null;
    maxQuantityPerItem: number;
  };
  payments: {
    cashOnDelivery: { enabled: boolean; instructions: string };
    /**
     * MTN MoMo is verified manually: the customer pays the merchant number and
     * submits the transaction reference, which staff must confirm.
     */
    manualMobileMoney: {
      enabled: boolean;
      mtnNumber: string;
      instructions: string;
    };
    /**
     * Airtel Money is a separate manual method with its own receiving number.
     * `verified` records whether the business has confirmed that the number is
     * a valid Uthman IY receiving account; it is not an API integration.
     */
    manualAirtelMoney: {
      enabled: boolean;
      number: string;
      verified: boolean;
      instructions: string;
    };
    bankTransfer: {
      enabled: boolean;
      bankName: string;
      accountName: string;
      accountNumber: string;
      instructions: string;
    };
    mtnMomoApi: { enabled: boolean };
  };
  /**
   * Weekly reference-price review. Uthman IY reviews supplier prices every
   * seven days; reviewing existing information is recorded separately from a
   * supplier-confirmed price because no automated supplier feed exists.
   */
  priceReview: {
    intervalDays: number;
    referenceCapturedAt: string | null;
    lastReviewedAt: string | null;
    lastReviewedBy: string;
    lastReviewKind: "NONE" | "INTERNAL_CHECK" | "SUPPLIER_CONFIRMED";
    lastReviewNote: string;
  };
  content: {
    heroEyebrow: string;
    heroHeadline: string;
    heroHighlight: string;
    heroSubheadline: string;
    announcement: string;
  };
};

export const SETTINGS_KEY = "site";

export const defaultSettings: SiteSettings = {
  company: {
    name: "Uthman IY",
    phone: "0780551125",
    // Confirmed by the owner on 2026-10-26 (+250 785 779 207).
    secondaryPhone: "0785779207",
    email: "uthumanyi@gmail.com",
    addressLine: "Gisozi",
    city: "Kigali",
    country: "Rwanda",
    // WhatsApp uses the second business line, confirmed by the owner on 2026-10-26.
    whatsappPhone: "0785779207",
  },
  store: {
    currency: "RWF",
    // No verified inventory figures exist yet, so availability is confirmed by
    // phone before dispatch. Switch to TRACKED once real stock is maintained.
    stockMode: "ON_REQUEST",
    // Demo listings are seeded only in non-production environments and are
    // always labelled. This flag lets the owner hide them entirely.
    showDemoProducts: !isProduction(),
    catalogueNotice:
      "All prices are in Rwandan francs (RWF) and were last reviewed on 26 October 2026. Delivery is free across Rwanda.",
    orderNotice:
      "Your order is confirmed by phone before dispatch. Payment instructions are shown on your order page.",
    deliveryNotice:
      "Free delivery across Rwanda. No delivery fee is added at checkout, so the total shown is the final amount for your products.",
    freeDeliveryThreshold: null,
    maxQuantityPerItem: 20,
  },
  payments: {
    cashOnDelivery: {
      // Owner confirmed mobile money as the payment route; cash on delivery is
      // available to re-enable in Admin -> Settings if the rider workflow allows it.
      enabled: false,
      instructions:
        "Pay the rider in cash when your order is delivered. Orders are confirmed by phone before dispatch.",
    },
    manualMobileMoney: {
      enabled: true,
      mtnNumber: "0780551125",
      instructions:
        "Send the products total by MTN MoMo to 0780551125, then submit the transaction reference from your SMS. Our team verifies the payment before dispatch.",
    },
    manualAirtelMoney: {
      enabled: true,
      // Supplied by the owner on 2026-10-26. The account has not been
      // independently verified, so `verified` stays false until the business
      // confirms it is a valid Uthman IY receiving number.
      number: "0727733580",
      verified: false,
      instructions:
        "Send the products total by Airtel Money to 0727 733 580, then submit the transaction reference from your SMS. Our team verifies the payment before dispatch.",
    },
    bankTransfer: {
      enabled: false,
      bankName: "",
      accountName: "",
      accountNumber: "",
      instructions:
        "Bank details will be published once the business account is confirmed. Until then, choose another payment method.",
    },
    mtnMomoApi: { enabled: false },
  },
  priceReview: {
    intervalDays: 7,
    referenceCapturedAt: "2026-10-26T08:45:00.000Z",
    lastReviewedAt: null,
    lastReviewedBy: "",
    lastReviewKind: "NONE",
    lastReviewNote: "",
  },
  content: {
    heroEyebrow: "Technology company · Gisozi, Kigali",
    heroHeadline: "Technology that moves",
    heroHighlight: "your business forward.",
    heroSubheadline:
      "Uthman IY supplies technology products, builds software, and develops our own analytics and productivity tools for organisations in Rwanda.",
    announcement: "",
  },
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Merges stored overrides onto defaults, ignoring unknown keys and nulls. */
export function mergeSettings(base: SiteSettings, override: unknown): SiteSettings {
  if (!override || typeof override !== "object") return base;
  const result: SiteSettings = JSON.parse(JSON.stringify(base));
  for (const [section, values] of Object.entries(override as Record<string, unknown>)) {
    if (!(section in result) || !values || typeof values !== "object") continue;
    const target = (result as unknown as Record<string, Record<string, unknown>>)[section];
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (key in target && value !== undefined && value !== null) {
        target[key] = value;
      }
    }
  }
  return result;
}
