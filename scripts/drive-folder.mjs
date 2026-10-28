/**
 * Downloads the images from a PUBLIC Google Drive folder.
 *
 * Usage:
 *   node scripts/drive-folder.mjs <folderId> [--out photos-in] [--list]
 *
 * The folder must be shared as "Anyone with the link → Viewer". Google returns
 * 401 for private folders; this script reports that instead of guessing.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const folderId = args.find((arg) => !arg.startsWith("--"));
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "photos-in";
const listOnly = args.includes("--list");

if (!folderId) {
  console.error("Usage: node scripts/drive-folder.mjs <folderId> [--out photos-in] [--list]");
  process.exit(1);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "avif"];

async function listFolder() {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await response.text();

  if (response.status !== 200 || /accounts\.google\.com|Sign in/i.test(html)) {
    throw new Error(
      `Google returned ${response.status}. The folder is not public. ` +
        "Share it as 'Anyone with the link → Viewer' and try again.",
    );
  }

  const entries = [];
  const pattern = /id="entry-([A-Za-z0-9_-]{10,})"[\s\S]*?flip-entry-title">([^<]+)<\/div>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    entries.push({ id: match[1], name: match[2].trim() });
  }

  if (entries.length === 0) {
    throw new Error(
      "No files were found in the folder listing. If the folder is public but contains only sub-folders, " +
        "add the images to the top level or share the sub-folders individually.",
    );
  }
  return entries;
}

function extensionOf(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.includes(ext) ? ext : null;
}

async function download(entry) {
  const url = `https://drive.google.com/uc?export=download&id=${entry.id}`;
  let response = await fetch(url, { headers: { "User-Agent": UA } });
  let buffer = Buffer.from(await response.arrayBuffer());

  // Large files show an interstitial HTML page with a confirm token.
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const html = buffer.toString("utf8");
    const token = html.match(/confirm=([0-9A-Za-z_-]+)/)?.[1];
    if (!token) throw new Error("Drive returned a sign-in or error page instead of the file.");
    response = await fetch(`https://drive.google.com/uc?export=download&confirm=${token}&id=${entry.id}`, {
      headers: { "User-Agent": UA },
    });
    buffer = Buffer.from(await response.arrayBuffer());
  }

  if (!response.ok || buffer.length < 1024) {
    throw new Error(`Download failed (HTTP ${response.status}, ${buffer.length} bytes).`);
  }
  return buffer;
}

async function main() {
  console.log(`Reading public folder ${folderId} ...`);
  const entries = await listFolder();
  const images = entries.filter((entry) => extensionOf(entry.name));
  console.log(`Found ${entries.length} file(s), ${images.length} image(s).`);

  for (const entry of images) {
    const ext = extensionOf(entry.name);
    const safeName = entry.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
    const target = path.join(outDir, safeName.endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`);
    if (listOnly) {
      console.log(`  ${entry.name}`);
      continue;
    }
    try {
      await access(target);
      console.log(`  skip (exists)  ${path.basename(target)}`);
      continue;
    } catch {
      /* not downloaded yet */
    }
    const buffer = await download(entry);
    await mkdir(outDir, { recursive: true });
    await writeFile(target, buffer);
    const sha = createHash("sha256").update(buffer).digest("hex").slice(0, 12);
    console.log(`  saved ${path.basename(target)} (${(buffer.length / 1024).toFixed(0)} KB, ${sha})`);
  }

  if (!listOnly) console.log(`\nDone. Files are in ${outDir}/. Next: node scripts/import-product-photos.mjs`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
