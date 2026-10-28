import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientKeyFromHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { handleMomoCallback } from "@/server/services/payments";

/**
 * MTN MoMo payment notification endpoint.
 *
 * The request body is only a hint: the handler re-queries MTN for the
 * authoritative status and compares the amount before marking an order paid.
 * PaymentEvent uniqueness makes repeated notifications idempotent.
 */
export async function POST(request: Request) {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "momo-callback"),
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleMomoCallback(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[momo-webhook] unhandled error", error);
    return NextResponse.json(
      { ok: false, message: "Notification could not be processed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Callbacks are POST-only; a GET tells integrators the endpoint exists.
  return NextResponse.json(
    { ok: false, message: "Use POST to deliver MTN MoMo notifications." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
