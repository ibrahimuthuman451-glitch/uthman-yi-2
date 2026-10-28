"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientKeyFromHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { checkoutFormSchema, parseCartPayload, trackOrderSchema, paymentReferenceSubmissionSchema } from "@/lib/validation/forms";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import { createOrder, submitPaymentReference, trackOrder } from "@/server/services/orders";
import { grantOrderAccess, hasOrderAccess } from "@/lib/orders/access";
import {
  actionError,
  actionSuccess,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

export async function placeOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "checkout"),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return actionError(
      "Too many checkout attempts. Please wait a few minutes before trying again.",
    );
  }

  const parsed = checkoutFormSchema.safeParse({
    customerName: formString(formData, "customerName"),
    customerEmail: formString(formData, "customerEmail"),
    customerPhone: formString(formData, "customerPhone"),
    deliveryAreaId: formString(formData, "deliveryAreaId"),
    deliveryAddress: formString(formData, "deliveryAddress"),
    deliveryNotes: formString(formData, "deliveryNotes"),
    paymentMethod: formString(formData, "paymentMethod"),
    paymentReference: formString(formData, "paymentReference"),
    idempotencyKey: formString(formData, "idempotencyKey"),
    items: formString(formData, "items"),
    consent: formString(formData, "consent"),
    website: formString(formData, "website"),
  });

  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const cart = parseCartPayload(parsed.data.items);
  if (!cart.success || !Array.isArray(cart.data)) {
    return actionError("Your cart is empty or could not be read. Please review your cart.");
  }

  try {
    const result = await createOrder({
      items: cart.data,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      deliveryAreaId: parsed.data.deliveryAreaId,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryNotes: parsed.data.deliveryNotes,
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    if (!result.ok) {
      return actionError(result.message);
    }

    await grantOrderAccess(result.order.orderNumber);
    revalidatePath("/admin/orders");

    if (result.warning) {
      return actionSuccess(result.warning, { orderNumber: result.order.orderNumber });
    }

    redirect(`/orders/${result.order.orderNumber}?placed=1`);
  } catch (error) {
    return unexpectedError(error, "checkout");
  }
}

export async function trackOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "track"),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return actionError("Too many lookups. Please wait a few minutes and try again.");
  }

  const parsed = trackOrderSchema.safeParse({
    orderNumber: formString(formData, "orderNumber"),
    contact: formString(formData, "contact"),
  });
  if (!parsed.success) {
    return actionError("Check the order number and contact detail.", fieldErrorsFromZod(parsed.error));
  }

  try {
    const order = await trackOrder(parsed.data);
    if (!order) {
      return actionError(
        "No order matches that order number and contact detail. Check the details and try again.",
      );
    }
    await grantOrderAccess(order.orderNumber);
  } catch (error) {
    return unexpectedError(error, "track-order");
  }

  redirect(`/orders/${parsed.data.orderNumber}`);
}

export async function submitPaymentReferenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "payment-ref"),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return actionError("Too many attempts. Please wait a few minutes and try again.");
  }

  const parsed = paymentReferenceSubmissionSchema.safeParse({
    orderNumber: formString(formData, "orderNumber"),
    paymentReference: formString(formData, "paymentReference"),
  });
  if (!parsed.success) {
    return actionError("Enter the transaction reference from your mobile money or bank receipt.", fieldErrorsFromZod(parsed.error));
  }

  try {
    if (!(await hasOrderAccess(parsed.data.orderNumber))) {
      return actionError("Open this order from the tracking page before submitting a payment reference.");
    }
    const result = await submitPaymentReference(parsed.data);
    if (!result.ok) return actionError(result.message);
    revalidatePath(`/orders/${parsed.data.orderNumber}`);
    revalidatePath("/admin/orders");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "payment-reference");
  }
}
