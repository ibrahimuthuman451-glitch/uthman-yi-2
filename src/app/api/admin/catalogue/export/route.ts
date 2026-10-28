import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { exportCatalogue, exportCatalogueCsv } from "@/server/services/catalogue-io";

/** Authenticated catalogue export (JSON or CSV). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "catalogue.exported",
    entityType: "Product",
    metadata: { format },
  });

  if (format === "csv") {
    const csv = await exportCatalogueCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="uthman-iy-catalogue-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = await exportCatalogue();
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="uthman-iy-catalogue-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
