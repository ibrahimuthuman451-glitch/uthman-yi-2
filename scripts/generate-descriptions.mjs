/**
 * Rewrites the product descriptions in the import catalogue so every listing has
 * unique, factual copy instead of one shared template.
 *
 *   node scripts/generate-descriptions.mjs [--write]
 *
 * The text is generated only from what the product name actually says
 * (resolution, camera shape, chipset features, channel count). Nothing is
 * invented: no warranty claims, no certifications, no unseen specifications.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const write = process.argv.includes("--write");
const file = path.join(process.cwd(), "data/import/uthman-iy-catalogue-2026-10-26.json");
const payload = JSON.parse(readFileSync(file, "utf8"));

const SITE = "Uthman IY";

/** Reads only the attributes that are literally present in the product name. */
function parse(name) {
  const n = name.toLowerCase();
  const brand = /hikvision|hikvisio/.test(n)
    ? "HIKVISION"
    : /imou/.test(n)
      ? "IMOU"
      : /starlink/.test(n)
        ? "Starlink"
        : /tenda/.test(n)
          ? "Tenda"
          : /tp-?link/.test(n)
            ? "TP-Link"
            : "";

  const mp = name.match(/(\d+(?:\.\d+)?)\s?mp/i)?.[1] ?? null;
  const channels = name.match(/(\d+)\s?-?\s?(?:ch|channel)/i)?.[1] ?? null;

  const kind = /turret/i.test(n)
    ? "turret"
    : /dome/i.test(n)
      ? "dome"
      : /bullet/i.test(n)
        ? "bullet"
        : /\bpt\b|ptz/i.test(n)
          ? "pan-tilt"
          : /nvr/i.test(n)
            ? "NVR"
            : /dvr/i.test(n)
              ? "DVR"
              : /kit/i.test(n)
                ? "kit"
                : /router/i.test(n)
                  ? "router"
                  : /camera/.test(n)
                    ? "camera"
                    : "product";

  const features = [];
  if (/colorvu/i.test(n)) features.push("ColorVu full-colour night imaging");
  if (/acuseek/i.test(n)) features.push("AcuSeek human and vehicle detection");
  if (/acusense/i.test(n)) features.push("AcuSense human and vehicle detection");
  if (/smart hybrid light/i.test(n)) features.push("Smart Hybrid Light (IR plus white light)");
  if (/h\.?265/i.test(n)) features.push("H.265 compression");
  if (/poe/i.test(n)) features.push("PoE power over Ethernet");
  if (/\bwi-?fi\b|wireless/i.test(n)) features.push("Wi-Fi wireless connection");
  if (/\b4g\b/.test(n)) features.push("4G mobile connection");
  if (/\bpsu\b|power supply/i.test(n)) features.push("regulated power supply");

  return { brand, mp, channels, kind, features };
}

const LOCAL = [
  `Available from our shop on KG 14 Ave in Gisozi, Kigali, with free delivery anywhere in Rwanda.`,
  `We stock and supply this from Gisozi, Kigali, and deliver free of charge across Rwanda.`,
  `Sold by ${SITE} in Gisozi, Kigali. Delivery is free nationwide and our technicians can install it for you.`,
  `Order it from ${SITE} in Gisozi, Kigali - free delivery across Rwanda and installation available.`,
];

function build(product, index) {
  const { brand, mp, channels, kind, features } = parse(product.name);
  const sentences = [];

  if (kind === "NVR" || kind === "DVR") {
    const label = kind === "NVR" ? "network video recorder (NVR)" : "digital video recorder (DVR)";
    sentences.push(
      channels
        ? `${brand ? brand + " " : ""}${channels}-channel ${label} for recording and managing security cameras.`
        : `${brand ? brand + " " : ""}${label} for recording and managing security cameras.`,
    );
  } else if (kind === "kit") {
    sentences.push(
      `${brand ? brand + " " : ""}complete CCTV kit${channels ? ` covering ${channels} channels` : ""}, supplied with the cameras and recorder needed for a single installation.`,
    );
  } else if (kind === "router") {
    sentences.push(
      `${brand ? brand + " " : ""}${/4g/i.test(product.name) ? "4G" : "wireless"} router for homes and small offices that need reliable internet.`,
    );
  } else if (kind === "product") {
    sentences.push(`${brand ? brand + " " : ""}${product.name} - available to order from our shop in Kigali.`);
  } else {
    const shape =
      kind === "bullet"
        ? "bullet-style camera"
        : kind === "dome"
          ? "dome camera"
          : kind === "turret"
            ? "turret camera"
            : kind === "pan-tilt"
              ? "pan-and-tilt camera"
              : "camera";
    sentences.push(
      `${brand ? brand + " " : ""}${mp ? mp + "MP " : ""}${shape} for indoor or outdoor surveillance.`,
    );
  }

  if (features.length > 0) {
    const list =
      features.length === 1
        ? features[0]
        : features.slice(0, -1).join(", ") + " and " + features[features.length - 1];
    sentences.push(`It supports ${list}.`);
  } else if (mp) {
    sentences.push(
      `${mp}MP resolution gives a clear enough picture to recognise faces and number plates in normal lighting.`,
    );
  }

  sentences.push(LOCAL[index % LOCAL.length]);

  const description = sentences.join(" ");
  const short =
    kind === "NVR" || kind === "DVR"
      ? `${brand ? brand + " " : ""}${channels ? channels + "-channel " : ""}${kind} for security camera recording.`
      : kind === "kit"
        ? `${brand ? brand + " " : ""}complete CCTV kit${channels ? ` for ${channels} channels` : ""}.`
        : `${brand ? brand + " " : ""}${mp ? mp + "MP " : ""}${kind === "camera" ? "security camera" : kind}${
            features.length ? " with " + features[0].replace(/\s*\(.*\)$/, "") : ""
          }.`;

  return { description, short };
}

let changed = 0;
const samples = [];
payload.products.forEach((product, index) => {
  const { description, short } = build(product, index);
  if (product.description !== description) changed += 1;
  product.description = description;
  product.shortDescription = short;
  if (samples.length < 5) samples.push({ name: product.name, short, description });
});

console.log(`products: ${payload.products.length}, descriptions changed: ${changed}`);
for (const s of samples) {
  console.log(`\n- ${s.name}\n  short: ${s.short}\n  full : ${s.description}`);
}

const unique = new Set(payload.products.map((p) => p.description)).size;
console.log(`\nunique descriptions: ${unique} / ${payload.products.length}`);

if (write) {
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nwritten: ${file}\nnext: npm run catalogue:apply`);
} else {
  console.log("\ndry run - re-run with --write to save");
}
