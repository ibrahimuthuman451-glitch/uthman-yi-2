import type { Role } from "@prisma/client";

export class AuthorizationError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";

  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export type GuardUser = { id: string; email: string; name: string; role: Role };

const roleRank: Record<Role, number> = { STAFF: 1, ADMIN: 2 };

export function hasRole(user: Pick<GuardUser, "role">, required: Role): boolean {
  return roleRank[user.role] >= roleRank[required];
}

/**
 * Pure authorization guards used by every administrative server action.
 * Keeping them free of request-context imports makes the rule testable and
 * ensures a forged request is rejected before any database write happens.
 */
export function assertStaff(user: GuardUser | null): GuardUser {
  if (!user) {
    throw new AuthorizationError("UNAUTHENTICATED", "Sign in to continue.");
  }
  return user;
}

export function assertAdmin(user: GuardUser | null): GuardUser {
  const staff = assertStaff(user);
  if (staff.role !== "ADMIN") {
    throw new AuthorizationError("FORBIDDEN", "Administrator access is required.");
  }
  return staff;
}
