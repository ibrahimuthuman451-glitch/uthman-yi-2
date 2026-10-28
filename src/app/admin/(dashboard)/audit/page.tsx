import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!hasRole(user, "ADMIN")) redirect("/admin?error=forbidden");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Audit log</h1>
        <p className="mt-1 text-sm text-muted">
          The most recent 150 privileged actions, including sign-in attempts, price and stock
          changes, order status updates, payment confirmations and content edits.
        </p>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Entity</th>
              <th scope="col">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-navy-500">No audit entries yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(log.createdAt)}</td>
                  <td className="text-xs">
                    {log.actor?.name ?? log.actorEmail ?? "system"}
                    {log.actorEmail && log.actor?.name ? (
                      <span className="block break-anywhere text-navy-400">{log.actorEmail}</span>
                    ) : null}
                  </td>
                  <td className="text-xs font-medium text-navy-800">{log.action}</td>
                  <td className="text-xs">
                    {log.entityType}
                    {log.entityId ? <span className="block break-anywhere text-navy-400">{log.entityId}</span> : null}
                  </td>
                  <td className="max-w-xs break-anywhere text-xs text-navy-500">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
