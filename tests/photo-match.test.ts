import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanPhotoFileName, matchPhotoToProduct, normalizeName } from "@/lib/catalogue/photo-match";

const payload = JSON.parse(
  readFileSync(path.join(process.cwd(), "data/import/uthman-iy-catalogue-2026-10-26.json"), "utf8"),
) as { products: { name: string; slug: string }[] };

const products = payload.products.map(({ name, slug }) => ({ name, slug }));

function match(file: string) {
  return matchPhotoToProduct(file, products);
}

describe("photo filename matching", () => {
  it("normalises separators, brands and file extensions", () => {
    expect(normalizeName("HIKVISION_DS-2CD1347G2H-LIU 4MP.JPG")).toBe(
      "hikvision ds 2cd1347g2h liu 4mp jpg",
    );
  });

  it("strips supplier, marketplace and duplicate-file noise", () => {
    expect(cleanPhotoFileName("imgi_10_Hikvision_DS-2CD2143G2-I_2_8mm_q7bf9i (2).jpg")).toBe(
      "Hikvision DS 2CD2143G2 I 2 8mm",
    );
    expect(cleanPhotoFileName("imgi_17_HIKVISION_DS-UPS2000VA_rqbjxd.jpg")).toBe(
      "HIKVISION DS UPS2000VA",
    );
  });

  it("matches a model code written without separators", () => {
    const result = match("imgi_17_HIKVISION_DS-UPS2000VA_rqbjxd.jpg");
    expect(result.status).toBe("matched");
    expect(result.best?.name).toContain("DS-UPS2000");
  });

  it("matches an exact model code", () => {
    const result = match("HIKVISION DS-2CD1347G2H-LIU 4MP dome.jpg");
    expect(result.status).toBe("matched");
    expect(result.best?.slug).toBe("hikvision-ds-2cd1347g2h-liu-color-vu-with-smart-hybrid-4mp-dome");
  });

  it("matches a short marketing name", () => {
    const result = match("IMOU Ranger 2 3MP.jpg");
    expect(result.status).toBe("matched");
    expect(result.best?.name).toContain("IMOU Ranger 2 3MP");
  });

  it("matches a simple product name", () => {
    const result = match("Starlink Kit V4.png");
    expect(result.status).toBe("matched");
    expect(result.best?.name).toBe("Starlink Kit V4");
  });

  it("prefers the matching megapixel variant over the wrong one", () => {
    const result = match("HIKVISION 8MP Dual Light Motion 2.0 Fixed Bullet Network Camera.jpg");
    expect(result.status).toBe("matched");
    expect(result.best?.name).toContain("8MP");
    expect(result.best?.name).toContain("Bullet");
  });

  it("refuses to guess between two identically named products", () => {
    const result = match("HIKVISION 6MP ColorVu 3.0 Fixed Turret Acuseek Network Camera.jpg");
    expect(result.status).toBe("ambiguous");
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("reports unmatched camera-roll and screenshot files", () => {
    expect(match("IMG_2034.jpg").status).toBe("unmatched");
    expect(match("Screenshot 2026-10-26 at 10.12.44.png").status).toBe("unmatched");
  });
});

describe("brand detection", () => {
  it("reads the manufacturer from the product title", async () => {
    const { getProductBrand } = await import("@/lib/catalogue/brand");
    expect(getProductBrand("HIKVISION DS-2CD1347G2H-LIU 4MP Dome")?.label).toBe("HIKVISION");
    expect(getProductBrand("IMOU Ranger 2 3MP")?.label).toBe("IMOU");
    expect(getProductBrand("Starlink Kit V4")?.label).toBe("Starlink");
  });

  it("handles the supplier spelling variant and unbranded titles", async () => {
    const { getProductBrand, brandByKey } = await import("@/lib/catalogue/brand");
    expect(getProductBrand("HIKVISIO 6MP ColorVu 3.0 Fixed Bullet")?.key).toBe("hikvision");
    expect(getProductBrand("4 MP ColorVu With Smart Hybrid Light")).toBeNull();
    expect(brandByKey("imou")?.label).toBe("IMOU");
    expect(brandByKey("unknown")).toBeNull();
  });
});
