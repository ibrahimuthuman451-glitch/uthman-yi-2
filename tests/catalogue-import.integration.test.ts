import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { exportCatalogue, importCatalogue } from "@/server/services/catalogue-io";

/**
 * Import rules are a safety boundary: an import must never publish a listing or
 * invent a category, and a bad row must not roll back the good rows.
 */

const suffix = Date.now().toString(36);
let categorySlug = "";
const importedSkus = [`IMP-${suffix}-A`, `IMP-${suffix}-B`];

beforeAll(async () => {
  categorySlug = `import-category-${suffix}`;
  await db.category.create({
    data: { name: `Import category ${suffix}`, slug: categorySlug },
  });
});

afterAll(async () => {
  await db.stockMovement.deleteMany({ where: { product: { sku: { in: importedSkus } } } });
  await db.product.deleteMany({ where: { sku: { in: importedSkus } } });
  await db.category.deleteMany({ where: { slug: categorySlug } });
  await db.$disconnect();
});

describe("catalogue import", () => {
  it("imports valid rows as unpublished reference listings by default", async () => {
    const summary = await importCatalogue({
      products: [
        {
          name: `Imported item ${suffix}`,
          sku: importedSkus[0],
          categorySlug,
          priceRwf: 120000,
          stock: 4,
        },
      ],
    });

    expect(summary.errors).toEqual([]);
    expect(summary.created).toBe(1);

    const product = await db.product.findFirstOrThrow({ where: { sku: importedSkus[0] } });
    expect(product.dataStatus).toBe("REFERENCE");
    expect(product.isPublished).toBe(false);
    expect(product.priceRwf).toBe(120000);
  });

  it("rejects an unknown category and keeps processing other rows", async () => {
    const summary = await importCatalogue({
      products: [
        { name: `Bad category ${suffix}`, sku: `IMP-${suffix}-BAD`, categorySlug: "does-not-exist" },
        { name: `Good row ${suffix}`, sku: importedSkus[1], categorySlug, stock: 1 },
      ],
    });

    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].message).toMatch(/Unknown categorySlug/);
    expect(summary.created).toBe(1);
    expect(await db.product.count({ where: { sku: `IMP-${suffix}-BAD` } })).toBe(0);
  });

  it("updates an existing row when the SKU matches instead of duplicating it", async () => {
    const summary = await importCatalogue({
      products: [
        {
          name: `Imported item ${suffix} (updated)`,
          sku: importedSkus[0],
          categorySlug,
          priceRwf: 130000,
          stock: 6,
        },
      ],
    });

    expect(summary.updated).toBe(1);
    const rows = await db.product.findMany({ where: { sku: importedSkus[0] } });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toContain("updated");
  });

  it("rejects a structurally invalid payload without writing anything", async () => {
    const summary = await importCatalogue({ products: [{ name: "x" }] });
    expect(summary.created).toBe(0);
    expect(summary.errors[0].name).toBe("payload");
  });

  it("never overwrites an administrator's approved price unless re-pricing is requested", async () => {
    await db.product.updateMany({
      where: { sku: importedSkus[0] },
      data: { priceRwf: 999_999, isPublished: false, dataStatus: "APPROVED" },
    });

    const routine = await importCatalogue({
      products: [
        {
          name: `Imported item ${suffix}`,
          sku: importedSkus[0],
          categorySlug,
          priceRwf: 120_000,
          isPublished: true,
        },
      ],
    });

    expect(routine.errors).toEqual([]);
    expect(routine.pricesPreserved).toBe(1);

    const preserved = await db.product.findFirstOrThrow({ where: { sku: importedSkus[0] } });
    expect(preserved.priceRwf).toBe(999_999);
    // Publication decisions are the administrator's too.
    expect(preserved.isPublished).toBe(false);

    const forced = await importCatalogue(
      {
        products: [
          {
            name: `Imported item ${suffix}`,
            sku: importedSkus[0],
            categorySlug,
            priceRwf: 130_000,
          },
        ],
      },
      { updatePrices: true },
    );
    expect(forced.pricesPreserved).toBe(0);

    const rePriced = await db.product.findFirstOrThrow({ where: { sku: importedSkus[0] } });
    expect(rePriced.priceRwf).toBe(130_000);
  });

  it("exports the catalogue in the documented JSON shape", async () => {
    const exported = await exportCatalogue();
    expect(exported.currency).toBe("RWF");
    expect(Array.isArray(exported.products)).toBe(true);
    const row = exported.products.find((product) => product.sku === importedSkus[0]);
    expect(row).toBeTruthy();
    expect(row).toHaveProperty("dataStatus");
    expect(row).toHaveProperty("specifications");
    expect(row).toHaveProperty("lowStockThreshold");
  });
});
