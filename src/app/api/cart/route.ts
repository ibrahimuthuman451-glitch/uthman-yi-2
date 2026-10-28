import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { clientKeyFromHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/settings";
import { getProductsByIds } from "@/server/services/catalog";
import { getProductAvailability } from "@/lib/catalog/availability";

/**
 * Server-side cart validation.
 *
 * Returns the authoritative price, stock and availability for the ids in the
 * browser cart. Prices shown in the cart and at checkout come from here, never
 * from localStorage.
 */
const bodySchema = z.object({
  ids: z.array(z.string().min(1).max(60)).max(50),
});

export async function POST(request: Request) {
  const headerStore = await headers();
  const limit = await consumeRateLimit({
    key: clientKeyFromHeaders(headerStore, "cart-validate"),
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  const settings = await getSiteSettings();
  const products = await getProductsByIds(parsed.data.ids);

  const items = products.map((product) => {
    const availability = getProductAvailability(
      {
        dataStatus: product.dataStatus,
        isPublished: product.isPublished,
        archivedAt: product.archivedAt,
        priceRwf: product.priceRwf,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
      },
      settings.store.stockMode,
    );

    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceRwf: product.priceRwf,
      imageUrl: product.imageUrl,
      stock: product.stock,
      purchasable: availability.purchasable,
      availabilityLabel: availability.label,
      availabilityReason: availability.reason,
      isDemo: availability.isDemo,
    };
  });

  return NextResponse.json({
    items,
    maxQuantityPerItem: settings.store.maxQuantityPerItem,
    stockMode: settings.store.stockMode,
    deliveryNotice: settings.store.deliveryNotice,
    freeDeliveryThreshold: settings.store.freeDeliveryThreshold,
    orderNotice: settings.store.orderNotice,
  });
}
