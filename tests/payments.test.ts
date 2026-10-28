import { describe, expect, it } from "vitest";
import { buildPaymentOptions, getEnabledPaymentOptions, isMtnMomoConfigured, isPrepaidMethod } from "@/lib/payments/options";
import { defaultSettings } from "@/lib/settings-defaults";
import type { AppEnv } from "@/lib/env";

const envWithoutMomo: AppEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost/test",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  AUTH_SECRET: "x".repeat(40),
  PAYMENTS_MTN_MOMO_ENABLED: false,
  MTN_MOMO_SUBSCRIPTION_KEY: "",
  MTN_MOMO_API_USER: "",
  MTN_MOMO_API_KEY: "",
  MTN_MOMO_TARGET_ENV: "sandbox",
  MTN_MOMO_CALLBACK_URL: "",
  MTN_MOMO_CURRENCY: "RWF",
  SMTP_HOST: "",
};

const envWithMomo: AppEnv = {
  ...envWithoutMomo,
  PAYMENTS_MTN_MOMO_ENABLED: true,
  MTN_MOMO_SUBSCRIPTION_KEY: "key",
  MTN_MOMO_API_USER: "user",
  MTN_MOMO_API_KEY: "secret",
  MTN_MOMO_CALLBACK_URL: "https://example.com/api/payments/mtn/webhook",
};

describe("payment capability gating", () => {
  it("never offers an unconfigured payment provider", () => {
    expect(isMtnMomoConfigured(envWithoutMomo)).toBe(false);
    const options = getEnabledPaymentOptions(defaultSettings, envWithoutMomo);
    expect(options.map((option) => option.method)).not.toContain("MTN_MOMO_API");
  });

  it("keeps bank transfer and MTN API hidden until configured", () => {
    const options = buildPaymentOptions(defaultSettings, envWithoutMomo);
    const bank = options.find((option) => option.method === "BANK_TRANSFER");
    const momoApi = options.find((option) => option.method === "MTN_MOMO_API");
    expect(bank?.enabled).toBe(false);
    expect(bank?.unavailableReason).toMatch(/not been configured/i);
    expect(momoApi?.enabled).toBe(false);
    expect(momoApi?.unavailableReason).toMatch(/credentials/i);
  });

  it("offers MTN API only when credentials and the settings switch agree", () => {
    const settings = {
      ...defaultSettings,
      payments: { ...defaultSettings.payments, mtnMomoApi: { enabled: true } },
    };
    expect(isMtnMomoConfigured(envWithMomo)).toBe(true);
    const enabled = buildPaymentOptions(settings, envWithMomo).find(
      (option) => option.method === "MTN_MOMO_API",
    );
    expect(enabled?.enabled).toBe(true);

    const stillOff = buildPaymentOptions({ ...settings, payments: { ...settings.payments, mtnMomoApi: { enabled: false } } }, envWithMomo).find(
      (option) => option.method === "MTN_MOMO_API",
    );
    expect(stillOff?.enabled).toBe(false);
  });

  it("hides manual mobile money when no merchant number exists", () => {
    const settings = {
      ...defaultSettings,
      payments: {
        ...defaultSettings.payments,
        manualMobileMoney: { enabled: true, mtnNumber: "", instructions: "" },
      },
    };
    const option = buildPaymentOptions(settings, envWithoutMomo).find(
      (entry) => entry.method === "MANUAL_MOBILE_MONEY",
    );
    expect(option?.enabled).toBe(false);
  });

  it("reflects the owner's launch decision: mobile money on, cash on delivery off", () => {
    const options = buildPaymentOptions(defaultSettings, envWithoutMomo);
    expect(options.find((option) => option.method === "MANUAL_MOBILE_MONEY")?.enabled).toBe(true);
    expect(options.find((option) => option.method === "CASH_ON_DELIVERY")?.enabled).toBe(false);
  });

  it("exposes MTN and Airtel as two separate manual methods", () => {
    const options = buildPaymentOptions(defaultSettings, envWithoutMomo);
    const mtn = options.find((option) => option.method === "MANUAL_MOBILE_MONEY");
    const airtel = options.find((option) => option.method === "MANUAL_AIRTEL_MONEY");

    expect(mtn).toBeDefined();
    expect(airtel).toBeDefined();
    expect(mtn?.receivingNumber).toBe("0780551125");
    expect(airtel?.receivingNumber).toBe("0727733580");
    expect(mtn?.label).not.toBe(airtel?.label);
    expect(mtn?.enabled).toBe(true);
    expect(airtel?.enabled).toBe(true);
    // The supplied Airtel number has not been confirmed by the business yet.
    expect(airtel?.receivingAccountVerified).toBe(false);
  });

  it("hides Airtel Money when no receiving number is configured", () => {
    const settings = {
      ...defaultSettings,
      payments: {
        ...defaultSettings.payments,
        manualAirtelMoney: {
          ...defaultSettings.payments.manualAirtelMoney,
          number: "",
        },
      },
    };
    const airtel = buildPaymentOptions(settings, envWithoutMomo).find(
      (option) => option.method === "MANUAL_AIRTEL_MONEY",
    );
    expect(airtel?.enabled).toBe(false);
    expect(airtel?.unavailableReason).toMatch(/Airtel Money receiving number/i);
    // MTN stays available: the methods are independent.
    expect(
      buildPaymentOptions(settings, envWithoutMomo).find(
        (option) => option.method === "MANUAL_MOBILE_MONEY",
      )?.enabled,
    ).toBe(true);
  });

  it("treats prepaid methods differently from cash on delivery", () => {
    expect(isPrepaidMethod("CASH_ON_DELIVERY")).toBe(false);
    expect(isPrepaidMethod("MANUAL_MOBILE_MONEY")).toBe(true);
    expect(isPrepaidMethod("BANK_TRANSFER")).toBe(true);
  });
});
