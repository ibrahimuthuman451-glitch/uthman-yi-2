/**
 * Points products at the committed WebP files in public/products/.
 *
 * Use this when the image files already exist (for example after running
 * scripts/map-drive-photos.ts locally) and you only need to update another
 * database - typically Supabase production - without re-downloading sources.
 *
 *   DATABASE_URL=<production> tsx --tsconfig tsconfig.scripts.json scripts/apply-photo-urls.ts
 */
import { readdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const files = (await readdir("public/products")).filter((file) => file.endsWith(".webp"));
  const slugs = new Set(files.map((file) => file.replace(/\.webp$/, "")));

  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    select: { id: true, slug: true, name: true, imageUrl: true },
  });

  let updated = 0;
  const missing: string[] = [];

  for (const product of products) {
    if (!slugs.has(product.slug)) {
      missing.push(product.name);
      continue;
    }
    const imageUrl = `/products/${product.slug}.webp`;
    if (product.imageUrl === imageUrl) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl, imageAlt: product.name },
    });
    updated += 1;
  }

  console.log(`Products: ${products.length} | image files: ${files.length} | updated: ${updated}`);
  if (missing.length > 0) {
    console.log("\nStill without a committed photo:");
    for (const name of missing) console.log(`  - ${name}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed:", error.message.split("\n")[0]);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
