import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv, isProduction } from "@/lib/env";

/**
 * Short-lived, signed access to a single guest order page.
 *
 * The token contains only the order number; it is set after a successful
 * checkout or after a visitor proves knowledge of the order number AND the
 * email/phone used on the order. It keeps order pages reachable without
 * exposing an email address in the URL.
 */
export const ORDER_ACCESS_COOKIE = "uy_order_access";
const TTL_SECONDS = 60 * 60 * 2; // 2 hours

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function createOrderAccessToken(orderNumber: string): Promise<string> {
  return new SignJWT({ orderNumber })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const token = await createOrderAccessToken(orderNumber);
  const cookieStore = await cookies();
  cookieStore.set(ORDER_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function hasOrderAccess(orderNumber: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORDER_ACCESS_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.orderNumber === orderNumber;
  } catch {
    return false;
  }
}
