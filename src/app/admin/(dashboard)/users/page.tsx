import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { saveUserAction, toggleUserActiveAction } from "@/app/actions/admin-users";
import { AdminActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import { describePasswordPolicy } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/admin/login");
  if (!hasRole(current, "ADMIN")) redirect("/admin?error=forbidden");

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Staff accounts</h1>
        <p className="mt-1 text-sm text-muted">
          Administrators can manage accounts and settings. Staff can manage products, orders,
          inquiries and content.
        </p>
      </div>

      <Alert tone="warning" title="Account security">
        Every staff account is protected by a hashed password and database-backed session. Changing a
        password signs that account out everywhere. {describePasswordPolicy()}
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Staff member</th>
                <th scope="col">Role</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">State</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-medium text-navy-900">{user.name}</p>
                    <p className="break-anywhere text-xs text-navy-400">{user.email}</p>
                  </td>
                  <td>
                    <Badge tone={user.role === "ADMIN" ? "brand" : "neutral"}>{user.role}</Badge>
                  </td>
                  <td className="text-xs text-navy-500">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                  </td>
                  <td>
                    <Badge tone={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td>
                    {user.id === current.id ? (
                      <span className="text-xs text-navy-400">You</span>
                    ) : (
                      <AdminActionForm
                        action={toggleUserActiveAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                        submitLabel={user.isActive ? "Disable" : "Enable"}
                        variant={user.isActive ? "danger" : "outline"}
                        submitClassName="px-3 py-1.5 text-xs"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="activate" value={user.isActive ? "false" : "true"} />
                      </AdminActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Add a staff account</h2>
          <div className="mt-4">
            <AdminActionForm
              action={saveUserAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel="Create account"
              resetOnSuccess
            >
              <Field label="Full name" htmlFor="name" required>
                <Input id="name" name="name" required maxLength={120} />
              </Field>
              <Field label="Email address" htmlFor="email" required>
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field label="Role" htmlFor="role" required>
                <Select id="role" name="role" defaultValue="STAFF">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Administrator</option>
                </Select>
              </Field>
              <Field label="Initial password" htmlFor="password" required hint={describePasswordPolicy()}>
                <Input id="password" name="password" type="password" required autoComplete="new-password" />
              </Field>
            </AdminActionForm>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Update an account</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-navy-100 p-4">
              <AdminActionForm
                action={saveUserAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                submitLabel="Save account"
              >
                <input type="hidden" name="userId" value={user.id} />
                <Field label="Name" htmlFor={`name-${user.id}`} required>
                  <Input id={`name-${user.id}`} name="name" defaultValue={user.name} required />
                </Field>
                <Field label="Email" htmlFor={`email-${user.id}`} required>
                  <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} required />
                </Field>
                <Field label="Role" htmlFor={`role-${user.id}`} required>
                  <Select id={`role-${user.id}`} name="role" defaultValue={user.role}>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Administrator</option>
                  </Select>
                </Field>
                <Field label="New password (optional)" htmlFor={`password-${user.id}`} hint="Leave blank to keep the current password.">
                  <Input id={`password-${user.id}`} name="password" type="password" autoComplete="new-password" />
                </Field>
              </AdminActionForm>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
