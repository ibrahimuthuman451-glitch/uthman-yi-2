# Uthman IY platform

Production-oriented website and e-commerce platform for **Uthman IY**, a technology
company in Gisozi, Kigali, Rwanda.

**Contact:** 0780551125 · 0785 779 207 (WhatsApp) · uthumanyi@gmail.com

The repository contains one application with three clearly separated business divisions
plus a protected administration dashboard:

1. **Online technology shop** (catalogue, cart, checkout, orders, manual payment verification)
2. **Software development services** (service pages, quote requests)
3. **Our software** (MatchVision AI, Digital Discipline, Tender AI — separate product pages with honest status labels)

---

## Quick start

Requirements: **Node.js 20.9+**, **PostgreSQL 14+** (or Docker), npm.

```bash
npm install
cp .env.example .env          # set DATABASE_URL and DIRECT_URL, then edit the rest
npm run db:migrate           # create the schema
npm run db:seed              # admin user, categories, content, labelled demo data
npm run dev                  # http://localhost:3000
```

No external services are required to run the site. Payments, email delivery and image
hosting are optional integrations and are disabled until configured (see `docs/`).

### Windows (PowerShell / CMD)

```powershell
cd C:\path\to\uthman-iy
npm install
copy .env.example .env

# Option A: use an installed PostgreSQL server and set DATABASE_URL in .env
# Option B: run the bundled embedded PostgreSQL (downloads a local server once)
npm run db:start

# in a second terminal:
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. The admin dashboard is at <http://localhost:3000/admin>
and uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (change the password after the
first sign-in).

---

## Technology

| Area | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router, React 19, Server Components + Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 with a small design system in `src/components/ui` |
| Database | PostgreSQL with Prisma ORM 6 (migrations + seed) |
| Validation | Zod (server-side on every form, action and API route) |
| Auth | Database-backed sessions, bcrypt password hashing, HTTP-only cookies |
| Tests | Vitest (unit + PostgreSQL integration), HTTP smoke test, link crawler |

---

## Repository layout

```
src/
  app/
    (site)/                 public website (home, shop, cart, checkout, orders, software, services, about, contact, policies)
    admin/                  staff authentication + protected dashboard (route group "(dashboard)")
    actions/                server actions (checkout, inquiries, admin operations, auth)
    api/                    cart validation, catalogue export, MTN MoMo webhook
    sitemap.ts robots.ts    SEO endpoints
  components/               design system, shop, site and admin components
  lib/                      money, validation, auth, settings, rate limiting, payments, order pricing
  server/services/          business logic (catalogue, orders, payments, inquiries, content, imports)
prisma/
  schema.prisma             data model
  migrations/               SQL migrations
  seed.ts, seed-data.ts     idempotent seed (content + labelled demo listings)
data/reference/             third-party catalogue research with provenance (not for sale)
docs/                       go-live checklist, deployment, Supabase, product photos, payments, catalogue format, security, status
tests/                      Vitest suites
scripts/                    dev database, smoke test, link checker
```

---

## What is implemented

### Company website
- Responsive homepage with hero, division overview, featured products, software showcase, services and contact band
- Primary navigation (Home, Shop, Software Development, Our Software, About Us, Contact) with desktop dropdown and touch-friendly mobile menu
- About, Contact, Order terms and Privacy pages; only owner-confirmed details are published
- Per-page metadata, canonical URLs, Open Graph, sitemap, robots, JSON-LD for the organisation, products and services

### Shop
- Catalogue with search, brand filter, category filter, sorting (price/name/newest) and pagination
- Product pages with brand badge, price in RWF, SKU, availability, specifications, related products and enquiry route
- Brand identity (HIKVISION, IMOU, Starlink) derived from the product title, shown on cards, product pages, structured data and a homepage brand strip
- Browser cart (product ids + quantities only) with server-side re-pricing before display and checkout
- Checkout with delivery area + fee, customer details, payment method, terms acceptance and spam honeypot
- Orders created in a database transaction with conditional stock reservation (no overselling)
- Order confirmation page (signed, short-lived access cookie) and guest order tracking by order number + email/phone
- Demo listings are labelled in the UI and never presented as real inventory

### Software development
- Eight service pages (websites, e-commerce, custom software, web apps, mobile apps, AI, automation, consulting)
- Quote/consultation forms stored as inquiries with categories, validation and rate limiting

### Our software
- Overview + three separate product pages driven by the database
- Feature rows carry `LIVE` / `EXPERIMENTAL` / `PLANNED` labels; product status and status notes are explicit
- No fabricated demos, statistics, app-store claims, tender listings or government integrations
- Early-access forms per product

### Administration
- Sign-in with rate limiting, generic error messages and audit logging
- Dashboard: orders, paid revenue, awaiting payment, low stock, new inquiries and a launch checklist
- Products: create/edit/archive, approved price, stock + low-stock threshold, stock movements, specifications, publish/feature flags, demo/reference/approved status
- Categories: create/edit, ordering, visibility
- Orders: search, filter, detail view, fulfilment status, cancellation with stock return, verified manual payment recording, and an optional delivery-fee override (delivery is free by default)
- Inquiries: search/filter, detail view, status and internal notes
- Content: software products, services, homepage wording, contact details, delivery areas, payment settings
- Catalogue: documented JSON import (validated, never auto-publishes) and JSON/CSV export
- Reference research: imported third-party listings with provenance, convertible into unpublished drafts
- Price review: weekly reference-price schedule with due/overdue reminders, honest review recording and approved-vs-reference price comparison
- Payments: separate MTN MoMo and Airtel Money manual-verification methods, each with its own receiving number and verification status
- Staff accounts (ADMIN/STAFF roles) and an audit log of privileged actions

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run build:ci` | Build with capped heap and worker count (use in small containers) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit + database integration tests |
| `npm run smoke` | HTTP smoke test (requires a running server) |
| `node scripts/check-links.mjs` | Crawl internal links/images for 404s |
| `npm run db:start` | Local embedded PostgreSQL (no Docker, no paid service) |
| `npm run db:check` | Verify a database connection, schema, migrations and row counts (works for Supabase) |
| `npm run db:migrate` | Apply migrations in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed (development: demo listings allowed) |
| `npm run db:seed:prod` | Seed for production: refuses demo listings and the example admin password |
| `npm run db:studio` | Prisma Studio |
| `npm run photos:download -- <folderId>` | Download images from a public Google Drive folder into `photos-in/` |
| `npm run photos:match` | Dry-run: match photo filenames to products (no writes) |
| `npm run photos:apply` | Optimise to WebP and attach matched photos to products |
| `npm run catalogue:apply` | Re-import the owner-approved catalogue (idempotent; approved prices, stock and publication flags are preserved). Add `-- --apply-settings` to re-apply store settings, or `-- --update-prices` to overwrite prices deliberately |

### Database options

- **Embedded PostgreSQL (zero setup):** `npm run db:start` runs a real PostgreSQL 17
  server on port 5432 with data in `.pgdata/` (git-ignored). Intended for local development.
- **Docker:** `docker compose up -d` (see `docker-compose.yml`) then use the printed URL.
- **Hosted free tier:** Neon or Supabase free PostgreSQL works; see `docs/DEPLOYMENT.md`.

---

## Tests and verification

```bash
npm run typecheck
npm run lint
npm test                 # 78 tests: pricing, availability, validation, payment gating, orders, delivery fees, price review, imports, authorization
npm run build
npm start &              # then:
npm run smoke            # 34 HTTP checks
node scripts/check-links.mjs
```

What the automated suite covers:

- Server-side pricing (line totals, delivery fee, free-delivery threshold, integer RWF)
- Rejection of tampered quantities, duplicate lines, reference listings, missing prices, insufficient stock
- Order creation: stock reservation, idempotent double-submit, oversell protection, delivery-area validation,
  unconfigured payment method rejection
- Order lifecycle: manual payment confirmation (once), cancellation returns stock exactly once, locked statuses
- Guest order tracking requires the matching email **or** phone number
- Availability rules (approved/demo/reference/unpublished/archived/low stock/out of stock)
- Checkout, contact and tracking validation (phone formats, honeypot, consent, malformed cart payloads)
- Payment method gating (MTN API requires credentials + switch, bank transfer requires account details)
- RWF formatting/parsing, order number format, delivery-area text parsing

Manual/UX items that were **not** verified by automation in this environment are listed in
`docs/PROJECT_STATUS.md` (for example visual screenshot review and screen-reader testing).

---

## Configuration and security

- Every secret is read from environment variables; `.env` is git-ignored and `.env.example`
  contains placeholders only.
- Prices, totals, delivery fees and stock are always recomputed on the server from the database.
  A browser that edits `localStorage` cannot change what is charged.
- All administrative reads require a session; all administrative mutations re-check the session
  and role server-side (server actions and route handlers included).
- Public forms and authentication endpoints are rate limited using a PostgreSQL-backed counter.
- Administrative actions (price/stock changes, order status, payment confirmation, content edits,
  account changes, exports) are written to an audit log.
- Responses carry `Content-Security-Policy`, `X-Frame-Options: DENY`, `nosniff`, a strict referrer
  policy and a restrictive permissions policy. Errors are logged server-side without leaking stack traces.
- Payment webhooks are treated as hints: the provider is re-queried, amounts are compared, and
  duplicate notifications are rejected through a unique `PaymentEvent` row.
- No card details are collected or stored anywhere in the application.

Details and remaining hardening recommendations: `docs/SECURITY.md`.

---

## Official logo

The owner's original **blue UY logo** is integrated unchanged at `public/brand/uthman-iy-logo.png`
(1619 × 971 PNG, SHA-256 `f5d4456e…3db95f`). The header and footer render that exact file with CSS
height only (28–32 px, deliberately small), so its aspect ratio and colours are preserved; nothing is redrawn, cropped or tinted.
Because the artwork has a solid white background, the footer places it on a white rounded lockup.
See `public/brand/README.md` for the verification details.

---

## Catalogue data policy

**Current catalogue:** 60 owner-approved listings (HIKVISION, IMOU and Starlink equipment) published in RWF. At the owner's instruction, product names and prices were adopted from the reference shop on 26 October 2026 (`data/import/uthman-iy-catalogue-2026-10-26.json` records the source and retrieval date). Product photography, marketing copy and stock figures were **not** copied: listings show a labelled placeholder until Uthman IY supplies its own images, and **stock is not tracked** - availability is confirmed by phone before dispatch (`stockMode: ON_REQUEST`).

- Only **approved** listings with an Uthman IY price are sold. Reference research rows cannot be ordered.
- Seeded **demo** listings are labelled "Demo listing" on every surface and are excluded in production seed runs.
- Third-party catalogue research (`data/reference/fabritech-catalogue-2026-10-25.json`) records only
  titles, categories and reference prices, with source and retrieval date. Descriptions, images and
  stock quantities were deliberately not copied because reuse needs written permission.
- Import/export format: `docs/CATALOGUE_FORMAT.md`.

---

## What still needs the owner

See `docs/PROJECT_STATUS.md` for the complete list. The blocking items before a real launch are:

1. Product photography and verified specifications (listings currently show labelled placeholders and “specifications pending”); prices are approved and reviewed through the weekly workflow in Admin → Price review.
2. Delivery is currently free across Rwanda. Add fixed-fee areas in Admin → Settings if a paid delivery model is introduced later.
3. SMTP/email delivery for automatic form notifications (the published address is set; no mail transport is configured yet).
4. Confirm that Airtel Money number **0727 733 580** is a valid Uthman IY receiving account (it is configured but marked unverified), and provide MTN MoMo Collections API credentials only if automatic payment confirmation is wanted.
5. Optional image storage for product photography.
