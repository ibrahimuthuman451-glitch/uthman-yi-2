import { getSiteSettings } from "@/lib/settings";
import { getEnv, isEmailConfigured } from "@/lib/env";
import { buildPaymentOptions } from "@/lib/payments/options";
import { listAllDeliveryAreas } from "@/server/services/admin-catalog";
import { saveSettingsAction } from "@/app/actions/admin-content";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDeliveryAreaLines } from "@/lib/validation/settings-lines";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, areas] = await Promise.all([getSiteSettings(), listAllDeliveryAreas()]);
  const env = getEnv();
  const paymentOptions = buildPaymentOptions(settings, env);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Business settings</h1>
        <p className="mt-1 text-sm text-muted">
          Contact details, delivery areas, payment instructions and homepage wording. Nothing is
          invented: leave a field blank if the information has not been confirmed.
        </p>
      </div>

      <div className="max-w-4xl">
        <AdminActionForm
          action={saveSettingsAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
          submitLabel="Save settings"
        >
          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Company and contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Company name" htmlFor="companyName" required>
                <Input id="companyName" name="companyName" defaultValue={settings.company.name} required maxLength={80} />
              </Field>
              <Field label="Primary phone" htmlFor="phone" required hint="Rwandan mobile number.">
                <Input id="phone" name="phone" defaultValue={settings.company.phone} required />
              </Field>
              <Field label="Secondary phone (optional)" htmlFor="secondaryPhone">
                <Input id="secondaryPhone" name="secondaryPhone" defaultValue={settings.company.secondaryPhone} />
              </Field>
              <Field label="WhatsApp number (optional)" htmlFor="whatsappPhone">
                <Input id="whatsappPhone" name="whatsappPhone" defaultValue={settings.company.whatsappPhone} />
              </Field>
              <Field
                label="Email address (optional)"
                htmlFor="email"
                hint="Leave blank until a real business email exists; a blank value is hidden from the site."
                className="sm:col-span-2"
              >
                <Input id="email" name="email" type="email" defaultValue={settings.company.email} />
              </Field>
              <Field label="Address line" htmlFor="addressLine" hint="Only what is confirmed (e.g. Gisozi).">
                <Input id="addressLine" name="addressLine" defaultValue={settings.company.addressLine} />
              </Field>
              <Field label="City" htmlFor="city">
                <Input id="city" name="city" defaultValue={settings.company.city} />
              </Field>
              <Field label="Country" htmlFor="country">
                <Input id="country" name="country" defaultValue={settings.company.country} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Shop and delivery</h2>
            <div className="mt-4 grid gap-4">
              <Field
                label="Delivery areas"
                htmlFor="deliveryAreas"
                hint="One area per line: Name | Fee in RWF | active or inactive | optional note. Areas removed from this list are deactivated, never deleted."
              >
                <Textarea
                  id="deliveryAreas"
                  name="deliveryAreas"
                  rows={5}
                  defaultValue={formatDeliveryAreaLines(areas)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Maximum quantity per item" htmlFor="maxQuantityPerItem" required hint="Applies to online orders for a single product.">
                  <Input id="maxQuantityPerItem" name="maxQuantityPerItem" type="number" min={1} max={100} defaultValue={settings.store.maxQuantityPerItem} required />
                </Field>
                <Field label="Free delivery over (RWF, optional)" htmlFor="freeDeliveryThreshold" hint="Leave blank to always charge the area fee.">
                  <Input id="freeDeliveryThreshold" name="freeDeliveryThreshold" type="number" min={0} defaultValue={settings.store.freeDeliveryThreshold ?? ""} />
                </Field>
              </div>
              <Field label="Catalogue notice" htmlFor="catalogueNotice" hint="Shown on the shop page under the heading.">
                <Textarea id="catalogueNotice" name="catalogueNotice" rows={2} defaultValue={settings.store.catalogueNotice} maxLength={400} />
              </Field>
              <Field label="Order notice" htmlFor="orderNotice" hint="Shown in the cart summary.">
                <Textarea id="orderNotice" name="orderNotice" rows={2} defaultValue={settings.store.orderNotice} maxLength={400} />
              </Field>
              <Field
                label="Delivery notice"
                htmlFor="deliveryNotice"
                hint="Shown at checkout and on the order page. Use it to explain how the delivery fee is agreed."
              >
                <Textarea id="deliveryNotice" name="deliveryNotice" rows={2} defaultValue={settings.store.deliveryNotice} maxLength={400} />
              </Field>
              <Field
                label="Stock handling"
                htmlFor="stockMode"
                hint="TRACKED refuses orders above the stock figure. ON_REQUEST accepts orders and confirms availability by phone - use it while no reliable inventory count exists."
              >
                <Select id="stockMode" name="stockMode" defaultValue={settings.store.stockMode}>
                  <option value="ON_REQUEST">Accept orders and confirm availability by phone</option>
                  <option value="TRACKED">Enforce the stock figure entered per product</option>
                </Select>
              </Field>
              <Checkbox
                id="showDemoProducts"
                name="showDemoProducts"
                defaultChecked={settings.store.showDemoProducts}
                label="Show demonstration listings in the shop (clearly labelled sample data)"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Payments</h2>
            <Alert tone="info" className="mt-3">
              Only enabled and configured methods appear at checkout. Orders remain pending until a
              payment is verified. No card payments are implemented.
            </Alert>
            <div className="mt-4 space-y-5">
              <div className="rounded-xl border border-navy-100 p-4">
                <Checkbox id="cashOnDeliveryEnabled" name="cashOnDeliveryEnabled" defaultChecked={settings.payments.cashOnDelivery.enabled} label="Enable cash on delivery" />
                <Field label="Cash on delivery instructions" htmlFor="cashOnDeliveryInstructions" className="mt-3">
                  <Textarea id="cashOnDeliveryInstructions" name="cashOnDeliveryInstructions" rows={2} defaultValue={settings.payments.cashOnDelivery.instructions} maxLength={600} />
                </Field>
              </div>
              <div className="rounded-xl border border-navy-100 p-4">
                <Checkbox id="manualMomoEnabled" name="manualMomoEnabled" defaultChecked={settings.payments.manualMobileMoney.enabled} label="Enable MTN MoMo (manual verification)" />
                <Field label="MTN MoMo receiving number" htmlFor="manualMtnNumber" className="mt-3">
                  <Input id="manualMtnNumber" name="manualMtnNumber" defaultValue={settings.payments.manualMobileMoney.mtnNumber} />
                </Field>
                <Field label="MTN MoMo instructions" htmlFor="manualMomoInstructions" className="mt-3">
                  <Textarea id="manualMomoInstructions" name="manualMomoInstructions" rows={2} defaultValue={settings.payments.manualMobileMoney.instructions} maxLength={600} />
                </Field>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Customers pay the number above and submit the SMS reference. Orders stay pending until a staff member verifies the money.
                </p>
              </div>

              <div className="rounded-xl border border-navy-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Checkbox id="airtelMoneyEnabled" name="airtelMoneyEnabled" defaultChecked={settings.payments.manualAirtelMoney.enabled} label="Enable Airtel Money (manual verification)" />
                  <Badge tone={settings.payments.manualAirtelMoney.verified ? "success" : "warning"}>
                    {settings.payments.manualAirtelMoney.verified ? "Receiving account confirmed" : "Receiving account not verified"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Airtel Money receiving number" htmlFor="airtelMoneyNumber" hint="Rwandan mobile number, e.g. 0727 733 580">
                    <Input id="airtelMoneyNumber" name="airtelMoneyNumber" defaultValue={settings.payments.manualAirtelMoney.number} />
                  </Field>
                  <div className="flex items-end pb-2">
                    <Checkbox
                      id="airtelMoneyVerified"
                      name="airtelMoneyVerified"
                      defaultChecked={settings.payments.manualAirtelMoney.verified}
                      label="I have confirmed this is a valid Uthman IY receiving account"
                    />
                  </div>
                </div>
                <Field label="Airtel Money instructions" htmlFor="airtelMoneyInstructions" className="mt-3">
                  <Textarea id="airtelMoneyInstructions" name="airtelMoneyInstructions" rows={2} defaultValue={settings.payments.manualAirtelMoney.instructions} maxLength={600} />
                </Field>
                <p className="mt-2 text-xs leading-5 text-muted">
                  This is a manual method, not an Airtel API integration. The receiving account was supplied by the owner and must be confirmed before the business relies on it for payments. Selecting Airtel Money, entering a reference or sending a screenshot never marks an order paid; only staff verification does.
                </p>
              </div>
              <div className="rounded-xl border border-navy-100 p-4">
                <Checkbox id="bankTransferEnabled" name="bankTransferEnabled" defaultChecked={settings.payments.bankTransfer.enabled} label="Enable bank transfer" />
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Bank name" htmlFor="bankName">
                    <Input id="bankName" name="bankName" defaultValue={settings.payments.bankTransfer.bankName} />
                  </Field>
                  <Field label="Account name" htmlFor="bankAccountName">
                    <Input id="bankAccountName" name="bankAccountName" defaultValue={settings.payments.bankTransfer.accountName} />
                  </Field>
                  <Field label="Account number" htmlFor="bankAccountNumber">
                    <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={settings.payments.bankTransfer.accountNumber} />
                  </Field>
                </div>
                <Field label="Bank transfer instructions" htmlFor="bankInstructions" className="mt-3">
                  <Textarea id="bankInstructions" name="bankInstructions" rows={2} defaultValue={settings.payments.bankTransfer.instructions} maxLength={600} />
                </Field>
              </div>
              <div className="rounded-xl border border-navy-100 p-4">
                <Checkbox id="mtnMomoApiEnabled" name="mtnMomoApiEnabled" defaultChecked={settings.payments.mtnMomoApi.enabled} label="Offer MTN MoMo online payment request (requires API credentials)" />
                <p className="mt-2 text-xs leading-5 text-muted">
                  {paymentOptions.find((option) => option.method === "MTN_MOMO_API")?.enabled
                    ? "MTN MoMo API is configured and this option is live at checkout."
                    : (paymentOptions.find((option) => option.method === "MTN_MOMO_API")?.unavailableReason ?? "")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-navy-100 bg-white p-5">
            <h2 className="text-base font-semibold text-navy-900">Homepage wording</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" htmlFor="heroEyebrow">
                <Input id="heroEyebrow" name="heroEyebrow" defaultValue={settings.content.heroEyebrow} maxLength={120} />
              </Field>
              <Field label="Announcement bar (optional)" htmlFor="announcement" hint="Leave blank to hide the bar.">
                <Input id="announcement" name="announcement" defaultValue={settings.content.announcement} maxLength={200} />
              </Field>
              <Field label="Headline" htmlFor="heroHeadline">
                <Input id="heroHeadline" name="heroHeadline" defaultValue={settings.content.heroHeadline} maxLength={120} />
              </Field>
              <Field label="Highlighted headline" htmlFor="heroHighlight">
                <Input id="heroHighlight" name="heroHighlight" defaultValue={settings.content.heroHighlight} maxLength={120} />
              </Field>
              <Field label="Sub-headline" htmlFor="heroSubheadline" className="sm:col-span-2">
                <Textarea id="heroSubheadline" name="heroSubheadline" rows={3} defaultValue={settings.content.heroSubheadline} maxLength={400} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted">Inquiry emails: {" "}
              {isEmailConfigured() ? "SMTP configured" : "not configured (messages are stored only)"}.
            </p>
          </section>
        </AdminActionForm>
      </div>
    </div>
  );
}
