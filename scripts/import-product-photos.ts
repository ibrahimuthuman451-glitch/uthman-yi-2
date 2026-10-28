/**
 * Matches owner-supplied photos to catalogue products, optimises them and (with
 * --apply) attaches them to the product records.
 *
 * Usage:
 *   node scripts/import-product-photos.mjs                 # dry run: report matches only
 *   node scripts/import-product-photos.mjs --apply         # write WebP files + update products
 *   node scripts/import-product-photos.mjs --force         # also replace existing images
 *   node scripts/import-product-photos.mjs --dir photos-in # source directory
 *
 * Rules:
 *  - an existing product image is never replaced unless --force is passed;
 *  - ambiguous or unmatched files are reported, never guessed;
 *  - images are re-encoded to WebP (max 1200px) with metadata stripped;
 *  - a manifest records which file produced which product image.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { matchPhotoToProduct } from "@/lib/catalogue/photo-match";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");
const sourceDir = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "photos-in";
const outputDir = "public/products";
const manifestPath = "data/product-photos/manifest.json";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

const prisma = new PrismaClient();

async function loadProducts() {
  return prisma.product.findMany({
    where: { archivedAt: null },
    select: { id: true, slug: true, name: true, imageUrl: true },
    orderBy: { name: "asc" },
  });
}

async function listSourceFiles() {
  try {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

type ManifestEntry = {
  file: string;
  slug: string;
  score: number;
  applied: boolean;
  output?: string;
  width?: number;
  height?: number;
  bytes?: number;
  sourceSha256?: string;
};

type RejectedFile = {
  file: string;
  reason: string;
  slug?: string;
  candidates: { slug: string; name: string; score: number }[];
};

async function optimise(
  inputPath: string,
  outputPath: string,
): Promise<{ width: number; height: number; bytes: number }> {
  const info = await sharp(inputPath)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(outputPath, info.data);
  return { width: info.info.width, height: info.info.height, bytes: info.data.length };
}

async function main() {
  const products = await loadProducts();
  const files = await listSourceFiles();

  if (files.length === 0) {
    console.log(`No images found in ${sourceDir}/.`);
    console.log("Download them first: node scripts/drive-folder.mjs <folderId>");
    return;
  }

  console.log(`Source: ${sourceDir} (${files.length} image(s)) | Products: ${products.length}\n`);

  const manifest: {
    generatedAt: string;
    sourceDir: string;
    entries: ManifestEntry[];
    unmatched: RejectedFile[];
    ambiguous: RejectedFile[];
    skipped: RejectedFile[];
  } = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    entries: [],
    unmatched: [],
    ambiguous: [],
    skipped: [],
  };
  const usedProducts = new Map();
  let applied = 0;

  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    const result = matchPhotoToProduct(file, products);

    if (result.status !== "matched" || !result.best) {
      const bucket = result.status === "ambiguous" ? manifest.ambiguous : manifest.unmatched;
      bucket.push({ file, reason: result.reason, candidates: result.alternatives });
      console.log(`${result.status.toUpperCase().padEnd(9)} ${file}`);
      for (const candidate of result.alternatives.slice(0, 2)) {
        console.log(`            candidate: ${candidate.name} (${candidate.score})`);
      }
      continue;
    }

    const best = result.best;
    const product = products.find((item) => item.slug === best.slug);
    if (!product) continue;

    if (usedProducts.has(product.slug)) {
      manifest.ambiguous.push({
        file,
        reason: `Product already matched by ${usedProducts.get(product.slug)}`,
        candidates: [],
      });
      console.log(`DUPLICATE ${file} -> ${product.name} (already matched)`);
      continue;
    }
    usedProducts.set(product.slug, file);

    if (product.imageUrl && !force) {
      manifest.skipped.push({
        file,
        slug: product.slug,
        reason: "product already has an image",
        candidates: [],
      });
      console.log(`SKIPPED   ${file} -> ${product.name} (already has an image; use --force)`);
      continue;
    }

    console.log(`${apply ? "ATTACH  " : "MATCH   "} ${file}\n            -> ${product.name} (score ${result.best.score})`);

    if (!apply) {
      manifest.entries.push({ file, slug: product.slug, score: best.score, applied: false });
      continue;
    }

    await mkdir(outputDir, { recursive: true });
    const target = path.join(outputDir, `${product.slug}.webp`);
    const original = await readFile(fullPath);
    const optimised = await optimise(fullPath, target);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: `/products/${product.slug}.webp`,
        imageAlt: product.name,
      },
    });

    manifest.entries.push({
      file,
      slug: product.slug,
      score: best.score,
      applied: true,
      output: `/products/${product.slug}.webp`,
      width: optimised.width,
      height: optimised.height,
      bytes: optimised.bytes,
      sourceSha256: createHash("sha256").update(original).digest("hex"),
    });
    applied += 1;
  }

  if (apply) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log(
    `\n${apply ? "Applied" : "Matched"}: ${manifest.entries.length} | ` +
      `ambiguous: ${manifest.ambiguous.length} | unmatched: ${manifest.unmatched.length} | ` +
      `skipped: ${manifest.skipped.length}`,
  );
  if (!apply) console.log("\nDry run only. Re-run with --apply to write images and update products.");
  if (apply) console.log(`Manifest written to ${manifestPath}.`);
}

main()
  .catch((error) => {
    console.error("\nPhoto import failed:", error.message.split("\n")[0]);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
