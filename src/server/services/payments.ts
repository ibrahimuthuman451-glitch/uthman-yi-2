import "server-only";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getTransactionStatus } from "@/lib/payments/mtn-momo";

/**
 * Provider notification handling.
 *
 * The callback body is treated as a hint only. The authoritative status is
 * always re-read from the MTN API, the amount is compared with the stored
 * order total, and a PaymentEvent row makes replays idempotent.
 */

const momoCallbackSchema = z.object({
  referenceId: z.string().min(8).max(120),
  status: z.string().optional(),
  externalId: z.string().optional(),
  financialTransactionId: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
});

export async function handleMomoCallback(rawBody: unknown): Promise<{
  status: number;
  body: { ok: boolean; message: string };
}> {
  const parsed = momoCallbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { ok: false, message: "Invalid notification payload." } };
  }

  const { referenceId } = parsed.data;
  const order = await db.order.findFirst({ where: { paymentProviderRef: referenceId } });
  if (!order) {
    return { status: 404, body: { ok: false, message: "Unknown payment reference." } };
  }

  let providerStatus;
  try {
    providerStatus = await getTransactionStatus(referenceId);
  } catch (error) {
    console.error("[payments] could not verify MTN status", error);
    return {
      status: 503,
      body: { ok: false, message: "Could not verify the payment with the provider." },
    };
  }

  const eventId = `${referenceId}:${providerStatus.status}:${providerStatus.financialTransactionId ?? "none"}`;

  try {
    await db.paymentEvent.create({
      data: {
        provider: "MTN_MOMO",
        eventId,
        orderId: order.id,
        verified: true,
        payload: providerStatus as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return { status: 200, body: { ok: true, message: "Notification already processed." } };
    }
    throw error;
  }

  if (providerStatus.status === "SUCCESSFUL") {
    const paidAmount = Number(providerStatus.amount);
    if (Number.isFinite(paidAmount) && paidAmount !== order.totalRwf) {
      await db.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PAYMENT_AMOUNT_MISMATCH",
          message: `Provider reported ${paidAmount} ${providerStatus.currency ?? ""} but the order total is ${order.totalRwf} RWF. Manual review required.`,
        },
      });
      return {
        status: 409,
        body: { ok: false, message: "Amount mismatch. Order left pending for manual review." },
      };
    }

    if (order.paymentStatus !== "PAID") {
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            paymentConfirmedBy: "MTN MoMo (provider confirmed)",
            status: order.status === "PENDING_PAYMENT" ? "PAID" : order.status,
          },
        }),
        db.orderEvent.create({
          data: {
            orderId: order.id,
            type: "PAYMENT_CONFIRMED",
            message: `MTN MoMo confirmed payment${providerStatus.financialTransactionId ? ` (${providerStatus.financialTransactionId})` : ""}.`,
          },
        }),
      ]);
    }

    return { status: 200, body: { ok: true, message: "Payment confirmed." } };
  }

  if (providerStatus.status === "FAILED") {
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } }),
      db.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PAYMENT_FAILED",
          message: `MTN MoMo reported a failed payment${providerStatus.reason ? ` (${providerStatus.reason})` : ""}.`,
        },
      }),
    ]);
    return { status: 200, body: { ok: true, message: "Failure recorded." } };
  }

  return { status: 202, body: { ok: true, message: "Payment still pending." } };
}
