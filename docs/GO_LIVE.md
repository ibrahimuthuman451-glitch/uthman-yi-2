# Go-live checklist (Uthman IY)

Status at the time of writing: application complete, tested, and **already provisioned against
Supabase** (project `ftyornpyqdhhuonocvxk`, region eu-west-1, PostgreSQL 17.11).

## 0. Before you deploy — rotate these

| Secret | Why | How |
| --- | --- | --- |
| Supabase database password | It was shared in chat and equals the first admin password | Supabase → Settings → Database → Reset password, then update `DATABASE_URL` + `DIRECT_URL` (`?` → `%3F`) |
| Admin password | Same reason; don't derive it from a phone number | Admin → Staff accounts after first sign-in, or re-seed |
| `AUTH_SECRET` | Must be unique per deployment | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

Never commit `.env`, `.env.supabase`, or any connection string.

## 1. Hosting (Vercel, free tier)

1. Push the branch to GitHub (the repository must contain the app).
2. Vercel → **Add New… → Project** → import the repository → framework preset **Next.js**.
3. **Settings → Functions → Region: Dublin (`dub1`)** — closest to the Supabase eu-west-1 database.
4. Add environment variables for **Production *and* Preview**:

```dotenv
DATABASE_URL="postgresql://postgres.ftyornpyqdhhuonocvxk:<DB-PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.ftyornpyqdhhuonocvxk:<DB-PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
AUTH_SECRET="<fresh 48-byte value>"
NEXT_PUBLIC_SITE_URL="https://<your-domain>"
ADMIN_EMAIL="ibrahimuthuman451@gmail.com"
ADMIN_PASSWORD="<new strong password>"
SEED_DEMO_PRODUCTS="false"
```

Both database URLs are mandatory: the Prisma schema fails with **P1012** if `DIRECT_URL` is
missing. Build command stays `npm run build`; no `vercel.json` is needed.

5. Deploy. The database is already migrated and seeded, so **do not** run the seed again unless
you want a new admin account.

## 2. Domain

- Vercel → Settings → Domains → add the domain and create the DNS records shown.
- Set `NEXT_PUBLIC_SITE_URL` to the final https URL and redeploy so canonical URLs, sitemap and
  Open Graph metadata are correct.

## 3. Post-deploy verification (run against the live URL)

```bash
SMOKE_BASE_URL="https://<your-domain>" DATABASE_URL="<production pooler URL>" npm run smoke
node scripts/check-links.mjs https://<your-domain>
```

Expected: **42/42 smoke checks** and no broken links. Then manually:

1. Sign in at `/admin` with the rotated admin password.
2. Confirm `/shop` shows 60 products with `RWF` prices and “Available to order”.
3. Place one test order with MTN MoMo, submit a fake reference, and confirm it stays **Payment
   pending verification** (it must never auto-mark as paid).
4. As staff, record a delivery fee on that order and confirm the total updates and the badge
   changes from “pending agreement”.
5. Cancel the test order; with stock-on-request there is no stock to return, so simply confirm the
   status history records it.
6. Delete the test order? Not possible from the UI by design — cancel it and leave the audit trail.

## 4. Known items that are NOT launch blockers

- **Product photography and datasheets** — listings show a labelled “Photo pending” placeholder.
- **Airtel receiving account verification** — number `0727 733 580` is configured but flagged
  unverified in Admin → Settings.
- **Email delivery** — forms store inquiries in the admin; no SMTP is configured.
- **MTN MoMo Collections API** — manual verification is used; the API remains disabled.

## 5. After launch

- Change both passwords; confirm the audit log records the changes.
- Schedule a weekly price review (Admin → Price review); the reminder appears in the sidebar.
- Enable Supabase backups or schedule `pg_dump` — free plans have no point-in-time recovery.
- Watch for the free-tier **pause** after ~1 week idle: the first request may take a minute.
