"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clientKeyFromHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { contactFormSchema } from "@/lib/validation/forms";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import { createInquiry } from "@/server/services/inquiries";
import {
  actionError,
  actionSuccess,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

export async function submitInquiryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "inquiry"),
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return actionError(
      "You have sent several messages recently. Please wait a few minutes or call 0780551125.",
    );
  }

  const parsed = contactFormSchema.safeParse({
    type: formString(formData, "type"),
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    company: formString(formData, "company"),
    subject: formString(formData, "subject"),
    message: formString(formData, "message"),
    productSlug: formString(formData, "productSlug"),
    website: formString(formData, "website"),
    consent: formString(formData, "consent"),
  });

  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  try {
    const result = await createInquiry({
      type: parsed.data.type,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      subject: parsed.data.subject,
      message: parsed.data.message,
      productSlug: parsed.data.productSlug,
      sourcePath: "/contact",
    });

    revalidatePath("/admin/inquiries");

    return actionSuccess(
      result.emailed
        ? "Thank you. Your message was received and a confirmation was emailed to you."
        : `Thank you, ${parsed.data.name.split(" ")[0]}. Your message has been saved for the Uthman IY team, who will reply using the contact details you provided. Email delivery is not configured on this deployment, so no email was sent automatically.`,
    );
  } catch (error) {
    return unexpectedError(error, "inquiry");
  }
}
