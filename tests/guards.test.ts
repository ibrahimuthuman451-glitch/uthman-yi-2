import { describe, expect, it } from "vitest";
import { AuthorizationError, assertAdmin, assertStaff, hasRole } from "@/lib/auth/guards";

const staff = { id: "u1", name: "Staff", email: "staff@test.local", role: "STAFF" as const };
const admin = { id: "u2", name: "Admin", email: "admin@test.local", role: "ADMIN" as const };

describe("administrative authorization guards", () => {
  it("rejects an anonymous request before any mutation can run", () => {
    expect(() => assertStaff(null)).toThrowError(AuthorizationError);
    try {
      assertStaff(null);
    } catch (error) {
      expect((error as AuthorizationError).code).toBe("UNAUTHENTICATED");
    }
  });

  it("allows staff to manage business settings", () => {
    expect(assertStaff(staff).id).toBe("u1");
    expect(assertStaff(admin).id).toBe("u2");
  });

  it("limits administrator-only operations to ADMIN", () => {
    expect(assertAdmin(admin).role).toBe("ADMIN");
    expect(hasRole(admin, "ADMIN")).toBe(true);
    expect(hasRole(staff, "ADMIN")).toBe(false);
    try {
      assertAdmin(staff);
      throw new Error("expected failure");
    } catch (error) {
      expect((error as AuthorizationError).code).toBe("FORBIDDEN");
    }
  });

  it("never promotes an account by role string comparison", () => {
    expect(hasRole({ role: "STAFF" }, "STAFF")).toBe(true);
    expect(hasRole({ role: "ADMIN" }, "STAFF")).toBe(true);
    expect(hasRole({ role: "STAFF" }, "ADMIN")).toBe(false);
  });
});
