import "server-only";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

/**
 * Writes an audit record for an administrative action.
 * Failures are logged but never break the business operation, because the
 * operation itself has already been committed.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    let ip = input.ipAddress ?? null;
    if (!ip) {
      // headers() is only available inside a request scope. Scripts, tests and
      // queued jobs still need an audit trail, so a missing request context is
      // not allowed to drop the record.
      try {
        const headerStore = await headers();
        ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      } catch {
        ip = null;
      }
    }
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: ip,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
}
