"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requireStaffForAction } from "@/lib/auth/authorization";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import { inquiryUpdateSchema } from "@/lib/validation/operations";
import { updateInquiry } from "@/server/services/inquiries";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

export async function updateInquiryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const inquiryId = formString(formData, "inquiryId");
  if (!inquiryId) return actionError("Missing inquiry.");

  const parsed = inquiryUpdateSchema.safeParse({
    status: formString(formData, "status"),
    adminNotes: formString(formData, "adminNotes"),
  });
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  try {
    const result = await updateInquiry({
      id: inquiryId,
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
      actorId: user.id,
    });
    if (!result.ok) return actionError(result.message);

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "inquiry.updated",
      entityType: "Inquiry",
      entityId: inquiryId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/admin/inquiries");
    revalidatePath(`/admin/inquiries/${inquiryId}`);
    revalidatePath("/admin");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "update-inquiry");
  }
}
