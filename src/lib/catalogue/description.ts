/**
 * Product copy generated from the model name.
 *
 * The catalogue was imported with one shared description for every listing,
 * which is exactly the thin duplicate content Google refuses to index. This
 * module derives unique, factual text from what the name actually states
 * (resolution, camera shape, chipset features, channel count) and is used:
 *
 *   - at render time, for listings that still carry the legacy template, so the
 *     site improves immediately after a deploy; and
 *   - by scripts/generate-descriptions.mjs, to write the same text into the
 *     import file for persistence.
 *
 * Nothing is invented: no warranty, no certification, no unseen specification.
 */
const LOCAL = [
  "Available from our shop on KG 14 Ave in Gisozi, Kigali, with free delivery anywhere in Rwanda.",
  "We stock and supply this from Gisozi, Kigali, and deliver free of charge across Rwanda.",
  "Sold by Uthman IY in Gisozi, Kigali. Delivery is free nationwide and our technicians can install it for you.",
  "Order it from Uthman IY in Gisozi, Kigali - free delivery across Rwanda and installation available.",
];

type Parsed = {
  brand: string;
  mp: string | null;
  channels: string | null;
  kind: string;
  features: string[];
};

function parse(name: string): Parsed {
  const n = (name ?? "").toLowerCase();
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

  const features: string[] = [];
  if (/colorvu/i.test(n)) features.push("ColorVu full-colour night imaging");
  if (/acuseek/i.test(n)) features.push("AcuSeek human and vehicle detection");
  if (/acusense/i.test(n)) features.push("AcuSense human and vehicle detection");
  if (/smart hybrid light/i.test(n)) features.push("Smart Hybrid Light (IR plus white light)");
  if (/h\.?265/i.test(n)) features.push("H.265 compression");
  if (/poe/i.test(n)) features.push("PoE power over Ethernet");
  if (/\bwi-?fi\b|wireless/i.test(n)) features.push("Wi-Fi wireless connection");
  if (/\b4g\b/.test(n)) features.push("4G mobile connection");

  return { brand, mp, channels, kind, features };
}

export function buildProductDescription(name: string, seed = 0): string {
  const { brand, mp, channels, kind, features } = parse(name);
  const sentences: string[] = [];

  if (kind === "NVR" || kind === "DVR") {
    const label = kind === "NVR" ? "network video recorder (NVR)" : "digital video recorder (DVR)";
    sentences.push(
      channels
        ? `${brand ? `${brand} ` : ""}${channels}-channel ${label} for recording and managing security cameras.`
        : `${brand ? `${brand} ` : ""}${label} for recording and managing security cameras.`,
    );
  } else if (kind === "kit") {
    sentences.push(
      `${brand ? `${brand} ` : ""}complete CCTV kit${channels ? ` covering ${channels} channels` : ""}, supplied with the cameras and recorder needed for a single installation.`,
    );
  } else if (kind === "router") {
    sentences.push(
      `${brand ? `${brand} ` : ""}${/4g/i.test(name) ? "4G" : "wireless"} router for homes and small offices that need reliable internet.`,
    );
  } else if (kind === "product") {
    sentences.push(`${brand ? `${brand} ` : ""}${name} - available to order from our shop in Kigali.`);
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
      `${brand ? `${brand} ` : ""}${mp ? `${mp}MP ` : ""}${shape} for indoor or outdoor surveillance.`,
    );
  }

  if (features.length > 0) {
    const list =
      features.length === 1
        ? features[0]
        : `${features.slice(0, -1).join(", ")} and ${features[features.length - 1]}`;
    sentences.push(`It supports ${list}.`);
  } else if (mp) {
    sentences.push(
      `${mp}MP resolution gives a clear enough picture to recognise faces and number plates in normal lighting.`,
    );
  }

  sentences.push(LOCAL[Math.abs(seed) % LOCAL.length]);
  return sentences.join(" ");
}

/** True when a stored description is the old shared template (or empty). */
export function isLegacyDescription(text: string | null | undefined): boolean {
  if (!text || text.trim().length === 0) return true;
  return /available from Uthman IY in Kigali|not published here until Uthman IY has verified/i.test(
    text,
  );
}
