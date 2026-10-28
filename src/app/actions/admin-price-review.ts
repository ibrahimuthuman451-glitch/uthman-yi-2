"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffForAction } from "@/lib/auth/authorization";
import { recordPriceReview } from "@/server/services/price-review";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

const reviewSchema = z.object({
  kind: z.enum(["INTERNAL_CHECK", "SUPPLIER_CONFIRMED"], {
    errorMap: () => ({ message: "Choose what was reviewed" }),
  }),
  note: z.string().trim().max(500).optional().default(""),
});

export async function recordPriceReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = reviewSchema.safeParse({
    kind: formString(formData, "kind"),
    note: formString(formData, "note"),
  });
  if (!parsed.success) {
    return actionError("Check the review details.", fieldErrorsFromZod(parsed.error));
  }

  try {
    const result = await recordPriceReview({
      kind: parsed.data.kind,
      note: parsed.data.note,
      actor: user,
    });

    revalidatePath("/admin/price-review");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "record-price-review");
  }
}
