import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createInquiry, updateInquiry } from "@/server/services/inquiries";

const createdIds: string[] = [];
let staffId = "";

async function ensureStaff() {
  if (staffId) return staffId;
  const staff = await db.user.create({
    data: {
      name: "Inquiry Test Staff",
      email: `inquiry-staff-${Date.now()}@test.local`,
      passwordHash: "unused",
      role: "STAFF",
    },
  });
  staffId = staff.id;
  return staffId;
}

afterAll(async () => {
  await db.inquiry.deleteMany({ where: { id: { in: createdIds } } });
  if (staffId) await db.user.deleteMany({ where: { id: staffId } });
  await db.$disconnect();
});

describe("inquiries", () => {
  it("stores an inquiry and does not claim an email was sent", async () => {
    const result = await createInquiry({
      type: "PRODUCT_ENQUIRY",
      name: "Inquiry Test",
      email: "inquiry@test.local",
      phone: "0780551125",
      company: "Test Co",
      subject: "Availability question",
      message: "Do you have this camera in stock? I need two units next week.",
      productSlug: "demo-dome-cctv-camera-4mp",
    });
    createdIds.push(result.inquiry.id);

    expect(result.emailed).toBe(false);
    expect(result.inquiry.status).toBe("NEW");
    expect(result.inquiry.subject).toBe("Availability question");
    expect(result.inquiry.productSlug).toBe("demo-dome-cctv-camera-4mp");
  });

  it("lets staff update status and notes with an audit-friendly handler", async () => {
    const created = await createInquiry({
      type: "SOFTWARE_DEVELOPMENT",
      name: "Quote Test",
      email: "quote@test.local",
      subject: "Quote request",
      message: "We need an e-commerce site with mobile money payments.",
    });
    createdIds.push(created.inquiry.id);

    const handlerId = await ensureStaff();
    const updated = await updateInquiry({
      id: created.inquiry.id,
      status: "IN_REVIEW",
      adminNotes: "Called the client; waiting for requirements.",
      actorId: handlerId,
    });
    expect(updated.ok).toBe(true);

    const refreshed = await db.inquiry.findUniqueOrThrow({ where: { id: created.inquiry.id } });
    expect(refreshed.status).toBe("IN_REVIEW");
    expect(refreshed.adminNotes).toContain("Called the client");
    expect(refreshed.handledById).toBe(handlerId);
    expect(refreshed.handledAt).not.toBeNull();
  });

  it("reports a missing inquiry instead of throwing", async () => {
    const result = await updateInquiry({
      id: "missing-inquiry-id",
      status: "CLOSED",
      actorId: await ensureStaff(),
    });
    expect(result.ok).toBe(false);
  });
});
