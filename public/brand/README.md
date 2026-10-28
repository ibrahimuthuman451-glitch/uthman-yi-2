# Official Uthman IY logo

`uthman-iy-logo.png` is the owner-supplied official logo, stored **unchanged**:

| Property | Value |
| --- | --- |
| File | `public/brand/uthman-iy-logo.png` |
| Dimensions | 1619 × 971 px (ratio 1.667:1) |
| Format | PNG, 8-bit RGB (no alpha channel, solid white background) |
| SHA-256 | `f5d4456e1a85a48051f26a2237004d2cdff6953fbef761ff4b30e6df413db95f` |

Rendering rules enforced in `src/components/site/logo.tsx`:

- The file is referenced directly; it is never redrawn, recoloured, cropped, stretched or replaced.
- Only the **height** is set in CSS and the width is left `auto`, so the browser keeps the
  file's own aspect ratio.
- Header: rendered on white at `h-9` (mobile) / `h-10` (desktop).
- Footer: because the artwork has a solid white background, it is placed on a white rounded
  lockup so it stays legible on the navy footer. The image bytes are still untouched.
- Admin notice about a missing logo disappears automatically while this file exists.
- The same file is used for the Open Graph image and browser icon. A dedicated small favicon can
  be added later if the owner supplies one; generating a modified copy is avoided.

To replace it later, overwrite this file (or supply `uthman-iy-logo.svg` / `.webp` / `.jpg`) — the
component detects the first matching file name, and nothing else needs changing.
