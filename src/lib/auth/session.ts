import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { isProduction } from "@/lib/env";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "uy_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a database-backed session. Only a SHA-256 hash of the random token is
 * stored, so a database leak cannot be replayed as a live session.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerStore = await headers();

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headerStore.get("user-agent")?.slice(0, 250) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in staff member for the current request.
 * Cached per request so multiple server components do not repeat the query.
 */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now() || !session.user.isActive) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
});

/** Removes expired sessions; called opportunistically after login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
