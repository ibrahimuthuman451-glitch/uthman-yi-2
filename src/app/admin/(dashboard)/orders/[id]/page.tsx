import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/server/services/orders";
import { AdminActionForm } from "@/components/admin/action-form";
import {
  confirmPaymentAction,
  recordDeliveryFeeAction,
  updateOrderStatusAction,
} from "@/app/actions/admin-orders";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatRwf } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import {
  deliveryFeeStatusLabels,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/constants";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/orders" className="text-xs font-semibold text-brand-700">
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900">{order.orderNumber}</h1>
          <Badge tone={order.status === "CANCELLED" ? "danger" : "brand"}>
            {orderStatusLabels[order.status]}
          </Badge>
          <Badge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>
            {paymentStatusLabels[order.paymentStatus]}
          </Badge>
          <Badge tone={order.deliveryFeeStatus === "PENDING_AGREEMENT" ? "warning" : "neutral"}>
            {deliveryFeeStatusLabels[order.deliveryFeeStatus]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-navy-500">Placed {formatDateTime(order.createdAt)}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
            <h2 className="border-b border-navy-100 px-5 py-3 text-base font-semibold text-navy-900">Items</h2>
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-navy-500">
                <tr>
                  <th scope="col" className="px-5 py-2 text-left font-semibold">Product</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Unit</th>
                  <th scope="col" className="px-5 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-navy-50">
                    <td className="px-5 py-3">
                      {item.productName}
                      <span className="block text-xs text-navy-400">{item.sku ?? "no SKU"}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatRwf(item.unitPriceRwf)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{formatRwf(item.lineTotalRwf)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-navy-100 bg-surface text-sm">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-navy-500">Subtotal</td>
                  <td className="px-5 py-2 text-right tabular-nums">{formatRwf(order.subtotalRwf)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-navy-500">
                    Delivery ({order.deliveryAreaName})
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {order.deliveryFeeStatus === "PENDING_AGREEMENT"
                      ? "To be agreed"
                      : order.deliveryFeeStatus === "WAIVED"
                        ? "Waived"
                        : order.deliveryFeeStatus === "FREE"
                          ? "Free"
                          : formatRwf(order.deliveryFeeRwf)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right font-semibold text-navy-900">
                    Total
                  </td>
                  <td className="px-5 py-2 text-right font-bold tabular-nums">{formatRwf(order.totalRwf)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Customer and delivery</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Customer</dt>
                <dd className="text-navy-900">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Phone</dt>
                <dd className="text-navy-900">
                  <a href={`tel:${order.customerPhone}`} className="hover:text-brand-700">
                    {order.customerPhone}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-navy-400">Email</dt>
                <dd className="break-anywhere text-navy-900">{order.customerEmail}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-navy-400">Delivery address</dt>
                <dd className="whitespace-pre-line text-navy-900">{order.deliveryAddress}</dd>
              </div>
              {order.deliveryNotes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Delivery notes</dt>
                  <dd className="whitespace-pre-line text-navy-900">{order.deliveryNotes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Delivery fee</dt>
                <dd className="text-navy-900">
                  {deliveryFeeStatusLabels[order.deliveryFeeStatus]}
                  {order.deliveryFeeStatus === "AGREED" && order.deliveryFeeAgreedRwf !== null
                    ? ` - ${formatRwf(order.deliveryFeeAgreedRwf)}`
                    : ""}
                  {order.deliveryFeeAgreedBy ? (
                    <span className="block text-xs text-navy-500">
                      Recorded by {order.deliveryFeeAgreedBy}
                      {order.deliveryFeeAgreedAt ? ` on ${formatDateTime(order.deliveryFeeAgreedAt)}` : ""}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Payment method</dt>
                <dd className="text-navy-900">{paymentMethodLabels[order.paymentMethod]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-navy-400">Payment reference</dt>
                <dd className="break-anywhere text-navy-900">{order.paymentReference ?? "-"}</dd>
              </div>
              {order.paymentConfirmedBy ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Confirmed by</dt>
                  <dd className="text-navy-900">{order.paymentConfirmedBy}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">History</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div>
                    <p className="text-navy-800">{event.message}</p>
                    <p className="text-xs text-navy-400">
                      {formatDateTime(event.createdAt)}
                      {event.actorLabel ? ` · ${event.actorLabel}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Delivery fee</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Delivery is free across Rwanda, so this order starts at its products total. Recording a fee here overrides
              that (for example a special courier); it updates the total on the server and is audited, but it never marks
              the order paid or delivered.
            </p>
            {order.paymentStatus !== "PAID" &&
            order.status !== "CANCELLED" &&
            order.status !== "COMPLETED" ? (
              <div className="mt-4">
                <AdminActionForm
                  action={recordDeliveryFeeAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                  submitLabel="Save delivery fee"
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field label="Outcome" htmlFor="deliveryFeeStatus" required>
                    <Select
                      id="deliveryFeeStatus"
                      name="status"
                      defaultValue={order.deliveryFeeStatus === "WAIVED" ? "WAIVED" : "AGREED"}
                    >
                      <option value="AGREED">Fee agreed with the customer</option>
                      <option value="WAIVED">Delivery waived</option>
                    </Select>
                  </Field>
                  <Field label="Agreed fee (RWF)" htmlFor="agreedFee" hint="Required when a fee was agreed. Leave blank when waiving.">
                    <Input
                      id="agreedFee"
                      name="agreedFee"
                      inputMode="numeric"
                      defaultValue={order.deliveryFeeAgreedRwf ?? ""}
                      placeholder="e.g. 5000"
                    />
                  </Field>
                  <Field label="Note (optional)" htmlFor="deliveryFeeNote">
                    <Input id="deliveryFeeNote" name="note" maxLength={500} placeholder="Agreed with the customer on the phone" />
                  </Field>
                </AdminActionForm>
              </div>
            ) : (
              <Alert tone="info" className="mt-3">
                This order is already paid, so its delivery fee and total are locked to keep the payment record consistent.
              </Alert>
            )}
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Update fulfilment</h2>
            <div className="mt-4">
              <AdminActionForm
                action={updateOrderStatusAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                submitLabel="Update status"
              >
                <input type="hidden" name="orderId" value={order.id} />
                <Field label="Status" htmlFor="status" required>
                  <Select id="status" name="status" defaultValue={order.status}>
                    {(Object.keys(orderStatusLabels) as OrderStatus[]).map((key) => (
                      <option key={key} value={key}>
                        {orderStatusLabels[key]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note (optional)" htmlFor="note" hint="Shown in the order history.">
                  <Input id="note" name="note" maxLength={500} />
                </Field>
              </AdminActionForm>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Cancelling returns reserved stock to the catalogue. Completed and cancelled orders are
              locked.
            </p>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Record a verified payment</h2>
            {order.paymentStatus === "PAID" ? (
              <Alert tone="success" className="mt-3">
                Payment already confirmed{order.paidAt ? ` on ${formatDateTime(order.paidAt)}` : ""}.
              </Alert>
            ) : (
              <>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Only use this after you have verified the money in the Uthman IY account or the
                  mobile money statement. This action is recorded against your account.
                </p>
                <div className="mt-4">
                  <AdminActionForm
                    action={confirmPaymentAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                    submitLabel="Mark as paid"
                  >
                    <input type="hidden" name="orderId" value={order.id} />
                    <Field label="Verified transaction reference" htmlFor="paymentReference" required>
                      <Input
                        id="paymentReference"
                        name="paymentReference"
                        defaultValue={order.paymentReference ?? ""}
                        required
                        maxLength={120}
                      />
                    </Field>
                    <Field label="Internal note (optional)" htmlFor="paymentNote">
                      <Input id="paymentNote" name="note" maxLength={500} />
                    </Field>
                  </AdminActionForm>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
