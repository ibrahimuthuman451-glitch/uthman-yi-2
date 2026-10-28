/**
 * Deterministic photo mapping.
 *
 * The catalogue was imported from the reference shop, whose public API lists an
 * image file name per product. The owner's Drive folder uses those same file
 * names, so a product can be mapped to its exact photo instead of guessing from
 * marketing words. This is the preferred path; the fuzzy matcher is only a
 * fallback for files that carry no usable name.
 *
 * Usage:
 *   tsx --tsconfig tsconfig.scripts.json scripts/map-drive-photos.ts [--apply] [--dir photos-in]
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const sourceDir = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "photos-in";
const outputDir = "public/products";
const manifestPath = "data/product-photos/manifest.json";
const API_URL = "https://fabritech-web-backend.vercel.app/api/products";

const prisma = new PrismaClient();

type ApiProduct = { id: string; title: string; image: string; priceNew: number };

type LocalProduct = { id: string; slug: string; name: string; priceRwf: number | null; imageUrl: string | null };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function imageStem(url: string): string {
  const base = url.split("/").pop() ?? "";
  return base.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

/** Strips the Drive prefixes and duplicate markers so stems compare cleanly. */
function fileStem(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^(imgi?|image|photo|photos|pics?)[-_ ]?\d+[-_ ]+/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .toLowerCase();
}

function similarity(a: string, b: string): number {
  const at = new Set(normalize(a).split(" ").filter(Boolean));
  const bt = new Set(normalize(b).split(" ").filter(Boolean));
  if (at.size === 0 || bt.size === 0) return 0;
  let shared = 0;
  for (const token of at) if (bt.has(token)) shared += 1;
  return shared / Math.max(at.size, bt.size);
}

async function main() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`Reference API returned HTTP ${response.status}`);
  const api = (await response.json()) as ApiProduct[];

  const products = (await prisma.product.findMany({
    where: { archivedAt: null },
    select: { id: true, slug: true, name: true, priceRwf: true, imageUrl: true },
    orderBy: { name: "asc" },
  })) as LocalProduct[];

  let files: string[] = [];
  try {
    files = (await readdir(sourceDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    throw new Error(`Source folder ${sourceDir} not found. Run the Drive download first.`);
  }

  console.log(`API products: ${api.length} | downloaded photos: ${files.length} | catalogue products: ${products.length}\n`);

  const byStem = new Map<string, string[]>();
  for (const file of files) {
    const stem = fileStem(file);
    byStem.set(stem, [...(byStem.get(stem) ?? []), file]);
  }

  const manifest = { generatedAt: new Date().toISOString(), sourceDir, strategy: "exact-image-name", entries: [] as Record<string, unknown>[], missing: [] as { slug: string; name: string; reason: string }[] };
  const claimed = new Map<string, string>();
  let applied = 0;

  for (const product of products) {
    // 1. Find the reference record for this product (exact title, else close + same price).
    let record = api.find((item) => normalize(item.title) === normalize(product.name));
    if (!record) {
      record = api.find(
        (item) =>
          similarity(item.title, product.name) >= 0.85 &&
          (product.priceRwf === null || item.priceNew === product.priceRwf),
      );
    }
    if (!record) {
      manifest.missing.push({ slug: product.slug, name: product.name, reason: "no matching reference record" });
      console.log(`NO REFERENCE  ${product.name}`);
      continue;
    }

    // 2. Locate the downloaded file for that reference image.
    const stem = imageStem(record.image);
    const candidates = byStem.get(stem) ?? [];
    if (candidates.length === 0) {
      manifest.missing.push({ slug: product.slug, name: product.name, reason: "photo not present in the shared folder" });
      console.log(`NO PHOTO      ${product.name}`);
      continue;
    }

    // Prefer the un-suffixed copy ("name.jpg" over "name (2).jpg").
    const chosen = [...candidates].sort((a, b) => {
      const aScore = / \(\d+\)/.test(a) ? 1 : 0;
      const bScore = / \(\d+\)/.test(b) ? 1 : 0;
      return aScore - bScore || a.length - b.length;
    })[0];

    if (claimed.has(chosen)) {
      const owner = products.find((item) => item.slug === claimed.get(chosen));
      const sameProduct = owner && normalize(owner.name) === normalize(product.name);
      if (!sameProduct) {
        manifest.missing.push({
          slug: product.slug,
          name: product.name,
          reason: `photo already used by ${claimed.get(chosen)}`,
        });
        console.log(`CONFLICT      ${product.name} -> ${chosen} already used`);
        continue;
      }
      // The reference catalogue contains the same model twice (different price).
      // Sharing the photo is correct; the duplicate listing is reported instead.
      console.log(`DUPLICATE ROW ${product.name} shares ${chosen} with ${claimed.get(chosen)}`);
    } else {
      claimed.set(chosen, product.slug);
    }

    if (product.imageUrl && !args.includes("--force")) {
      console.log(`SKIP (has)    ${product.name}`);
      continue;
    }

    console.log(`MAP           ${product.name}\n            <- ${chosen}`);

    if (!apply) {
      manifest.entries.push({ file: chosen, slug: product.slug, applied: false });
      continue;
    }

    await mkdir(outputDir, { recursive: true });
    const target = path.join(outputDir, `${product.slug}.webp`);
    const original = await readFile(path.join(sourceDir, chosen));
    const optimised = await sharp(original)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(target, optimised.data);

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: `/products/${product.slug}.webp`, imageAlt: product.name },
    });

    manifest.entries.push({
      file: chosen,
      slug: product.slug,
      applied: true,
      output: `/products/${product.slug}.webp`,
      width: optimised.info.width,
      height: optimised.info.height,
      bytes: optimised.data.length,
    });
    applied += 1;
  }

  if (apply) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log(
    `\n${apply ? "Applied" : "Mapped"}: ${manifest.entries.length} | missing: ${manifest.missing.length} | ` +
      `${applied} file(s) written`,
  );
  if (manifest.missing.length > 0) {
    console.log("\nProducts still without a photo:");
    for (const item of manifest.missing) console.log(`  - ${item.name} (${item.reason})`);
  }
  if (!apply) console.log("\nDry run only. Re-run with --apply to write images and update products.");
}

main()
  .catch((error) => {
    console.error("\nMapping failed:", error.message.split("\n")[0]);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
