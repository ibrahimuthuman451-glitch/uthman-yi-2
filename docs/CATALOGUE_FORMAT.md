# Catalogue import / export format

Admin → **Import / export** (`/admin/catalogue`) exchanges catalogue data as JSON (import and
export) or CSV (export only). Import is validated with Zod on the server; invalid rows are
reported and skipped, valid rows are applied. Nothing is ever deleted by an import.

## JSON shape

```json
{
  "products": [
    {
      "name": "HIKVISION 4MP Dome Camera",
      "slug": "hikvision-4mp-dome-camera",
      "sku": "UY-CAM-4MP-DOME",
      "categorySlug": "cctv-cameras",
      "shortDescription": "Indoor 4MP dome camera.",
      "description": "Longer description owned by Uthman IY.",
      "specifications": [{ "label": "Resolution", "value": "4MP" }],
      "priceRwf": 115000,
      "compareAtPriceRwf": null,
      "stock": 8,
      "lowStockThreshold": 3,
      "dataStatus": "APPROVED",
      "isPublished": true,
      "featured": false,
      "imageUrl": "/products/dome-camera.webp",
      "imageAlt": "White dome camera mounted on a ceiling",
      "referencePriceRwf": null,
      "referenceSource": null,
      "referenceRetrievedAt": null
    }
  ]
}
```

### Field rules

| Field | Required | Rules |
| --- | --- | --- |
| `name` | yes | 2–160 characters |
| `slug` | no | Generated from the name when omitted (letters, numbers, hyphens) |
| `sku` | no | ≤60 characters, unique. Used first when matching an existing row |
| `categorySlug` | no | Must already exist as a category slug, otherwise the row fails |
| `shortDescription` | no | ≤300 characters (cards and search results) |
| `description` | no | ≤6000 characters |
| `specifications` | no | Up to 40 `{ label, value }` pairs |
| `priceRwf` | no | Integer ≥ 0. Required in practice for an approved, published listing |
| `compareAtPriceRwf` | no | Integer ≥ 0; only for a genuinely previous price |
| `stock` | no | Integer 0–1,000,000 (default 0) |
| `lowStockThreshold` | no | Integer ≥ 0 (default 5) |
| `dataStatus` | no | `APPROVED`, `DEMO` or `REFERENCE` (default `REFERENCE`) |
| `isPublished` | no | Boolean (default `false` — imports never publish silently) |
| `featured` | no | Boolean (default `false`) |
| `imageUrl` | no | Absolute `https://` URL or a path starting with `/` |
| `imageAlt` | no | ≤200 characters; describe the product for screen readers |
| `referencePriceRwf` | no | Integer; third-party research price, never treated as an Uthman IY price |
| `referenceSource` | no | ≤200 characters, e.g. "FabriTech (fabritech.rw) 2026-10-25" |
| `referenceRetrievedAt` | no | ISO 8601 datetime |

### Matching and safety

1. A row matches an existing product by `sku` first, then by `slug`.
2. Matching rows are updated; unmatched rows are created as new products.
3. Imported rows default to `REFERENCE` and unpublished, so a mistaken import cannot appear for sale.
4. `REFERENCE` listings are never orderable, even if published: the shop requires an approved price.
5. Unknown categories fail the row instead of inventing a category.
6. The import itself is recorded in the audit log with counts and error totals.

### Approved prices are never overwritten by accident

An existing product keeps its **approved selling price**, publication state, featured flag, stock
count and low-stock threshold when a file is imported again. Only descriptive fields (name,
description, specifications, category, reference provenance) are refreshed, so a routine weekly
re-import or `npm run catalogue:apply` cannot undo an administrator's price change.

To re-price deliberately:

- in the admin import screen, tick **Overwrite existing approved prices**; or
- run `npx tsx --tsconfig tsconfig.scripts.json scripts/import-owner-catalogue.ts --update-prices`.

The import response reports how many prices were preserved, and the audit entry records whether
re-pricing was requested.

`npm run catalogue:apply` also accepts `-- --apply-settings` to re-apply the store settings
(stock mode, delivery area, payment instructions). Settings are skipped by default for the same
reason: an import must not revert configuration that an administrator changed later.

## CSV export

Columns: `sku,name,slug,categorySlug,priceRwf,stock,lowStockThreshold,dataStatus,isPublished,imageUrl`.
The CSV is for review/spreadsheet work; **import is JSON only** so nested specifications cannot be
silently mangled.

## Reference research import

`data/reference/fabritech-catalogue-2026-10-25.json` contains third-party listings captured from a
public storefront on 2026-10-25 (titles, categories, reference prices only). They load into the
`ReferenceCatalogItem` table via Admin → **Reference research**, are excluded from the storefront,
and can be converted into unpublished drafts. A draft still needs Uthman IY's own price,
description, photography and stock confirmation before publishing.

Do not add another company's descriptions or images to this file: reuse requires written permission.
