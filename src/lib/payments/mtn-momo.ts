import "server-only";

import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * MTN MoMo Collections API client (Request to Pay).
 *
 * Reference: MTN MoMo Open API - Collections v1_0.
 *
 * IMPORTANT: this integration has NOT been exercised against a live MTN
 * account in this repository because no merchant credentials are available.
 * It stays disabled unless PAYMENTS_MTN_MOMO_ENABLED=true and every credential
 * is present; the checkout UI never offers it in that state.
 * See docs/PAYMENTS.md for the onboarding steps.
 */

const BASE_URLS = {
  sandbox: "https://sandbox.momodeveloper.mtn.com",
  mtnrwanda: "https://proxy.momoapi.mtn.com",
} as const;

type MomoConfig = {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  targetEnv: keyof typeof BASE_URLS;
  callbackUrl: string;
  currency: string;
};

export class PaymentProviderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PaymentProviderError";
    this.code = code;
  }
}

function readConfig(): MomoConfig | null {
  const env = getEnv();
  if (
    !env.PAYMENTS_MTN_MOMO_ENABLED ||
    !env.MTN_MOMO_SUBSCRIPTION_KEY ||
    !env.MTN_MOMO_API_USER ||
    !env.MTN_MOMO_API_KEY ||
    !env.MTN_MOMO_CALLBACK_URL
  ) {
    return null;
  }
  return {
    subscriptionKey: env.MTN_MOMO_SUBSCRIPTION_KEY,
    apiUser: env.MTN_MOMO_API_USER,
    apiKey: env.MTN_MOMO_API_KEY,
    targetEnv: env.MTN_MOMO_TARGET_ENV,
    callbackUrl: env.MTN_MOMO_CALLBACK_URL,
    currency: env.MTN_MOMO_CURRENCY,
  };
}

async function getAccessToken(config: MomoConfig): Promise<string> {
  const credentials = Buffer.from(
    `${config.apiUser}:${config.apiKey}`,
  ).toString("base64");

  const response = await fetch(`${BASE_URLS[config.targetEnv]}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PaymentProviderError(
      "MOMO_AUTH_FAILED",
      `MTN MoMo token request failed with HTTP ${response.status}`,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new PaymentProviderError(
      "MOMO_AUTH_FAILED",
      "MTN MoMo token response did not include an access token",
    );
  }
  return data.access_token;
}

export function isMomoEnabled(): boolean {
  return readConfig() !== null;
}

export type MomoRequestResult = {
  referenceId: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
};

/**
 * Creates a Request to Pay. `externalId` is the order number so a callback can
 * be correlated even if a database write fails mid-flight.
 */
export async function requestToPay(input: {
  amountRwf: number;
  payerMsisdn: string;
  externalId: string;
  payerMessage?: string;
  payeeNote?: string;
}): Promise<MomoRequestResult> {
  const config = readConfig();
  if (!config) {
    throw new PaymentProviderError(
      "MOMO_NOT_CONFIGURED",
      "MTN MoMo API credentials are not configured",
    );
  }

  const token = await getAccessToken(config);
  const referenceId = randomUUID();

  const response = await fetch(
    `${BASE_URLS[config.targetEnv]}/collection/v1_0/requesttopay`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": config.targetEnv,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "X-Callback-Url": config.callbackUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(Math.round(input.amountRwf)),
        currency: config.currency,
        externalId: input.externalId,
        payer: { partyIdType: "MSISDN", partyId: input.payerMsisdn },
        payerMessage: input.payerMessage ?? "Uthman IY order",
        payeeNote: input.payeeNote ?? "Thank you for your order",
      }),
      cache: "no-store",
    },
  );

  // 202 Accepted means the prompt was queued; the final status arrives by
  // callback or must be polled with getTransactionStatus.
  if (response.status !== 202) {
    const body = await response.text().catch(() => "");
    throw new PaymentProviderError(
      "MOMO_REQUEST_FAILED",
      `MTN MoMo request failed with HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  return { referenceId, status: "PENDING" };
}

export type MomoTransactionStatus = {
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  reason?: string;
  amount?: string;
  currency?: string;
  externalId?: string;
  financialTransactionId?: string;
};

/** Polls the authoritative status for a reference id. */
export async function getTransactionStatus(
  referenceId: string,
): Promise<MomoTransactionStatus> {
  const config = readConfig();
  if (!config) {
    throw new PaymentProviderError(
      "MOMO_NOT_CONFIGURED",
      "MTN MoMo API credentials are not configured",
    );
  }

  const token = await getAccessToken(config);
  const response = await fetch(
    `${BASE_URLS[config.targetEnv]}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": config.targetEnv,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new PaymentProviderError(
      "MOMO_STATUS_FAILED",
      `MTN MoMo status check failed with HTTP ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    status?: string;
    reason?: string;
    amount?: string;
    currency?: string;
    externalId?: string;
    financialTransactionId?: string;
  };

  const status =
    data.status === "SUCCESSFUL"
      ? "SUCCESSFUL"
      : data.status === "FAILED"
        ? "FAILED"
        : "PENDING";

  return {
    status,
    reason: data.reason,
    amount: data.amount,
    currency: data.currency,
    externalId: data.externalId,
    financialTransactionId: data.financialTransactionId,
  };
}
