"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser, pruneExpiredSessions } from "@/lib/auth/session";
import { consumeRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validation/operations";
import { fieldErrorsFromZod } from "@/lib/validation/catalog";
import {
  actionError,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

/** Cost factor used only to equalise timing when the email does not exist. */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.2w5nqWlq3Jk8V3O0WJ1Y6h8Qy7bW1jS";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "login"),
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return actionError(
      `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    );
  }

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    const passwordOk = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordOk || !user.isActive) {
      await recordAudit({
        action: "auth.login_failed",
        entityType: "User",
        entityId: user?.id ?? null,
        actorEmail: parsed.data.email,
        metadata: { reason: !user ? "unknown_email" : !passwordOk ? "bad_password" : "inactive" },
      });
      return actionError("Invalid email or password.");
    }

    await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await pruneExpiredSessions();
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
    });
  } catch (error) {
    return unexpectedError(error, "login");
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
    });
  }
  redirect("/admin/login");
}

