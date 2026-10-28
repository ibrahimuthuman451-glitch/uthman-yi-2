/**
 * Imports the owner-approved catalogue prepared from the reference shop and
 * applies the matching store settings (stock on request, nationwide delivery,
 * mobile money payments).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/import-owner-catalogue.ts [flags]
 *
 * Flags:
 *   --apply-settings  also reset store/delivery/payment settings to the values
 *                     below (skipped by default so an administrator's later
 *                     settings changes are not reverted by a routine import)
 *   --update-prices   also overwrite approved selling prices that exist already
 *                     (skipped by default; prices belong to the administrator)
 *   --remove-demo     delete (or archive) the seeded demonstration listings
 *
 * Idempotent: products are matched by slug and updated, never duplicated.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { updateSiteSettings } from "@/lib/settings";
import { importCatalogue } from "@/server/services/catalogue-io";

const file = path.join(process.cwd(), "data/import/uthman-iy-catalogue-2026-10-26.json");
const payload = JSON.parse(readFileSync(file, "utf8")) as {
  products: { categorySlug: string }[];
};

const CATEGORY_NAMES: Record<string, string> = {
  "cctv-cameras": "CCTV Cameras",
  "cctv-kits": "CCTV Kits",
  "nvr-recorders": "NVR & Recorders",
  "power-accessories": "Power & Accessories",
  "alarm-systems": "Alarm Systems",
  "intercom-systems": "Intercom Systems",
  "starlink-kits-routers": "Starlink Kits & Routers",
  "starlink-accessories": "Starlink Accessories",
};

async function main() {
  // 1. Categories referenced by the import must exist before rows are applied.
  const needed = [...new Set(payload.products.map((product) => product.categorySlug))];
  let categoryCount = 0;
  for (const slug of needed) {
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) continue;
    await db.category.create({
      data: {
        slug,
        name: CATEGORY_NAMES[slug] ?? slug.replace(/-/g, " "),
        sortOrder: categoryCount + 10,
      },
    });
    categoryCount += 1;
  }
  console.log(`[cats] ${needed.length} categories required, ${categoryCount} created`);

  // 2. Store settings are only re-applied on request: a catalogue refresh must
  // not silently revert an administrator's later configuration changes.
  if (process.argv.includes("--apply-settings")) {
  await updateSiteSettings({
    store: {
      stockMode: "ON_REQUEST",
      showDemoProducts: false,
      maxQuantityPerItem: 20,
      catalogueNotice:
        "All prices are in Rwandan francs (RWF) and were last reviewed on 26 October 2026. Delivery is free across Rwanda.",
      orderNotice:
        "Your order is confirmed by phone before dispatch. Payment instructions are shown on your order page.",
      deliveryNotice:
        "Free delivery across Rwanda. No delivery fee is added at checkout, so the total shown is the final amount for your products.",
    },
    payments: {
      cashOnDelivery: { enabled: false },
      manualMobileMoney: {
        enabled: true,
        mtnNumber: "0780551125",
        instructions:
          "Send the products total by MTN MoMo to 0780551125, then submit the transaction reference from your SMS. Our team verifies the payment before dispatch.",
      },
      manualAirtelMoney: {
        enabled: true,
        number: "0727733580",
        verified: false,
        instructions:
          "Send the products total by Airtel Money to 0727 733 580, then submit the transaction reference from your SMS. Our team verifies the payment before dispatch.",
      },
      bankTransfer: { enabled: false },
      mtnMomoApi: { enabled: false },
    },
  });
  console.log("[settings] stock mode ON_REQUEST, MTN + Airtel manual payments enabled, COD disabled");
  } else {
    console.log("[settings] skipped (pass --apply-settings to re-apply store settings)");
  }

  // 3. Nationwide delivery: one placeholder-free area with the fee agreed by phone.
  const areas = await db.deliveryArea.findMany();
  const nationwide = areas.find((area) => area.name.startsWith("Rwanda"));
  if (nationwide) {
    await db.deliveryArea.update({
      where: { id: nationwide.id },
      data: { isActive: true, feeRwf: 0, sortOrder: 0 },
    });
  } else {
    await db.deliveryArea.create({
      data: {
        name: "Rwanda - nationwide (free delivery)",
        feeRwf: 0,
        isActive: true,
        sortOrder: 0,
        notes: "Free delivery across Rwanda. No delivery fee is charged at checkout.",
      },
    });
  }
  // Deactivate the old placeholder area so customers cannot pick it by mistake.
  await db.deliveryArea.updateMany({
    where: { name: { startsWith: "Kigali (fee pending" } },
    data: { isActive: false },
  });
  console.log("[delivery] nationwide area active");

  // 4. Import the approved catalogue (validated by the same service the admin UI uses).
  const summary = await importCatalogue(payload, {
    updatePrices: process.argv.includes("--update-prices"),
  });
  console.log(
    `[catalogue] created ${summary.created}, updated ${summary.updated}, ` +
      `prices preserved ${summary.pricesPreserved}, errors ${summary.errors.length}`,
  );
  for (const error of summary.errors.slice(0, 10)) {
    console.log(`  ! ${error.name}: ${error.message}`);
  }

  // 5. Optional cleanup of seeded demonstration listings.
  if (process.argv.includes("--remove-demo")) {
    const demos = await db.product.findMany({
      where: { dataStatus: "DEMO", sku: { startsWith: "DEMO-" } },
      select: { id: true, name: true },
    });
    const orderItems = await db.orderItem.count({
      where: { productId: { in: demos.map((demo) => demo.id) } },
    });
    if (orderItems > 0) {
      console.log(`[demo] ${demos.length} demo listings are referenced by orders - archiving instead of deleting`);
      await db.product.updateMany({
        where: { id: { in: demos.map((demo) => demo.id) } },
        data: { archivedAt: new Date(), isPublished: false },
      });
    } else {
      await db.product.deleteMany({ where: { id: { in: demos.map((demo) => demo.id) } } });
      console.log(`[demo] removed ${demos.length} demonstration listings`);
    }
  }

  const [products, published, approved] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { isPublished: true, archivedAt: null } }),
    db.product.count({ where: { dataStatus: "APPROVED", archivedAt: null } }),
  ]);
  console.log(`[done] products ${products} (published ${published}, approved ${approved})`);
}

main()
  .catch((error) => {
    console.error("[import] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
