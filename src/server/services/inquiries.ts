import "server-only";

import type { Inquiry, InquiryStatus, InquiryType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CreateInquiryInput = {
  type: InquiryType;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  productSlug?: string;
  sourcePath?: string;
};

/**
 * Stores an inquiry in the database.
 *
 * Email delivery is only claimed when SMTP has actually been configured;
 * otherwise the UI states that the message was saved for the Uthman IY team.
 */
export async function createInquiry(input: CreateInquiryInput): Promise<{
  inquiry: Inquiry;
  emailed: boolean;
}> {
  const inquiry = await db.inquiry.create({
    data: {
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      company: input.company || null,
      subject: input.subject || null,
      message: input.message,
      productSlug: input.productSlug || null,
      sourcePath: input.sourcePath || null,
    },
  });

  // No SMTP transport is bundled because no mail provider is configured, so the
  // application must not claim that an email was sent. The inquiry is stored and
  // appears in the admin dashboard immediately.
  return { inquiry, emailed: false };
}

export type InquiryQuery = {
  status?: InquiryStatus | "ALL";
  type?: InquiryType | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listInquiries(query: InquiryQuery) {
  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const search = query.search?.trim().slice(0, 80) ?? "";

  const where: Prisma.InquiryWhereInput = {
    ...(query.status && query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.type && query.type !== "ALL" ? { type: query.type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, inquiries] = await Promise.all([
    db.inquiry.count({ where }),
    db.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    inquiries,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getInquiry(id: string) {
  return db.inquiry.findUnique({ where: { id }, include: { handledBy: true } });
}

export async function updateInquiry(input: {
  id: string;
  status: InquiryStatus;
  adminNotes?: string;
  actorId: string;
}) {
  const inquiry = await db.inquiry.findUnique({ where: { id: input.id } });
  if (!inquiry) return { ok: false, message: "Inquiry not found." };

  await db.inquiry.update({
    where: { id: input.id },
    data: {
      status: input.status,
      adminNotes: input.adminNotes ?? inquiry.adminNotes,
      handledById: input.actorId,
      handledAt: input.status === "NEW" ? null : new Date(),
    },
  });

  return { ok: true, message: "Inquiry updated." };
}
