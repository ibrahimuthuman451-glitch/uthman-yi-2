import type {
  InquiryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductDataStatus,
  SoftwareStatus,
} from "@prisma/client";

/** Primary navigation shown in the header and footer. */
export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/software-development", label: "Software Development" },
  { href: "/software", label: "Our Software" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export const inquiryTypeLabels: Record<InquiryType, string> = {
  PRODUCT_ENQUIRY: "Product enquiry",
  ORDER_SUPPORT: "Order support",
  SOFTWARE_DEVELOPMENT: "Software development",
  MATCHVISION_AI: "MatchVision AI",
  DIGITAL_DISCIPLINE: "Digital Discipline",
  TENDER_AI: "Tender AI",
  PARTNERSHIP: "Partnership or other",
  OTHER: "Other",
};

export const inquiryStatusLabels: Record<string, string> = {
  NEW: "New",
  IN_REVIEW: "In review",
  CLOSED: "Closed",
  SPAM: "Spam",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const deliveryFeeStatusLabels: Record<string, string> = {
  PENDING_AGREEMENT: "Delivery fee pending agreement",
  AGREED: "Delivery fee agreed",
  WAIVED: "Delivery waived",
  FREE: "Free delivery",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PENDING: "Payment pending verification",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  MANUAL_MOBILE_MONEY: "MTN MoMo (manual verification)",
  MANUAL_AIRTEL_MONEY: "Airtel Money (manual verification)",
  BANK_TRANSFER: "Bank transfer",
  MTN_MOMO_API: "MTN MoMo (online)",
};

export const productDataStatusLabels: Record<ProductDataStatus, string> = {
  APPROVED: "Approved listing",
  REFERENCE: "Reference research",
  DEMO: "Demonstration listing",
};

export const softwareStatusLabels: Record<SoftwareStatus, string> = {
  UPCOMING: "Upcoming",
  IN_DEVELOPMENT: "In development",
  TESTING: "In testing",
  LIVE: "Live",
};

export const featureStatusLabels: Record<string, string> = {
  LIVE: "Available now",
  EXPERIMENTAL: "Experimental",
  PLANNED: "Planned",
};

export const PAGE_SIZE = 9;

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
];
