/**
 * Crawls internal links and image sources from the public site and reports
 * broken references. Requires a running server (npm start).
 *
 * Usage: node scripts/check-links.mjs [baseUrl]
 */
const base = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const seeds = [
  "/",
  "/shop",
  "/software",
  "/software-development",
  "/about",
  "/contact",
  "/cart",
  "/checkout",
  "/orders/track",
  "/terms",
  "/privacy",
];

const seen = new Set();
const queue = [...seeds];
const broken = [];
const checked = new Set();
const MAX_PAGES = 60;

async function checkAsset(url) {
  if (checked.has(url)) return;
  checked.add(url);
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) broken.push(`${url} -> ${response.status}`);
  } catch (error) {
    broken.push(`${url} -> ${error.message}`);
  }
}

while (queue.length > 0 && seen.size < MAX_PAGES) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);

  let html = "";
  try {
    const response = await fetch(`${base}${path}`, { redirect: "follow" });
    if (!response.ok) {
      broken.push(`${path} -> ${response.status}`);
      continue;
    }
    html = await response.text();
  } catch (error) {
    broken.push(`${path} -> ${error.message}`);
    continue;
  }

  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const imageSources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);

  for (const href of hrefs) {
    if (href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    if (href.startsWith("http") && !href.startsWith(base)) continue;
    const internal = href.startsWith("http") ? new URL(href).pathname + new URL(href).search : href;
    if (internal.startsWith("/admin")) continue;
    if (!seen.has(internal) && !queue.includes(internal)) queue.push(internal);
  }

  for (const src of imageSources) {
    if (src.startsWith("data:")) continue;
    const assetUrl = src.startsWith("http") ? src : `${base}${src}`;
    await checkAsset(assetUrl);
  }
}

console.log(`Crawled ${seen.size} page(s) and ${checked.size} asset(s) from ${base}`);
if (broken.length === 0) {
  console.log("No broken internal links or images found.");
} else {
  console.log(`\n${broken.length} broken reference(s):`);
  for (const item of broken) console.log(`  - ${item}`);
  process.exitCode = 1;
}
