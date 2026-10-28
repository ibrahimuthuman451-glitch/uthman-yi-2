# Product photography import

The owner supplies product photos; this project matches them to catalogue products by filename,
optimises them and attaches them to the product records. Nothing is downloaded from another
company's website, and a photo is never attached to a product it does not clearly match.

## 1. Share the Drive folder

Google Drive → right-click the folder → **Share** → **General access: Anyone with the link** →
**Viewer**. Without this, Google returns `401` and the downloader stops with a clear message.

> Images in sub-folders are not listed by Drive's embedded view. Put the photos in the shared
> folder itself (or share each sub-folder and download them separately).

## 2. Download

```bash
node scripts/drive-folder.mjs 1IzFReTKQ3PFCllPKr_cWbULxcZ6fzY6F          # dry list
node scripts/drive-folder.mjs 1IzFReTKQ3PFCllPKr_cWbULxcZ6fzY6F --list  # names only
npm run photos:download -- 1IzFReTKQ3PFCllPKr_cWbULxcZ6fzY6F           # download to photos-in/
```

Files land in `photos-in/` (git-ignored). Re-running skips files that already exist.

## 3. Map exactly (preferred)

```bash
npm run photos:map          # dry run: product -> exact image file
npm run photos:map -- --apply
```

The catalogue was imported from the reference shop, whose public API lists the image file name for
each product; the shared folder uses those same names. This script therefore maps **product →
exact file name**, which is deterministic and avoids guessing. It reports any product whose photo
is absent and any duplicate listing that would reuse the same file.

Result on 2026-10-28: **60/60 products mapped**, 60 WebP files (1.4 MB total).

## 4. Match by name (fallback)

```bash
npm run photos:match
```

Prints one line per file: `MATCH`, `AMBIGUOUS`, `UNMATCHED`, `SKIPPED` or `DUPLICATE`, with the
chosen product and score. **Review this output** before applying — a wrong match shows the wrong
product to customers.

How matching works (`src/lib/catalogue/photo-match.ts`):

- filenames are normalised (`DS-2CD1347G2H-LIU` → `ds 2cd1347g2h liu`);
- rare tokens (model codes, series names) weigh more than generic words (`camera`, `network`);
- a brand mismatch (IMOU vs HIKVISION) is penalised;
- a megapixel conflict (4MP vs 2MP) is penalised heavily;
- tokens in the filename that are missing from the title count against the candidate;
- if two products score within one point, the file is reported **ambiguous** instead of guessed;
- filenames with no distinctive tokens (`IMG_2034.jpg`) are reported **unmatched**.

## 5. Apply

```bash
npm run photos:apply
```

For each confirmed match this will:

1. re-encode the photo to WebP, max 1200×1200, quality 82, EXIF stripped (`sharp`);
2. write `public/products/<slug>.webp`;
3. set `imageUrl` and `imageAlt` (the product name) on the product;
4. record the source file, source SHA-256, output size and score in
   `data/product-photos/manifest.json`.

Safety rules:

- a product that already has an image is **skipped** unless you pass `--force`;
- one file can only attach to one product; duplicate matches are reported;
- ambiguous/unmatched files are never attached automatically.

## 6. Rename files to fix mismatches

Rename the source file to include the model code or distinguishing number, then re-run
`npm run photos:match`. Examples that match reliably:

```
HIKVISION DS-2CD1347G2H-LIU 4MP Dome.jpg   → exact model code
IMOU Ranger 2 3MP.jpg                     → series + megapixels
Starlink Kit V4.png                       → exact product name
```

## 7. After applying

```bash
npm run build && npm start
# check /shop and a few product pages, then:
node scripts/check-links.mjs
```

Commit `public/products/*.webp` and `data/product-photos/manifest.json` so the images ship with
the deployment; `photos-in/` stays out of git.

## Updating another database (e.g. Supabase)

When the image files are committed but a different database needs the URLs:

```bash
DATABASE_URL="<production pooler URL>" npm run photos:urls
```

`scripts/apply-photo-urls.ts` sets `imageUrl`/`imageAlt` for every product that has a matching
`public/products/<slug>.webp`. It needs no source photos and makes no network calls.

## Notes

- Only publish photos the business owns or is licensed to use.
- `sharp` is a dev dependency used only by this script; it is not imported by the app.
- Supported inputs: JPG, PNG, WebP, AVIF (HEIC must be converted first).
