/**
 * Sets (or increments) the stock level on every product.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/set-product-stock.ts [flags]
 *
 * Flags:
 *   --apply                     write the changes (without it this is a dry run)
 *   --qty <n>                   quantity to set, or to add with --add (default 5)
 *   --add                       add <n> to the current stock instead of setting it
 *   --low-stock-threshold <n>   also set the per-product low-stock threshold
 *   --stock-mode <mode>         also set the store stock mode (TRACKED|ON_REQUEST)
 *   --include-unpublished       include products that are not published
 *
 * Archived products are never touched. Every change is recorded in
 * StockMovement so the adjustment is auditable in the admin dashboard.
 *
 * Note: the shop only enforces stock when `store.stockMode` is TRACKED. With
 * ON_REQUEST every listing reads "Available to order" and quantity is confirmed
 * by phone, so changing stock alone does not change the storefront label.
 */
import { db } from "@/lib/db";
import { updateSiteSettings } from "@/lib/settings";

type Flags = {
  apply: boolean;
  qty: number;
  add: boolean;
  lowStockThreshold: number | null;
  stockMode: "TRACKED" | "ON_REQUEST" | null;
  includeUnpublished: boolean;
};

function parseFlags(argv: string[]): Flags {
  const valueOf = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index === -1) return undefined;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }
    return value;
  };

  const rawQty = valueOf("--qty") ?? "5";
  const qty = Number(rawQty);
  if (!Number.isInteger(qty) || qty < 0) {
    throw new Error(`--qty must be a non-negative integer, received "${rawQty}"`);
  }

  const rawThreshold = valueOf("--low-stock-threshold");
  let lowStockThreshold: number | null = null;
  if (rawThreshold !== undefined) {
    const parsed = Number(rawThreshold);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`--low-stock-threshold must be a non-negative integer, received "${rawThreshold}"`);
    }
    lowStockThreshold = parsed;
  }

  const rawMode = valueOf("--stock-mode");
  let stockMode: Flags["stockMode"] = null;
  if (rawMode !== undefined) {
    const normalised = rawMode.toUpperCase();
    if (normalised !== "TRACKED" && normalised !== "ON_REQUEST") {
      throw new Error(`--stock-mode must be TRACKED or ON_REQUEST, received "${rawMode}"`);
    }
    stockMode = normalised;
  }

  return {
    apply: argv.includes("--apply"),
    qty,
    add: argv.includes("--add"),
    lowStockThreshold,
    stockMode,
    includeUnpublished: argv.includes("--include-unpublished"),
  };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  const products = await db.product.findMany({
    where: {
      archivedAt: null,
      ...(flags.includeUnpublished ? {} : { isPublished: true }),
    },
    select: { id: true, slug: true, name: true, stock: true, lowStockThreshold: true },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) {
    console.log("[stock] no matching products found");
    return;
  }

  const planned = products
    .map((product) => {
      const nextStock = flags.add ? product.stock + flags.qty : flags.qty;
      const delta = nextStock - product.stock;
      const threshold = flags.lowStockThreshold ?? product.lowStockThreshold;
      const changed = delta !== 0 || threshold !== product.lowStockThreshold;
      return { product, nextStock, delta, threshold, changed };
    })
    .filter((row) => row.changed);

  console.log(
    `[stock] ${products.length} product(s) considered, ${planned.length} need a change ` +
      `(${flags.add ? `adding ${flags.qty}` : `setting to ${flags.qty}`})`,
  );

  for (const row of planned.slice(0, 10)) {
    console.log(
      `  ${row.product.slug}: ${row.product.stock} -> ${row.nextStock}` +
        (row.threshold !== row.product.lowStockThreshold
          ? ` (threshold ${row.product.lowStockThreshold} -> ${row.threshold})`
          : ""),
    );
  }
  if (planned.length > 10) console.log(`  ... and ${planned.length - 10} more`);

  if (!flags.apply) {
    console.log("[stock] dry run - re-run with --apply to write these changes");
    return;
  }

  let updated = 0;
  for (const row of planned) {
    await db.$transaction([
      db.product.update({
        where: { id: row.product.id },
        data: { stock: row.nextStock, lowStockThreshold: row.threshold },
      }),
      db.stockMovement.create({
        data: {
          productId: row.product.id,
          delta: row.delta,
          // A first count is an opening balance; later edits are adjustments.
          reason: row.product.stock === 0 ? "INITIAL_STOCK" : "MANUAL_ADJUSTMENT",
          note: flags.add
            ? `Bulk stock add of ${flags.qty}`
            : `Bulk stock set to ${row.nextStock}`,
        },
      }),
    ]);
    updated += 1;
  }
  console.log(`[stock] updated ${updated} product(s)`);

  if (flags.stockMode) {
    await updateSiteSettings({ store: { stockMode: flags.stockMode } });
    console.log(`[settings] stock mode set to ${flags.stockMode}`);
  }

  const [total, inStock, outOfStock] = await Promise.all([
    db.product.count({ where: { archivedAt: null } }),
    db.product.count({ where: { archivedAt: null, stock: { gt: 0 } } }),
    db.product.count({ where: { archivedAt: null, stock: { lte: 0 } } }),
  ]);
  console.log(`[done] products ${total} (in stock ${inStock}, out of stock ${outOfStock})`);
}

main()
  .catch((error) => {
    console.error("[stock] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
