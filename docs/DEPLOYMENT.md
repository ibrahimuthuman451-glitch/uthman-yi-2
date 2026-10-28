# Deployment

This guide targets a **zero-budget-first** rollout: free local development, then a free hosting
and database tier while traffic is low, with a documented path to paid infrastructure. Nothing
here is promised to stay free — free tiers change their limits and can be discontinued.

## 1. Environment variables

Copy `.env.example` and set:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled PostgreSQL connection used by the app (Supabase transaction pooler, port 6543, `?pgbouncer=true&connection_limit=1&sslmode=require`) |
| `DIRECT_URL` | yes | Direct/session PostgreSQL connection used only by migrations (Supabase port 5432). See `docs/SUPABASE.md` |
| `NEXT_PUBLIC_SITE_URL` | yes | Public base URL without a trailing slash; used for canonical URLs, sitemap and Open Graph |
| `AUTH_SECRET` | yes | 32+ random characters. Rotating it signs every staff session out |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | seed only | First administrator. Use a strong unique password; production seeding refuses the example value |
| `SEED_DEMO_PRODUCTS` | no | `false` for production (default for `db:seed:prod`) |
| `PAYMENTS_MTN_MOMO_*` | no | Only for the MTN Collections API; see `docs/PAYMENTS.md` |
| `SMTP_*`, `EMAIL_FROM` | no | Currently only used to report whether email delivery is configured; no transport is bundled |
| `NEXT_BUILD_CPUS` | no | Caps Next.js build workers (default 2) for small build containers |

Secrets belong in the hosting provider's environment/secret settings, never in git. `.env` is
git-ignored.

## 2. Database

### Free-tier options
- **Neon** — free PostgreSQL with a generous development allowance; copy the pooled connection string.
- **Supabase** — free PostgreSQL. Use the transaction pooler for `DATABASE_URL` and the direct
  connection for `DIRECT_URL`; the full walkthrough is in `docs/SUPABASE.md`.
- **Local / self-hosted** — `docker compose up -d` or `npm run db:start`.

### Migrations and seed

```bash
npm run db:deploy                      # prisma migrate deploy (production)
npm run db:seed:prod                   # staff account, categories, services, software pages
```

`db:seed:prod` refuses to run with the example `ADMIN_PASSWORD`, and only creates demo listings if
`SEED_DEMO_PRODUCTS=true` is explicitly set. It never deletes data and is safe to re-run.

### Backups
- Enable the provider's automatic daily backups if the plan offers them.
- Otherwise schedule `pg_dump` off-site (for example GitHub Actions → encrypted object storage).
- Test a restore into a scratch database before you need it.
- Export the catalogue from Admin → Import/export after large content updates as a cheap
  application-level backup (orders and inquiries are **not** in that export).

## 3. Build and run

```bash
npm ci
npm run build          # add build:ci on small containers
npm start              # serves on PORT (default 3000)
```

Health check for uptime monitors: `GET /` (200) or `GET /robots.txt`.

### Vercel (recommended free start)
1. Push the repository to GitHub.
2. Import the project in Vercel, framework preset **Next.js**.
3. Add the environment variables from section 1 (Production and Preview).
4. Deploy, then run migrations once from your machine against the production `DATABASE_URL`:
   `DATABASE_URL="..." npm run db:deploy` and `DATABASE_URL="..." npm run db:seed:prod`.
5. Add the custom domain in Vercel → Domains and create the DNS records it shows.

Notes: server actions and route handlers run on the Node runtime; keep the default. Uploaded
files are not supported (no storage configured), so no writable filesystem is needed.

### Render / Railway / Fly.io
- Create a Node web service, build `npm ci && npm run build:ci`, start `npm start`.
- Add the same environment variables, connect the managed PostgreSQL instance, run migrations
  from the service shell or a one-off job.

### VPS (Ubuntu + Nginx)
1. Install Node 20 and PostgreSQL, create a database and user.
2. Clone the repo, `npm ci`, configure `.env`, `npm run db:deploy`, `npm run db:seed:prod`, `npm run build`.
3. Run under systemd or pm2: `npm start` on `127.0.0.1:3000`.
4. Nginx reverse proxy with TLS (Certbot), `proxy_set_header X-Forwarded-For $remote_addr;`.
5. Firewall: expose 80/443 only; keep PostgreSQL bound to localhost.

## 4. Domain

- Register a `.rw` or `.com` domain (paid) or start on the provider's free subdomain.
- Point `A`/`CNAME` records at the host, wait for DNS propagation, then enable HTTPS.
- Set `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy so canonical URLs, sitemap and
  Open Graph metadata are correct.

## 5. Email delivery

No mail transport is bundled, so forms store inquiries and tell the visitor honestly that no
automatic email was sent. To add email later:
- Choose a provider (Resend, Postmark, SMTP relay) and verify the sending domain.
- Add the credentials to the environment, implement a `sendInquiryNotification` function in
  `src/server/services/inquiries.ts`, and replace the hard-coded `emailed: false` return.
- Add SPF/DKIM records and test deliverability before advertising form notifications.

## 6. Product images and storage

Product photos are referenced by URL (`imageUrl`) and rendered without the Next image optimiser
(no remote allow-list, no third-party hotlinking). Options:
- Put final images in `public/products/` and reference `/products/file.webp` (simplest, free).
- Or upload to an object store/CDN and paste the https URL in the admin product form; add the host
  to `images.remotePatterns` only if you switch to `next/image` later.

Server-side upload validation is **not** implemented; do not enable uploads without adding file
type/size checks and private storage.

## 7. Post-deployment checklist

- [ ] `GET /` returns 200 over HTTPS and the company details are correct.
- [ ] Admin sign-in works; the example password has been changed.
- [ ] Official logo uploaded to `public/brand/`.
- [ ] Real products created with approved prices and stock; demo listings hidden or removed.
- [ ] Delivery areas and fees confirmed in Admin → Settings.
- [ ] Payment methods: only genuinely usable options enabled.
- [ ] Test order placed, then cancelled to confirm stock returns.
- [ ] `npm run smoke` and `node scripts/check-links.mjs` run against the deployed URL.
- [ ] Backups configured and a restore tested.
- [ ] Privacy notice and order terms reviewed by the owner.
