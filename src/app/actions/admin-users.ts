"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireAdminForAction } from "@/lib/auth/authorization";
import { hashPassword, isValidPasswordPolicy } from "@/lib/auth/password";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import { userFormSchema } from "@/lib/validation/operations";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

export async function saveUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = userFormSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    role: formString(formData, "role"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const userId = formString(formData, "userId");

  try {
    if (userId) {
      if (parsed.data.password && !isValidPasswordPolicy(parsed.data.password)) {
        return actionError("Password does not meet the minimum policy.", {
          password: ["Use at least 10 characters including a letter and a number."],
        });
      }
      await db.user.update({
        where: { id: userId },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          ...(parsed.data.password
            ? { passwordHash: await hashPassword(parsed.data.password) }
            : {}),
        },
      });
      // Password changes invalidate existing sessions for that account.
      if (parsed.data.password) {
        await db.session.deleteMany({ where: { userId } });
      }
    } else {
      if (!parsed.data.password) {
        return actionError("Set a password for the new staff account.", {
          password: ["A password is required for a new account."],
        });
      }
      if (!isValidPasswordPolicy(parsed.data.password)) {
        return actionError("Password does not meet the minimum policy.", {
          password: ["Use at least 10 characters including a letter and a number."],
        });
      }
      await db.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          passwordHash: await hashPassword(parsed.data.password),
        },
      });
    }

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: userId ? "user.updated" : "user.created",
      entityType: "User",
      entityId: userId || null,
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath("/admin/users");
    return actionSuccess(userId ? "Staff account updated." : "Staff account created.");
  } catch (error) {
    return unexpectedError(error, "save-user");
  }
}

export async function toggleUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch {
    return sessionExpired;
  }

  const userId = formString(formData, "userId");
  const activate = formString(formData, "activate") === "true";
  if (!userId) return actionError("Missing account.");
  if (userId === actor.id && !activate) {
    return actionError("You cannot deactivate your own account.");
  }

  try {
    await db.user.update({ where: { id: userId }, data: { isActive: activate } });
    if (!activate) await db.session.deleteMany({ where: { userId } });
    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: activate ? "user.activated" : "user.deactivated",
      entityType: "User",
      entityId: userId,
    });
    revalidatePath("/admin/users");
    return actionSuccess(activate ? "Account activated." : "Account deactivated and signed out.");
  } catch (error) {
    return unexpectedError(error, "toggle-user");
  }
}
