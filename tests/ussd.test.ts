import { describe, expect, it } from "vitest";
import {
  AIRTEL_MENU_CODE,
  MTN_MENU_CODE,
  buildMomoMerchantPrompt,
  buildMomoTransferPrompt,
  normaliseMsisdn,
  ussdHref,
} from "@/lib/payments/ussd";

describe("ussdHref", () => {
  it("encodes the terminating hash so the dialer receives the whole code", () => {
    expect(ussdHref("*182#")).toBe("tel:*182%23");
  });

  it("keeps the asterisks literal, because some dialers reject a fully encoded code", () => {
    expect(ussdHref("*182*1*1*0780551125*84000#")).toBe(
      "tel:*182*1*1*0780551125*84000%23",
    );
  });

  it("returns null for an empty code", () => {
    expect(ussdHref("")).toBeNull();
    expect(ussdHref("   ")).toBeNull();
  });
});

describe("normaliseMsisdn", () => {
  it("keeps a local Rwandan number as digits", () => {
    expect(normaliseMsisdn("0780551125")).toBe("0780551125");
  });

  it("strips spaces, dashes and the international prefix form", () => {
    expect(normaliseMsisdn("+250 780 551 125")).toBe("250780551125");
    expect(normaliseMsisdn("078-055-1125")).toBe("0780551125");
  });

  it("rejects numbers that are too short or too long", () => {
    expect(normaliseMsisdn("0780")).toBeNull();
    expect(normaliseMsisdn("1234567890123456")).toBeNull();
    expect(normaliseMsisdn("")).toBeNull();
  });
});

describe("buildMomoTransferPrompt", () => {
  it("pre-fills the MTN Rwanda send-money path with the receiving number and amount", () => {
    const prompt = buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: 84000 });
    expect(prompt).not.toBeNull();
    expect(prompt?.code).toBe("*182*1*1*0780551125*84000#");
    expect(prompt?.href).toBe("tel:*182*1*1*0780551125*84000%23");
    expect(prompt?.amountRwf).toBe(84000);
  });

  it("never includes a PIN", () => {
    const prompt = buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: 1000 });
    expect(prompt?.code).not.toContain("pin");
    expect(prompt?.code.startsWith("*182*1*1*")).toBe(true);
  });

  it("accepts an override so the menu path can change without a deploy", () => {
    const prompt = buildMomoTransferPrompt({
      msisdn: "0780551125",
      amountRwf: 5000,
      template: "*182*8*1*{msisdn}*{amount}#",
    });
    expect(prompt?.code).toBe("*182*8*1*0780551125*5000#");
  });

  it("refuses zero, negative and fractional amounts", () => {
    expect(buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: 0 })).toBeNull();
    expect(buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: -500 })).toBeNull();
    expect(buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: 12.5 })).toBeNull();
    expect(buildMomoTransferPrompt({ msisdn: "0780551125", amountRwf: Number.NaN })).toBeNull();
  });

  it("refuses an unusable receiving number", () => {
    expect(buildMomoTransferPrompt({ msisdn: "", amountRwf: 1000 })).toBeNull();
    expect(buildMomoTransferPrompt({ msisdn: "12", amountRwf: 1000 })).toBeNull();
  });

  it("falls back to the default template when the override is blank", () => {
    const prompt = buildMomoTransferPrompt({
      msisdn: "0780551125",
      amountRwf: 2000,
      template: "   ",
    });
    expect(prompt?.code).toBe("*182*1*1*0780551125*2000#");
  });
});

describe("buildMomoMerchantPrompt", () => {
  it("pre-fills the MoMoPay vendor path", () => {
    const prompt = buildMomoMerchantPrompt({ code: "123456", amountRwf: 7500 });
    expect(prompt?.code).toBe("*182*8*1*123456*7500#");
    expect(prompt?.href).toBe("tel:*182*8*1*123456*7500%23");
  });

  it("refuses a missing vendor code or a zero amount", () => {
    expect(buildMomoMerchantPrompt({ code: "", amountRwf: 7500 })).toBeNull();
    expect(buildMomoMerchantPrompt({ code: "123456", amountRwf: 0 })).toBeNull();
  });
});

describe("menu codes", () => {
  it("exposes the documented fallback menus", () => {
    expect(MTN_MENU_CODE).toBe("*182#");
    expect(AIRTEL_MENU_CODE).toBe("*500#");
  });
});
