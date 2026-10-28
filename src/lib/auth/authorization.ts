import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, type AdminUser } from "@/lib/auth/session";
import { assertAdmin, assertStaff, hasRole } from "@/lib/auth/guards";
import type { Role } from "@prisma/client";

export { hasRole };

/** Requires any authenticated staff member; redirects to the login page. */
export async function requireStaff(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Requires the ADMIN role; staff members are sent to the dashboard. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireStaff();
  if (!hasRole(user, "ADMIN")) redirect("/admin?error=forbidden");
  return user;
}

/**
 * For server actions: returns the user or throws an AuthorizationError.
 * Every administrative mutation calls one of these before touching data, so a
 * forged request cannot change settings, prices, orders or stock.
 */
export async function requireStaffForAction(): Promise<AdminUser> {
  return assertStaff(await getCurrentUser());
}

export async function requireAdminForAction(): Promise<AdminUser> {
  return assertAdmin(await getCurrentUser());
}

export function adminRoleLabel(role: Role): string {
  return role === "ADMIN" ? "Administrator" : "Staff";
}
