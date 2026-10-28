"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireStaffForAction } from "@/lib/auth/authorization";
import { fieldErrorsFromZod, formString } from "@/lib/validation/catalog";
import {
  parseFeatureRows,
  parseLineList,
  serviceFormSchema,
  softwareProductFormSchema,
} from "@/lib/validation/content";
import { settingsFormSchema } from "@/lib/validation/operations";
import { parseDeliveryAreaLines } from "@/lib/validation/settings-lines";
import { updateSiteSettings } from "@/lib/settings";
import { slugify } from "@/lib/utils";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

async function uniqueServiceSlug(desired: string, excludeId?: string) {
  const base = slugify(desired) || "service";
  let candidate = base;
  let counter = 1;
  while (counter < 30) {
    const existing = await db.service.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueSoftwareSlug(desired: string, excludeId?: string) {
  const base = slugify(desired) || "product";
  let candidate = base;
  let counter = 1;
  while (counter < 30) {
    const existing = await db.softwareProduct.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = serviceFormSchema.safeParse({
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    summary: formString(formData, "summary"),
    description: formString(formData, "description"),
    benefits: formString(formData, "benefits"),
    deliverables: formString(formData, "deliverables"),
    isPublished: formString(formData, "isPublished") === "on" ? "on" : undefined,
    sortOrder: formString(formData, "sortOrder"),
  });
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const serviceId = formString(formData, "serviceId");

  try {
    const data = {
      title: parsed.data.title,
      slug: await uniqueServiceSlug(parsed.data.slug || parsed.data.title, serviceId || undefined),
      summary: parsed.data.summary,
      description: parsed.data.description,
      benefits: parseLineList(parsed.data.benefits),
      deliverables: parseLineList(parsed.data.deliverables),
      isPublished: parsed.data.isPublished === "on",
      sortOrder: parsed.data.sortOrder ?? 0,
    };

    if (serviceId) {
      await db.service.update({ where: { id: serviceId }, data });
    } else {
      await db.service.create({ data });
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: serviceId ? "service.updated" : "service.created",
      entityType: "Service",
      entityId: serviceId || null,
      metadata: { title: data.title },
    });

    revalidatePath("/admin/services");
    revalidatePath("/software-development");
    revalidatePath(`/software-development/${data.slug}`);
    return actionSuccess(serviceId ? "Service updated." : "Service created.");
  } catch (error) {
    return unexpectedError(error, "save-service");
  }
}

export async function saveSoftwareProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = softwareProductFormSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    tagline: formString(formData, "tagline"),
    summary: formString(formData, "summary"),
    description: formString(formData, "description"),
    status: formString(formData, "status"),
    statusNote: formString(formData, "statusNote"),
    audience: formString(formData, "audience"),
    features: formString(formData, "features"),
    demoUrl: formString(formData, "demoUrl"),
    ctaLabel: formString(formData, "ctaLabel"),
    isPublished: formString(formData, "isPublished") === "on" ? "on" : undefined,
    sortOrder: formString(formData, "sortOrder"),
    accentColor: formString(formData, "accentColor"),
  });
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const productId = formString(formData, "productId");

  try {
    const data = {
      name: parsed.data.name,
      slug: await uniqueSoftwareSlug(parsed.data.slug || parsed.data.name, productId || undefined),
      tagline: parsed.data.tagline,
      summary: parsed.data.summary,
      description: parsed.data.description,
      status: parsed.data.status,
      statusNote: parsed.data.statusNote,
      audience: parseLineList(parsed.data.audience),
      features: parseFeatureRows(parsed.data.features),
      demoUrl: parsed.data.demoUrl || null,
      ctaLabel: parsed.data.ctaLabel || "Request early access",
      isPublished: parsed.data.isPublished === "on",
      sortOrder: parsed.data.sortOrder ?? 0,
      accentColor: parsed.data.accentColor,
    };

    if (productId) {
      await db.softwareProduct.update({ where: { id: productId }, data });
    } else {
      await db.softwareProduct.create({ data });
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: productId ? "software.updated" : "software.created",
      entityType: "SoftwareProduct",
      entityId: productId || null,
      metadata: { name: data.name, status: data.status },
    });

    revalidatePath("/admin/software");
    revalidatePath("/software");
    revalidatePath(`/software/${data.slug}`);
    return actionSuccess(productId ? "Software product updated." : "Software product created.");
  } catch (error) {
    return unexpectedError(error, "save-software");
  }
}

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const bool = (key: string) => formString(formData, key) === "on";
  const thresholdRaw = formString(formData, "freeDeliveryThreshold").replace(/[,\s]/g, "");

  const parsed = settingsFormSchema.safeParse({
    companyName: formString(formData, "companyName"),
    phone: formString(formData, "phone"),
    secondaryPhone: formString(formData, "secondaryPhone"),
    email: formString(formData, "email"),
    whatsappPhone: formString(formData, "whatsappPhone"),
    addressLine: formString(formData, "addressLine"),
    city: formString(formData, "city"),
    country: formString(formData, "country"),
    catalogueNotice: formString(formData, "catalogueNotice"),
    orderNotice: formString(formData, "orderNotice"),
    deliveryNotice: formString(formData, "deliveryNotice"),
    stockMode: formString(formData, "stockMode"),
    showDemoProducts: bool("showDemoProducts"),
    maxQuantityPerItem: formString(formData, "maxQuantityPerItem"),
    freeDeliveryThreshold: thresholdRaw === "" ? null : thresholdRaw,
    cashOnDeliveryEnabled: bool("cashOnDeliveryEnabled"),
    cashOnDeliveryInstructions: formString(formData, "cashOnDeliveryInstructions"),
    manualMomoEnabled: bool("manualMomoEnabled"),
    manualMtnNumber: formString(formData, "manualMtnNumber"),
    manualMomoInstructions: formString(formData, "manualMomoInstructions"),
    airtelMoneyEnabled: bool("airtelMoneyEnabled"),
    airtelMoneyNumber: formString(formData, "airtelMoneyNumber"),
    airtelMoneyVerified: bool("airtelMoneyVerified"),
    airtelMoneyInstructions: formString(formData, "airtelMoneyInstructions"),
    bankTransferEnabled: bool("bankTransferEnabled"),
    bankName: formString(formData, "bankName"),
    bankAccountName: formString(formData, "bankAccountName"),
    bankAccountNumber: formString(formData, "bankAccountNumber"),
    bankInstructions: formString(formData, "bankInstructions"),
    mtnMomoApiEnabled: bool("mtnMomoApiEnabled"),
    heroEyebrow: formString(formData, "heroEyebrow"),
    heroHeadline: formString(formData, "heroHeadline"),
    heroHighlight: formString(formData, "heroHighlight"),
    heroSubheadline: formString(formData, "heroSubheadline"),
    announcement: formString(formData, "announcement"),
    deliveryAreas: formString(formData, "deliveryAreas"),
  });

  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const areaLines = parseDeliveryAreaLines(parsed.data.deliveryAreas);
  if (areaLines.errors.length > 0) {
    return actionError(`Delivery areas: ${areaLines.errors.join(" ")}`, {
      deliveryAreas: areaLines.errors,
    });
  }

  try {
    await updateSiteSettings(
      {
        company: {
          name: parsed.data.companyName,
          phone: parsed.data.phone,
          secondaryPhone: parsed.data.secondaryPhone,
          email: parsed.data.email,
          whatsappPhone: parsed.data.whatsappPhone,
          addressLine: parsed.data.addressLine,
          city: parsed.data.city,
          country: parsed.data.country,
        },
        store: {
          catalogueNotice: parsed.data.catalogueNotice,
          orderNotice: parsed.data.orderNotice,
          deliveryNotice: parsed.data.deliveryNotice,
          stockMode: parsed.data.stockMode,
          showDemoProducts: parsed.data.showDemoProducts,
          maxQuantityPerItem: parsed.data.maxQuantityPerItem,
          freeDeliveryThreshold: parsed.data.freeDeliveryThreshold,
        },
        payments: {
          cashOnDelivery: {
            enabled: parsed.data.cashOnDeliveryEnabled,
            instructions: parsed.data.cashOnDeliveryInstructions,
          },
          manualMobileMoney: {
            enabled: parsed.data.manualMomoEnabled,
            mtnNumber: parsed.data.manualMtnNumber,
            instructions: parsed.data.manualMomoInstructions,
          },
          manualAirtelMoney: {
            enabled: parsed.data.airtelMoneyEnabled,
            number: parsed.data.airtelMoneyNumber,
            verified: parsed.data.airtelMoneyVerified,
            instructions: parsed.data.airtelMoneyInstructions,
          },
          bankTransfer: {
            enabled: parsed.data.bankTransferEnabled,
            bankName: parsed.data.bankName,
            accountName: parsed.data.bankAccountName,
            accountNumber: parsed.data.bankAccountNumber,
            instructions: parsed.data.bankInstructions,
          },
          mtnMomoApi: { enabled: parsed.data.mtnMomoApiEnabled },
        },
        content: {
          heroEyebrow: parsed.data.heroEyebrow,
          heroHeadline: parsed.data.heroHeadline,
          heroHighlight: parsed.data.heroHighlight,
          heroSubheadline: parsed.data.heroSubheadline,
          announcement: parsed.data.announcement,
        },
      },
      user.id,
    );

    // Synchronise delivery areas without deleting historical rows: areas that
    // disappear from the list are deactivated so old orders keep their records.
    const existing = await db.deliveryArea.findMany();
    const byName = new Map(existing.map((area) => [area.name.toLowerCase(), area]));

    for (const [index, area] of areaLines.areas.entries()) {
      const match = byName.get(area.name.toLowerCase());
      if (match) {
        await db.deliveryArea.update({
          where: { id: match.id },
          data: {
            name: area.name,
            feeRwf: area.feeRwf,
            isActive: area.isActive,
            notes: area.notes || match.notes,
            sortOrder: index,
          },
        });
      } else {
        await db.deliveryArea.create({
          data: {
            name: area.name,
            feeRwf: area.feeRwf,
            isActive: area.isActive,
            notes: area.notes || null,
            sortOrder: index,
          },
        });
      }
    }

    for (const area of existing) {
      if (!areaLines.areas.some((line) => line.name.toLowerCase() === area.name.toLowerCase())) {
        await db.deliveryArea.update({ where: { id: area.id }, data: { isActive: false } });
      }
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "settings.updated",
      entityType: "SiteSetting",
      entityId: "site",
      metadata: { deliveryAreas: areaLines.areas.length },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return actionSuccess("Business settings saved.");
  } catch (error) {
    return unexpectedError(error, "save-settings");
  }
}
