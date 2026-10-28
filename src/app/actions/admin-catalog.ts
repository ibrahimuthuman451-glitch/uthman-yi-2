"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { requireAdminForAction, requireStaffForAction } from "@/lib/auth/authorization";
import { categoryFormSchema, fieldErrorsFromZod, formString, productFormSchema } from "@/lib/validation/catalog";
import { parseSpecifications } from "@/lib/validation/content";
import {
  adjustStock,
  createCategory,
  createProduct,
  setProductArchived,
  updateCategory,
  updateProduct,
} from "@/server/services/admin-catalog";
import { importCatalogue } from "@/server/services/catalogue-io";
import { convertReferenceItemToDraft, importReferenceCatalogue } from "@/server/services/reference-catalogue";
import {
  actionError,
  actionSuccess,
  sessionExpired,
  unexpectedError,
  type ActionState,
} from "@/server/actions/helpers";

function readProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    sku: formString(formData, "sku"),
    categoryId: formString(formData, "categoryId"),
    shortDescription: formString(formData, "shortDescription"),
    description: formString(formData, "description"),
    price: formString(formData, "price"),
    compareAtPrice: formString(formData, "compareAtPrice"),
    stock: formString(formData, "stock"),
    lowStockThreshold: formString(formData, "lowStockThreshold"),
    dataStatus: formString(formData, "dataStatus"),
    isPublished: formString(formData, "isPublished") === "on" ? "on" : undefined,
    featured: formString(formData, "featured") === "on" ? "on" : undefined,
    imageUrl: formString(formData, "imageUrl"),
    imageAlt: formString(formData, "imageAlt"),
  });
}

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const productId = formString(formData, "productId");
  const specifications = parseSpecifications(formString(formData, "specifications"));
  const payload = {
    ...parsed.data,
    isPublished: parsed.data.isPublished === "on",
    featured: parsed.data.featured === "on",
    specifications,
  };

  try {
    if (productId) {
      await updateProduct(productId, payload, user.id);
      await recordAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "product.updated",
        entityType: "Product",
        entityId: productId,
        metadata: { name: payload.name, price: payload.price, dataStatus: payload.dataStatus },
      });
    } else {
      const product = await createProduct(payload, user.id);
      await recordAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "product.created",
        entityType: "Product",
        entityId: product.id,
        metadata: { name: product.name, dataStatus: product.dataStatus },
      });
      revalidatePath("/admin/products");
      revalidatePath("/shop");
      redirect(`/admin/products/${product.id}?saved=1`);
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    revalidatePath(`/shop/${productId}`);
    return actionSuccess("Product saved.");
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return actionError("That product no longer exists.");
    }
    return unexpectedError(error, "save-product");
  }
}

export async function archiveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const productId = formString(formData, "productId");
  const archive = formString(formData, "archive") === "true";
  if (!productId) return actionError("Missing product.");

  try {
    await setProductArchived(productId, archive);
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: archive ? "product.archived" : "product.restored",
      entityType: "Product",
      entityId: productId,
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return actionSuccess(archive ? "Product archived and unpublished." : "Product restored as a draft.");
  } catch (error) {
    return unexpectedError(error, "archive-product");
  }
}

export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const productId = formString(formData, "productId");
  const delta = Number(formString(formData, "delta"));
  const note = formString(formData, "note");
  if (!productId) return actionError("Missing product.");
  if (!Number.isInteger(delta) || delta === 0) {
    return actionError("Enter a non-zero whole number of units (use a negative number to remove stock).");
  }

  try {
    const result = await adjustStock({
      productId,
      delta,
      reason: "MANUAL_ADJUSTMENT",
      note,
      actorId: user.id,
    });
    if (!result.ok) return actionError(result.message);
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "product.stock_adjusted",
      entityType: "Product",
      entityId: productId,
      metadata: { delta, note },
    });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    return actionSuccess(result.message);
  } catch (error) {
    return unexpectedError(error, "adjust-stock");
  }
}

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const parsed = categoryFormSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    description: formString(formData, "description"),
    sortOrder: formString(formData, "sortOrder"),
    isActive: formString(formData, "isActive") === "on" ? "on" : undefined,
  });
  if (!parsed.success) {
    return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const categoryId = formString(formData, "categoryId");
  try {
    if (categoryId) {
      await updateCategory(categoryId, { ...parsed.data, isActive: parsed.data.isActive === "on" });
    } else {
      await createCategory({ ...parsed.data, isActive: parsed.data.isActive === "on" });
    }
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: categoryId ? "category.updated" : "category.created",
      entityType: "Category",
      entityId: categoryId || null,
      metadata: { name: parsed.data.name },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return actionSuccess(categoryId ? "Category updated." : "Category created.");
  } catch (error) {
    return unexpectedError(error, "save-category");
  }
}

export async function importCatalogueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireAdminForAction();
  } catch {
    return sessionExpired;
  }

  const raw = formString(formData, "payload");
  if (!raw.trim()) return actionError("Paste the catalogue JSON payload first.");

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return actionError("That is not valid JSON. Check the format in the documentation and try again.");
  }

  // Re-pricing is an explicit, separate decision: by default an import keeps
  // every approved selling price that already exists.
  const updatePrices = formString(formData, "updatePrices") === "on";

  try {
    const summary = await importCatalogue(payload, { updatePrices });
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "catalogue.imported",
      entityType: "Product",
      metadata: {
        created: summary.created,
        updated: summary.updated,
        pricesPreserved: summary.pricesPreserved,
        updatePrices,
        errors: summary.errors.length,
      },
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");

    const errorDetail = summary.errors
      .slice(0, 5)
      .map((error) => `${error.name}: ${error.message}`)
      .join(" | ");

    if (summary.errors.length > 0) {
      return actionError(
        `Imported ${summary.created} new and ${summary.updated} updated listings, but ${summary.errors.length} row(s) failed. ${errorDetail}`,
      );
    }
    return actionSuccess(`Imported ${summary.created} new and ${summary.updated} updated listings.`);
  } catch (error) {
    return unexpectedError(error, "import-catalogue");
  }
}

export async function importReferenceCatalogueAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireAdminForAction();
  } catch {
    return sessionExpired;
  }

  try {
    const result = await importReferenceCatalogue();
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "reference.imported",
      entityType: "ReferenceCatalogItem",
      metadata: result,
    });
    revalidatePath("/admin/reference-catalogue");
    return actionSuccess(
      `Reference research import finished: ${result.imported} new row(s), ${result.skipped} already present.`,
    );
  } catch (error) {
    return unexpectedError(error, "import-reference");
  }
}

export async function convertReferenceItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireStaffForAction();
  } catch {
    return sessionExpired;
  }

  const id = formString(formData, "referenceId");
  if (!id) return actionError("Missing reference item.");

  try {
    const result = await convertReferenceItemToDraft(id, user.id);
    if (!result.ok) return actionError(result.message);
    revalidatePath("/admin/reference-catalogue");
    revalidatePath("/admin/products");
    return actionSuccess(result.message, { productId: result.productId });
  } catch (error) {
    return unexpectedError(error, "convert-reference");
  }
}
