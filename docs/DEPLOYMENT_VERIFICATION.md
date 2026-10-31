# Deployment verification

Recorded check of the live Vercel deployment on **2026-10-31**, commit `28864b8`
("Run functions in fra1 for lower latency to Kigali").

| | |
| --- | --- |
| URL | <https://uthman-yi-2.vercel.app> |
| Region | `fra1` (`vercel.json`) |
| Result | **1 blocker** — `/checkout` returns HTTP 500 because request-time environment validation fails |

Reproduce the whole check with:

```bash
node scripts/check-links.mjs https://uthman-yi-2.vercel.app
SMOKE_BASE_URL="https://uthman-yi-2.vercel.app" DATABASE_URL="<production pooler URL>" npm run smoke
```

`npm run smoke` needs the production database because it creates and removes a temporary session;
`check-links.mjs` needs nothing but the URL.

## 1. What passes

| Check | Result |
| --- | --- |
| `GET /` | 200 — company details, featured products, `Available to order` |
| `GET /shop` | 200 — 9 listings per page (`PAGE_SIZE`), pagination intact |
| `GET /shop/<slug>` (spot check) | 200 |
| `GET /about`, `/contact`, `/software`, `/software/matchvision-ai`, `/cart`, `/orders/track`, `/terms`, `/privacy` | 200 |
| `GET /admin` | 307 → `/admin/login`, and `/admin/login` renders 200 |
| `GET /robots.txt` | 200 — `Host` and `Sitemap` use the production host, `/admin`, `/cart`, `/checkout`, `/orders` disallowed |
| `GET /sitemap.xml` | 200 — absolute production URLs |
| `GET /googlea4c0740b76b0c1a7.html` | 200 (Search Console verification file) |
| `http://` → `https://` | 308 redirect |
| Security headers | CSP, HSTS `preload`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options` all present |
| `POST /api/cart` with `{"ids":[]}` | 200 — settings and product queries reach the database |
| `POST /api/payments/mtn/webhook` (invalid payload) | 400 |
| `POST /api/payments/mtn/webhook` (unknown reference) | 404 — a payment cannot be faked |
| Link crawl (`scripts/check-links.mjs`) | 60 pages / 35 assets crawled; **only** `/checkout → 500` |

## 2. The blocker: `/checkout` returns 500

```
GET https://uthman-yi-2.vercel.app/checkout -> 500
```

`/checkout` is the only public page that calls `getEnv()` (`src/lib/env.ts`) while rendering. It is
therefore the only public page that fails when a required environment variable is missing or
malformed: `getEnv()` throws and Next.js converts the render error into a 500.

Reproduced locally against the embedded PostgreSQL, running the production build:

| Environment | `GET /checkout` | Server log |
| --- | --- | --- |
| `AUTH_SECRET` set (32+ chars) | **200** | — |
| `AUTH_SECRET` unset | **500** | `Error: Invalid environment configuration - AUTH_SECRET: Required` |

So the application code is correct; the deployment's environment is incomplete. The two ways this
happens, in order of likelihood:

1. **`AUTH_SECRET` missing, or shorter than 32 characters.** `getEnv()` requires
   `z.string().min(32)`.
2. **`NEXT_PUBLIC_SITE_URL` set to an empty string.** `getEnv()` requires a valid absolute URL,
   while `getSiteUrl()` treats an empty value as "not set" and silently falls back to
   `VERCEL_PROJECT_PRODUCTION_URL`. That explains why the canonical tag, `robots.txt` and
   `sitemap.xml` all look correct even though validation is failing.

A stale database schema is the only other plausible cause (`DeliveryArea` query). Rule it out with
`DIRECT_URL="<production direct URL>" npx prisma migrate status`.

### Why it blocks launch

`getEnv()` is also called by `createOrder()`, the admin dashboard and admin settings. Until it is
fixed, **no order can be placed** and the admin dashboard will fail the same way even though
sign-in succeeds.

## 3. Fix

1. Vercel → Project → Settings → Environment Variables, for **Production and Preview**:

```dotenv
AUTH_SECRET="<48 random bytes, generated below>"
NEXT_PUBLIC_SITE_URL="https://uthman-yi-2.vercel.app"   # full https URL, no trailing slash, never empty
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

2. Redeploy — environment changes only apply to a new deployment.
3. Confirm `GET /checkout` returns 200 and the checkout form shows the delivery area and payment
   methods.
4. Confirm the database schema is current: `DIRECT_URL="..." npx prisma migrate status`.
5. Run the two commands at the top of this file; expect **42/42 smoke checks** and no broken links.

If `/checkout` still fails, open Vercel → Deployment → **Logs** (or `vercel logs <deployment-url>`)
and filter for `/checkout`. The runtime log names the exact field, for example:

```
Error: Invalid environment configuration - AUTH_SECRET: String must contain at least 32 character(s)
```

## 4. Still to do by hand

These cannot be verified from outside and are covered by `docs/GO_LIVE.md` §3:

- Sign in at `/admin` once the environment is fixed (admin pages call `getEnv()` too).
- Place one test order with MTN MoMo and confirm it stays **Payment pending verification**.
- Record a delivery fee as staff and confirm the total and badge change.
- Cancel the test order and confirm the status history records it.
- Rotate the Supabase database password and the admin password if that has not been done yet.
- Point `NEXT_PUBLIC_SITE_URL` at the final custom domain and redeploy once DNS is live.
- Enable Supabase backups or schedule `pg_dump`; the free tier has no point-in-time recovery.
