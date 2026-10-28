/**
 * Brand identity derived from the product title.
 *
 * The catalogue stores manufacturer model names ("HIKVISION DS-2CD1347G2H-LIU…"),
 * so the brand is read from the title rather than duplicated in a separate
 * column that could drift out of sync with it.
 */
export const SUPPORTED_BRANDS = [
  { key: "hikvision", label: "HIKVISION", blurb: "Video surveillance and security equipment" },
  { key: "imou", label: "IMOU", blurb: "Smart home and business cameras" },
  { key: "starlink", label: "Starlink", blurb: "Satellite internet kits and accessories" },
] as const;

export type BrandKey = (typeof SUPPORTED_BRANDS)[number]["key"];
export type Brand = { key: BrandKey; label: string };

const ALIASES: Record<string, BrandKey> = {
  hikvision: "hikvision",
  hikvisio: "hikvision", // typo present in the supplier feed
  imou: "imou",
  starlink: "starlink",
};

export function getProductBrand(name: string): Brand | null {
  const words = name.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of words) {
    const key = ALIASES[word];
    if (!key) continue;
    const brand = SUPPORTED_BRANDS.find((entry) => entry.key === key);
    if (brand) return { key: brand.key, label: brand.label };
  }
  return null;
}

export function brandByKey(key: string | null | undefined) {
  if (!key) return null;
  return SUPPORTED_BRANDS.find((brand) => brand.key === key) ?? null;
}
