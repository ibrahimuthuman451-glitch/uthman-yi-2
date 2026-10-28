"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireStaffForAction } from "@/lib/auth/authorization";
import { formString, fieldErrorsFromZod } from "@/lib/validation/catalog";
import { manualPaymentSchema, orderUpdateSchema } from "@/lib/validation/operations";
import {
  confirmManualPayment,
  recordDeliveryFeeAgreement,
  updateOrderStatus,
} from "@/server/services/orders";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

export async function updateOrderStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const orderId = formString(formData, "orderId");
  const parsed = orderUpdateSchema.safeParse({
    status: formString(formData, "status"),
    note: formString(formData, "note"),
  });
  if (!parsed.success) {
    return actionError("Choose a valid status.", fieldErrorsFromZod(parsed.error));
  }
  if (!orderId) return actionError("Missing order.");

  try {
    const result = await updateOrderStatus({
      orderId,
      status: parsed.data.status,
      actor: user,
      note: parsed.data.note,
    });
    if (!result.ok) return actionError(result.message);

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "order.status_updated",
      entityType: "Order",
      entityId: orderId,
      metadata: { status: parsed.data.status, note: parsed.data.note },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "update-order-status");
  }
}

export async function confirmPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const orderId = formString(formData, "orderId");
  const parsed = manualPaymentSchema.safeParse({
    paymentReference: formString(formData, "paymentReference"),
    note: formString(formData, "note"),
  });
  if (!parsed.success) {
    return actionError("Check the payment details.", fieldErrorsFromZod(parsed.error));
  }
  if (!orderId) return actionError("Missing order.");

  try {
    const result = await confirmManualPayment({
      orderId,
      paymentReference: parsed.data.paymentReference,
      note: parsed.data.note,
      actor: user,
    });
    if (!result.ok) return actionError(result.message);

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "order.payment_confirmed",
      entityType: "Order",
      entityId: orderId,
      metadata: { paymentReference: parsed.data.paymentReference },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "confirm-payment");
  }
}

const deliveryFeeSchema = z.object({
  status: z.enum(["AGREED", "WAIVED"]),
  agreedFee: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default(""),
  note: z.string().trim().max(500).optional().default(""),
});

export async function recordDeliveryFeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const orderId = formString(formData, "orderId");
  if (!orderId) return actionError("Missing order.");

  const parsed = deliveryFeeSchema.safeParse({
    status: formString(formData, "status"),
    agreedFee: formString(formData, "agreedFee"),
    note: formString(formData, "note"),
  });
  if (!parsed.success) {
    return actionError("Check the delivery fee details.", fieldErrorsFromZod(parsed.error));
  }

  const rawFee = parsed.data.agreedFee.replace(/[,\s]/g, "");
  let agreedFee: number | null = null;
  if (parsed.data.status === "AGREED") {
    if (!/^\d+$/.test(rawFee)) {
      return actionError("Enter the agreed delivery fee in whole Rwandan francs.", {
        agreedFee: ["Whole francs only, e.g. 5000"],
      });
    }
    agreedFee = Number(rawFee);
  }

  try {
    const result = await recordDeliveryFeeAgreement({
      orderId,
      status: parsed.data.status,
      agreedFeeRwf: agreedFee,
      note: parsed.data.note,
      actor: user,
    });
    if (!result.ok) return actionError(result.message);

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "order.delivery_fee_recorded",
      entityType: "Order",
      entityId: orderId,
      metadata: { status: parsed.data.status, agreedFeeRwf: agreedFee, note: parsed.data.note },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "record-delivery-fee");
  }
}
