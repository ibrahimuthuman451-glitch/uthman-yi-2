/**
 * Matches owner-supplied photo filenames to catalogue products.
 *
 * The catalogue contains many near-identical titles ("4MP ColorVu dome" vs
 * "2MP ColorVu dome"), so plain fuzzy text search is not safe: a wrong match
 * would show the wrong product. This matcher weights rare tokens (model codes,
 * series names), penalises conflicting megapixel/brand tokens, and reports
 * ambiguous cases instead of guessing.
 */

export type PhotoProduct = { slug: string; name: string };

export type PhotoMatchStatus = "matched" | "ambiguous" | "unmatched";

export type PhotoMatch = {
  status: PhotoMatchStatus;
  best: { slug: string; name: string; score: number } | null;
  alternatives: { slug: string; name: string; score: number }[];
  reason: string;
};

const STOPWORDS = new Set([
  "the", "and", "with", "for", "of", "a", "an", "to", "in", "on",
  "img", "image", "photo", "pic", "picture", "copy", "final", "new",
  "jpeg", "jpg", "png", "webp", "heic",
]);

/** Tokens that describe a whole category rather than a specific SKU. */
const GENERIC = new Set([
  "camera", "cameras", "ip", "network", "wifi", "wireless", "smart",
  "hybrid", "light", "fixed", "security", "cctv", "kit", "kits", "series",
  "digital", "video", "outdoor", "indoor", "hd", "uhd", "poe",
]);

/**
 * Removes supplier/marketplace noise from a photo file name:
 * `imgi_10_Hikvision_DS-2CD2143G2-I_2_8mm_q7bf9i (2).jpg` -> `Hikvision DS-2CD2143G2-I 2 8mm`.
 */
function looksLikeCdnHash(token: string): boolean {
  if (!/^[a-z0-9]+$/i.test(token)) return false;
  // Never strip something that looks like a model code (UPS2000VA, DS7616NIQ2).
  if (isModelToken(token.toLowerCase())) return false;
  if (token.length < 5 || token.length > 9) return false;
  // Mixed letters and digits, or an unpronounceable consonant run (q7bf9i, rqbjxd).
  if (/\d/.test(token) && /[a-z]/i.test(token)) return true;
  if (!/^[a-z]+$/i.test(token)) return false;
  const vowels = (token.match(/[aeiou]/gi) ?? []).length;
  return vowels / token.length < 0.3;
}

/**
 * Removes supplier/marketplace noise from a photo file name:
 * `imgi_10_Hikvision_DS-2CD2143G2-I_2_8mm_q7bf9i (2).jpg` -> `Hikvision DS 2CD2143G2 I 2 8mm`.
 */
export function cleanPhotoFileName(value: string): string {
  const base = value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/^(imgi?|image|photo|photos|pics?)[-_ ]?\d+[-_ ]+/i, "")
    .replace(/[-_ ]+(ebay|alibaba|amazon|shopify|jumia)/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = base.split(" ");
  while (parts.length > 1 && looksLikeCdnHash(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    // Series numbers such as the "2" in "Ranger 2" are single characters but
    // are often the only thing distinguishing two products.
    .filter((token) => (token.length > 1 || /^\d$/.test(token)) && !STOPWORDS.has(token));
}

/** Model codes such as ds2cd1347g2hliu, ds7616niq2, dsj142i, dskis313pb. */
function isModelToken(token: string): boolean {
  return /^[a-z]{1,4}\d{2,}[a-z0-9]*$/.test(token) && token.length >= 5;
}

function megapixels(value: string): number | null {
  const normalised = normalizeName(value);
  const match = normalised.match(/\b(\d{1,2})\s?mp\b/);
  if (match) return Number(match[1]);
  const k = normalised.match(/\b(\d)k\b/);
  if (k) return Math.round(Number(k[1]) * 0.8); // 3K ~ 5MP marketing naming
  return null;
}

const BRANDS = ["hikvision", "hikvisio", "imou", "starlink", "dahua", "unv"];

function brandOf(value: string): string | null {
  const normalised = normalizeName(value);
  return BRANDS.find((brand) => normalised.includes(brand)) ?? null;
}

function idfWeights(products: PhotoProduct[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const product of products) {
    for (const token of new Set(tokens(product.name))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  const total = Math.max(1, products.length);
  const weights = new Map<string, number>();
  for (const [token, count] of frequency) {
    // Rare tokens carry more signal; generic vocabulary is deliberately weak.
    const base = Math.log(1 + total / count) + 1;
    weights.set(token, GENERIC.has(token) ? base * 0.25 : base);
  }
  return weights;
}

function scorePair(
  fileTokens: string[],
  product: PhotoProduct,
  weights: Map<string, number>,
): { score: number; distinctive: number } {
  const productTokens = tokens(product.name);
  const productSet = new Set(productTokens);
  const compactProductName = normalizeName(product.name).replace(/[^a-z0-9]/g, "");
  const uniqueFileTokens = [...new Set(fileTokens)];
  let score = 0;
  let shared = 0;
  let distinctive = 0;

  for (const token of uniqueFileTokens) {
    const weight = weights.get(token) ?? 1;
    if (productSet.has(token)) {
      shared += 1;
      if (isModelToken(token)) distinctive += 1;
      score += isModelToken(token) ? weight * 2.5 : weight;
    } else if (
      token.length >= 5 &&
      /\d/.test(token) &&
      compactProductName.includes(token.replace(/[^a-z0-9]/g, ""))
    ) {
      // Model codes are written inconsistently ("DS-UPS2000 VA" vs
      // "DS-UPS2000VA", "DS-7616NI-Q2/16P" vs "DS7616NIQ2"). A compact
      // substring match keeps those identical without weakening short tokens.
      shared += 1;
      distinctive += 1;
      score += weight * 1.2;
    } else {
      // Tokens present in the file name but missing from the product title are
      // evidence against the match (e.g. "2" in "Ranger 2" vs "Ranger Mini").
      score -= weight * 0.35;
    }
  }

  // Reward covering the whole file name, so an exact series match beats a
  // partial one with the same brand and megapixels.
  if (uniqueFileTokens.length > 0) {
    score += 1.5 * (shared / uniqueFileTokens.length);
  }

  const fileBrand = brandOf(fileTokens.join(" "));
  const productBrand = brandOf(product.name);
  if (fileBrand || productBrand) {
    if (fileBrand && productBrand && fileBrand !== productBrand) score -= 3;
    else if (fileBrand && fileBrand === productBrand) score += 1.5;
  }

  const fileMp = megapixels(fileTokens.join(" "));
  const productMp = megapixels(product.name);
  if (fileMp !== null && productMp !== null && fileMp !== productMp) score -= 4;

  return { score, distinctive };
}

export type RankedPhotoMatch = { slug: string; name: string; score: number; distinctive: number };

export function rankPhotoMatches(fileName: string, products: PhotoProduct[]): RankedPhotoMatch[] {
  const weights = idfWeights(products);
  const fileTokens = tokens(cleanPhotoFileName(fileName));
  return products
    .map((product) => {
      const { score, distinctive } = scorePair(fileTokens, product, weights);
      return {
        slug: product.slug,
        name: product.name,
        score: Math.round(score * 100) / 100,
        distinctive,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function matchPhotoToProduct(fileName: string, products: PhotoProduct[]): PhotoMatch {
  const ranked = rankPhotoMatches(fileName, products);
  const best = ranked[0] ?? null;
  const alternatives = ranked.slice(1, 4).filter((candidate) => candidate.score > 0);

  if (!best || best.score < 4) {
    return {
      status: "unmatched",
      best: null,
      alternatives,
      reason: "No product shares enough distinctive tokens with this file name.",
    };
  }

  const [second] = alternatives;
  const margin = second ? best.score - second.score : best.score;

  // A match must be either supported by a model code / series evidence, or be
  // strong enough that no reasonable alternative exists. Anything else is
  // surfaced for a human instead of being attached to a product.
  if (best.distinctive === 0 && best.score < 12) {
    return {
      status: "ambiguous",
      best,
      alternatives,
      reason: "No model code or series evidence; a human should confirm this photo.",
    };
  }

  if (second && (margin < 1.5 || second.score > best.score * 0.9)) {
    return {
      status: "ambiguous",
      best,
      alternatives,
      reason: `Two products score within ${margin.toFixed(2)} points; rename the file or choose manually.`,
    };
  }

  return {
    status: "matched",
    best,
    alternatives,
    reason: `Matched on ${Math.round(best.score)} points (margin ${margin.toFixed(2)}, model evidence ${best.distinctive}).`,
  };
}
