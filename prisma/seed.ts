/**
 * Database seed.
 *
 * Idempotent: safe to run repeatedly. It never deletes business data.
 * Run:  npm run db:seed          (development, demo listings allowed)
 *       npm run db:seed:prod     (production, demo listings refused)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categories, demoProducts, services, softwareProducts } from "./seed-data";
import { defaultSettings, SETTINGS_KEY } from "../src/lib/settings-defaults";

const db = new PrismaClient();
const productionRun =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";

function log(message: string) {
  console.log(`[seed] ${message}`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Uthman IY Administrator";

  if (!email || !password) {
    if (productionRun) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding a production database.",
      );
    }
    log("ADMIN_EMAIL/ADMIN_PASSWORD not set - skipping administrator creation.");
    return;
  }

  if (productionRun && /ChangeMe/i.test(password)) {
    throw new Error(
      "Refusing to seed production with the example ADMIN_PASSWORD. Set a strong unique password.",
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    log(`Administrator ${email} already exists - password left unchanged.`);
    return;
  }

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 12),
      role: "ADMIN",
    },
  });
  log(`Created administrator ${email}. Change the password after first login.`);
}

async function seedSettings() {
  const existing = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (existing) {
    log("Site settings already present - left unchanged.");
    return;
  }
  await db.siteSetting.create({
    data: {
      key: SETTINGS_KEY,
      value: {
        ...defaultSettings,
        store: { ...defaultSettings.store, showDemoProducts: !productionRun },
      },
    },
  });
  log("Created default site settings.");
}

async function seedDeliveryAreas() {
  const count = await db.deliveryArea.count();
  if (count > 0) {
    log("Delivery areas already configured - left unchanged.");
    return;
  }

  // Delivery is free across Rwanda.
  await db.deliveryArea.create({
    data: {
      name: "Rwanda - nationwide (free delivery)",
      feeRwf: 0,
      isActive: true,
      sortOrder: 0,
      notes: "Free delivery across Rwanda. No delivery fee is charged at checkout.",
    },
  });
  log("Created the nationwide free-delivery area.");
}

async function seedCategories() {
  let created = 0;
  for (const category of categories) {
    const existing = await db.category.findUnique({ where: { slug: category.slug } });
    if (existing) continue;
    await db.category.create({ data: { ...category } });
    created += 1;
  }
  log(`Categories: ${created} created, ${categories.length - created} already present.`);
}

async function seedReferenceCatalogue() {
  const file = join(process.cwd(), "data/reference/fabritech-catalogue-2026-10-25.json");
  const payload = JSON.parse(readFileSync(file, "utf8")) as {
    items: {
      externalId: string;
      title: string;
      category: string;
      categorySlug: string;
      referencePriceRwf: number | null;
      currency: string;
      source: string;
      sourceUrl: string;
      retrievedAt: string;
    }[];
  };

  let created = 0;
  for (const item of payload.items) {
    const existing = await db.referenceCatalogItem.findUnique({
      where: { externalId: item.externalId },
    });
    if (existing) continue;
    await db.referenceCatalogItem.create({
      data: {
        externalId: item.externalId,
        title: item.title,
        category: item.category,
        categorySlug: item.categorySlug,
        referencePriceRwf: item.referencePriceRwf,
        currency: item.currency,
        source: item.source,
        sourceUrl: item.sourceUrl,
        retrievedAt: new Date(item.retrievedAt),
        notes:
          "Reference only: third-party listing captured for category and price research. Not an Uthman IY product, price or stock position.",
      },
    });
    created += 1;
  }
  log(`Reference catalogue: ${created} research rows created.`);
}

async function seedDemoProducts() {
  // Demonstration listings are opt-in in every environment: the shop should
  // only show owner-approved products once they exist.
  const allowDemo = process.env.SEED_DEMO_PRODUCTS === "true";

  if (!allowDemo) {
    log("Demo products disabled - no demonstration listings seeded.");
    return;
  }

  let created = 0;
  for (const product of demoProducts) {
    const existing = await db.product.findUnique({ where: { slug: product.slug } });
    if (existing) continue;
    const category = await db.category.findUnique({
      where: { slug: product.categorySlug },
    });
    await db.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        categoryId: category?.id ?? null,
        shortDescription: product.shortDescription,
        description: product.description,
        specifications: product.specifications.map((spec) => ({ ...spec })),
        priceRwf: product.priceRwf,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        dataStatus: "DEMO",
        isPublished: true,
        featured: product.featured,
      },
    });
    created += 1;
  }
  log(
    `Demo products: ${created} created. These are clearly labelled demonstration listings, not real inventory.`,
  );
}

async function seedServices() {
  let created = 0;
  for (const service of services) {
    const existing = await db.service.findUnique({ where: { slug: service.slug } });
    if (existing) continue;
    await db.service.create({
      data: {
        slug: service.slug,
        title: service.title,
        summary: service.summary,
        description: service.description,
        benefits: [...service.benefits],
        deliverables: [...service.deliverables],
        icon: service.icon,
        sortOrder: service.sortOrder,
        isPublished: true,
      },
    });
    created += 1;
  }
  log(`Services: ${created} created, ${services.length - created} already present.`);
}

async function seedSoftwareProducts() {
  let created = 0;
  for (const product of softwareProducts) {
    const existing = await db.softwareProduct.findUnique({ where: { slug: product.slug } });
    if (existing) continue;
    await db.softwareProduct.create({
      data: {
        slug: product.slug,
        name: product.name,
        tagline: product.tagline,
        summary: product.summary,
        description: product.description,
        status: product.status,
        statusNote: product.statusNote,
        audience: [...product.audience],
        features: product.features.map((feature) => ({ ...feature })),
        ctaLabel: product.ctaLabel,
        sortOrder: product.sortOrder,
        accentColor: product.accentColor,
        isPublished: true,
      },
    });
    created += 1;
  }
  log(`Software products: ${created} created.`);
}

async function main() {
  log(`Running seed (${productionRun ? "production" : "development"} mode)`);
  await seedAdmin();
  await seedSettings();
  await seedDeliveryAreas();
  await seedCategories();
  await seedReferenceCatalogue();
  await seedDemoProducts();
  await seedServices();
  await seedSoftwareProducts();
  log("Done.");
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
