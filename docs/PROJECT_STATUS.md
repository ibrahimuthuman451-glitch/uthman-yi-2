# Project status and handover

Last updated: 2026-10-26 (contact details updated to 0780551125 / 0785 779 207 / uthumanyi@gmail.com). This
document is the honest state of the build: what was implemented,
what was executed and observed, what is deliberately not done, and what only the owner can decide.

## 1. Starting point

The repository was **empty** (no commits, no files, no logo asset). Everything in this repository
was created during this build; nothing pre-existing was removed. The first commit on branch
`cline/b0h8fwvr` is the scaffold, followed by data layer, UI and admin commits.

## 2. What is implemented

See `README.md` for the feature list and `docs/` for deployment, payments, catalogue format and
security. In short:

- Company website (home, about, contact, policies) with responsive layout and SEO metadata
- Online shop: catalogue, search/filter/sort/pagination, product pages, cart, checkout, order
  confirmation, guest order tracking, server-side pricing and stock reservation
- Software development: eight service pages plus quote/consultation forms
- Our software: overview and three separate product pages driven by the database, with honest
  status labels and early-access forms
- Administration: authentication, dashboard, products, categories, orders, inquiries, software
  content, services, settings (delivery/payments/contact/homepage), catalogue import/export,
  reference research, staff accounts, audit log

## 3. Important files and routes

| Area | Path |
| --- | --- |
| Data model | `prisma/schema.prisma`, `prisma/migrations/` |
| Seed | `prisma/seed.ts`, `prisma/seed-data.ts` |
| Security | `src/lib/auth/*`, `src/lib/rate-limit.ts`, `src/lib/audit.ts`, `next.config.ts` (headers) |
| Order pricing (pure) | `src/lib/orders/pricing.ts` |
| Order lifecycle | `src/server/services/orders.ts` |
| Payments | `src/lib/payments/options.ts`, `src/lib/payments/mtn-momo.ts`, `src/server/services/payments.ts` |
| Catalogue | `src/server/services/catalog.ts`, `src/server/services/admin-catalog.ts`, `src/server/services/catalogue-io.ts` |
| Reference research | `data/reference/fabritech-catalogue-2026-10-25.json`, `src/server/services/reference-catalogue.ts` |
| Public routes | `/`, `/shop`, `/shop/[slug]`, `/cart`, `/checkout`, `/orders/[orderNumber]`, `/orders/track`, `/software`, `/software/[slug]`, `/software-development`, `/software-development/[slug]`, `/about`, `/contact`, `/terms`, `/privacy` |
| Admin routes | `/admin/login`, `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/categories`, `/admin/orders`, `/admin/orders/[id]`, `/admin/inquiries`, `/admin/inquiries/[id]`, `/admin/software`, `/admin/services`, `/admin/settings`, `/admin/users`, `/admin/audit`, `/admin/reference-catalogue`, `/admin/catalogue` |
| APIs | `POST /api/cart`, `GET /api/admin/catalogue/export`, `POST /api/payments/mtn/webhook` |
| SEO | `src/app/sitemap.ts`, `src/app/robots.ts`, per-page metadata |

## 4. Commands executed and observed results

Environment: Node.js 24.22, npm 11.19, Next.js 15.5.28, Prisma 6.19.3, PostgreSQL 17.10
(embedded local server), Linux container with a 6 GiB memory limit.

| Command | Result |
| --- | --- |
| `npx prisma migrate dev --name init` | Migration `20261025223854_init` created and applied; Prisma Client generated |
| `npx prisma migrate dev --name delivery_fee_status_and_airtel_money` | Migration `20261026091146_delivery_fee_status_and_airtel_money` applied: `DeliveryFeeStatus` enum, order delivery-fee fields, `MANUAL_AIRTEL_MONEY` payment method |
| `npx tsx --tsconfig tsconfig.scripts.json scripts/import-owner-catalogue.ts --apply-settings` | Re-ran the import after the safety fix: `created 0, updated 60, prices preserved 60, errors 0` — approved prices were not overwritten |
| `npx prisma db seed` | Created administrator, settings, 1 placeholder delivery area, 8 categories, 26 reference research rows, 6 labelled demo products, 8 services, 3 software products |
| `npx tsc --noEmit` | Passes with no errors |
| `npx next lint` | Passes with no warnings or errors |
| `npm run build:ci` | Production build succeeds; 37 routes compiled |
| `npm test` | 78 tests pass (10 files: pricing, availability, validation, payments, orders, delivery fees, price review, imports, inquiries, authorization guards) |
| `npx tsx --tsconfig tsconfig.scripts.json scripts/import-owner-catalogue.ts --remove-demo` | Imported 60 approved listings (0 errors), removed 6 demo listings, activated nationwide delivery, set stock-on-request and mobile-money settings |
| `npm run smoke` | 42/42 HTTP checks pass against `next start` (adds payment-method separation and admin-protection checks) |
| `node scripts/check-links.mjs` | Crawled 60 pages; no broken internal links or images |

### Verification evidence (selected)

- `GET /` → 200, contains company name, shop and software sections
- `GET /shop` → 200; `GET /shop/<demo-slug>` → 200; unknown slug → 404
- `POST /api/cart` returns the database price, not the browser price; malformed payload → 400
- `GET /admin` without a session → 307 to `/admin/login`; with a valid session → 200
- `GET /admin/users` as `STAFF` → 307 (server-side role check); `/admin/orders` as `STAFF` → 200
- `GET /api/admin/catalogue/export` unauthenticated → 401; authenticated → JSON export
- MTN webhook with an invalid body → 400; unknown reference → 404 (a faked success cannot mark an order paid)
- Order integration tests: correct totals, stock 5→3 on checkout, no second decrement on a repeated
  idempotency key, oversell rejected, reference listings rejected, cancellation returns stock once,
  manual payment confirmation works once, tracking requires the matching email **or** phone

## 5. Tests that were NOT run (and why)

1. **Browser-based visual, mobile and accessibility testing.** Chromium could not launch in this
   sandbox: the Playwright host requirements check failed because required system libraries are
   absent and there is no root access to install them. No screenshots, Lighthouse, axe or
   screen-reader results are claimed. Layout work is mobile-first with fluid containers, wrapped
   tables, a `<details>`-based mobile menu, 44 px+ controls, visible focus rings and
   `overflow-x` protection, but it still needs a human pass on a real phone.
2. **A full click-through checkout in a real browser** (cart → checkout → confirmation). Order
   creation, pricing, stock, idempotency, cancellation and payment confirmation are covered by
   database integration tests, and the pages/APIs are covered by the HTTP smoke test, but the
   browser form submission path itself was not executed end to end here.
3. **Payment provider sandbox tests.** No MTN/Airtel/merchant credentials were available. The MTN
   Collections client and webhook exist but are untested against MTN and remain disabled.
4. **Email delivery.** No SMTP/mail provider configured; no transport is bundled.
5. **Load, penetration and dependency-vulnerability testing.** None performed.

## 6. Incomplete or blocked features

| Item | State | Blocker |
| --- | --- | --- |
| Official logo | **Integrated 2026-10-26** - original PNG used unchanged in header, footer lockup, OG image and icon | Resolved |
| Real product catalogue | **Imported 2026-10-26, prices approved**: 60 published listings with approved RWF selling prices; re-imports preserve those prices (`prices preserved 60` on re-run) | Product photos and verified specifications still needed |
| Weekly price review | **Implemented**: 7-day schedule, due/overdue reminders on the dashboard, products page and nav, review recording that never changes prices | Owner should decide who performs the weekly check |
| Delivery | Nationwide area active; order starts `PENDING_AGREEMENT` with a products-only total; staff record the agreed fee which updates the total | Add fixed-fee areas in Admin if a published price list is wanted |
| Customer accounts / order history | Not implemented | Guest checkout + tracking-by-order-number is implemented instead |
| Product image uploads | Disabled (URL/path only) | No storage provider and no upload validation implemented |
| Card payments | Not implemented | No provider account/contract |
| MTN MoMo (manual) | **Enabled** on 0780551125: customer submits reference, staff verify | Working; verify each payment in the statement |
| Airtel Money (manual) | **Enabled** on 0727 733 580, marked **unverified** | Business must confirm the receiving account before relying on it |
| MTN MoMo API | Written but disabled and untested | Merchant credentials + sandbox round |
| Email notifications | Not implemented | No mail provider |
| Refunds | Manual only | Business process decision |
| Invoicing/receipts | Not implemented | Business requirement to confirm |
| Multi-currency | Not implemented (RWF only) | Not requested yet |

## 7. External credentials and services still required

1. ~~Logo file~~ - supplied 2026-10-26 and integrated unchanged (`public/brand/uthman-iy-logo.png`).
2. **PostgreSQL** in production (free tiers of Neon/Supabase are sufficient initially).
3. **`AUTH_SECRET`** generated for production (32+ random characters).
4. **Strong admin password** (the seed refuses the example value in production).
5. **Domain name** (optional but expected for launch) and HTTPS.
6. **SMTP/API credentials** if automatic form notifications are wanted. The public contact email is configured.
7. **Confirmation of the Airtel Money receiving account** (`0727 733 580`), which is configured but marked unverified.
8. **MTN MoMo Collections API** credentials (subscription key, API user/key, public callback URL) and a
   successful sandbox round if automatic payment confirmation is wanted instead of manual verification.
9. **Payment/bank details** if bank transfer is to be offered.
10. Optional: image storage/CDN for product photography, plus the photographs themselves.

## 8. Run it locally on Windows

```powershell
# 1. Install Node.js 20.9+ (LTS) and PostgreSQL 16, or use the embedded database below.
cd C:\path\to\uthman-iy
npm install
copy .env.example .env

# 2. Edit .env: DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
notepad .env

# 3A. If using an installed PostgreSQL, create the database first, then:
npm run db:migrate
npm run db:seed

# 3B. If you prefer no PostgreSQL installation (downloads a local server once):
npm run db:start          # keep this terminal open
# in a second terminal:
npm run db:migrate
npm run db:seed

# 4. Start the site
npm run dev
# open http://localhost:3000  (admin: http://localhost:3000/admin)
```

Useful checks on Windows:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
# in a second terminal, against the running server:
npm run smoke
node scripts/check-links.mjs
```

## 9. Next steps for deployment

1. Push the branch, create the hosting project (Vercel free tier is the quickest), add env vars.
2. Create the production PostgreSQL database and run `npm run db:deploy` then `npm run db:seed:prod`.
3. Point `NEXT_PUBLIC_SITE_URL` at the real domain and redeploy.
4. Sign in, change the admin password, verify the logo, contact details, delivery area and payment settings.
5. Review the 60 imported listings: confirm the prices, add Uthman IY photography and verified specifications, and hide anything you do not sell.
6. Place a test order and cancel it. Stock-on-request mode is active, so no stock is reserved; verify the status flow and the manual payment confirmation instead.
7. Configure backups, uptime monitoring and (optionally) email delivery.
8. Only after a sandbox test: enable MTN MoMo in production.

Detailed steps: `docs/DEPLOYMENT.md` and `docs/PAYMENTS.md`.

## 10. Decisions and content that need the owner's approval

1. ~~Logo file~~ - received 2026-10-26; confirm it is the final artwork (a vector version would scale better in print).
2. **Adopted prices** - approved on 2026-10-26 and protected from accidental overwrite. Name the person responsible for the weekly review recorded in Admin -> Price review.
3. **Product photography and specifications** - none were supplied or copied; listings show a labelled placeholder and a "specifications pending" note until you provide them.
4. ~~Delivery fee model~~ - delivery is now **free across Rwanda** (owner decision, 2026-10-28). Add fixed-fee areas only if that policy changes.
5. **Payments** - confirm manual MTN MoMo and Airtel Money verification is acceptable at launch, confirm that Airtel number 0727 733 580 is an active Uthman IY receiving account, and decide whether to onboard the MTN MoMo API.
6. **Opening hours**, street address and any registration/tax details to publish (phone numbers and email were confirmed on 2026-10-26).
7. **Order terms and privacy notice** — written to match the implementation; legal review recommended.
8. **Software product claims** — current statuses (MatchVision AI: in development; Digital Discipline:
   in development, not on any app store; Tender AI: upcoming) must be confirmed or corrected, and any
   demo link added only when a real demonstration exists.
9. **Customer accounts** — whether to add registration/order history (currently guest checkout only).
10. **Analytics** — none is configured; adding one requires disclosure and consent handling.

## 11. Notes about this build environment

The container exposed the host's 180 CPUs with a 6 GiB memory cap, which made Next.js spawn far too
many build workers and the container restarted twice. `next.config.ts` now caps build workers
(`experimental.cpus`, default 2, override with `NEXT_BUILD_CPUS`) and `npm run build:ci` caps the
heap at 2 GB. Builds are reproducible on small machines; a dedicated build host can raise the cap.
