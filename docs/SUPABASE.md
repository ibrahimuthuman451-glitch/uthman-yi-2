# Connecting the platform to Supabase (PostgreSQL)

Supabase provides the PostgreSQL database. This application does **not** use Supabase Auth,
Storage, Realtime or the anon/service keys — only the Postgres connection strings.

## 1. Create the project

1. Sign in at <https://supabase.com> → **New project**.
2. Name it `uthman-iy`, choose the region closest to Rwanda (usually **Frankfurt /
eu-central-1**), and set a strong **database password**. Store that password safely — it is
shown once.
3. Wait for provisioning to finish.

## 2. Copy the two connection strings

Dashboard → **Connect** (or Settings → Database → Connection string). You need two different
URIs, because Prisma talks to the database in two ways:

| Variable | Supabase string | Port | Used for |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler** | `6543` | Every application request (serverless-safe, IPv4) |
| `DIRECT_URL` | **Direct connection** (or Session pooler) | `5432` | `prisma migrate deploy` only |

They look like this (replace the password and region):

```dotenv
DATABASE_URL="postgresql://postgres.abcdefghijklm:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.abcdefghijklm:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Notes:
- The pooler user name is `postgres.<project-ref>`, not plain `postgres`.
- `pgbouncer=true` tells Prisma to avoid prepared statements through PgBouncer.
- Migrations **must** use `DIRECT_URL`; DDL cannot run through the transaction pooler.
- If your project only offers an IPv6 direct host, use the **Session pooler** (port 5432) for
  `DIRECT_URL` instead.
- Some dashboards show the database password separately: copy it into the URI yourself.

## 3. Set the variables locally

Put both strings in `.env` (git-ignored) — never in a commit, screenshot or chat message you
may share publicly:

```dotenv
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://...:5432/postgres?sslmode=require"
```

Then verify the connection (no writes):

```bash
npm run db:check
```

On a fresh project it prints **“Schema: EMPTY database”** and the next step.

## 4. Create the schema and content

```bash
npm run db:deploy                              # applies all migrations through DIRECT_URL
npm run db:seed:prod                           # admin account, settings, services, software, categories
npm run catalogue:apply -- --apply-settings    # 60 approved products + store/delivery/payment settings
npm run db:check                               # expect "Database looks ready."
```

`db:seed:prod` requires `ADMIN_EMAIL`, `ADMIN_PASSWORD` (not the example value) and optionally
`ADMIN_NAME`. It refuses to run with the example password.

## 5. Hosting environment

Add the same variables to the host (Vercel/Render/Fly), plus:

- `AUTH_SECRET` — 32+ random characters
- `NEXT_PUBLIC_SITE_URL` — the final https URL
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (seed only; remove afterwards if you prefer)

Redeploy, then run `npm run smoke` with `SMOKE_BASE_URL` pointing at the deployed site.

## 6. Free-plan limits to plan for

- **Pausing:** free projects pause after about a week of inactivity. Data is retained and the
  project wakes on the next connection, but the first request after a pause may fail until it
  resumes. Check the dashboard before a demo.
- **Backups:** point-in-time recovery is a paid feature. Take your own `pg_dump` regularly —
  orders, inquiries and stock movements exist nowhere else.
- **Connections / storage / egress:** free tiers have caps; the pooler plus
  `connection_limit=1` keeps the app within them at low traffic.
- **IPv4:** the transaction pooler is the reliable IPv4 path for serverless hosts.

## 7. Rotating the database password

Supabase → Settings → Database → **Reset database password**, update `DATABASE_URL` and
`DIRECT_URL` everywhere, then redeploy. Existing connections drop.

## 8. Copying the current local data (optional)

If you want the exact local catalogue/settings instead of re-running the scripts:

```bash
pg_dump --no-owner --no-privileges -d "$LOCAL_DATABASE_URL" -f uthmaniy.sql
psql "$DIRECT_URL" -f uthmaniy.sql
npm run db:deploy   # confirms migrations are in sync
```

Both commands need PostgreSQL client tools installed. `npm run catalogue:apply -- --apply-settings`
is usually simpler and reproducible.

## 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Can't reach database server` | Wrong host/port, project paused, or IPv6-only host | Use the pooler host, confirm the project is active |
| `prepared statement "s0" already exists` | Prisma through PgBouncer without the flag | Add `?pgbouncer=true` to `DATABASE_URL` |
| `Environment variable not found: DIRECT_URL` / P1012 `You must provide a nonempty direct URL` | Only one URL configured (this schema requires both) | Set `DIRECT_URL` as well, locally and on the host |
| Migration hangs or errors on DDL | Ran through the transaction pooler | Ensure `DIRECT_URL` is the direct/session connection |
| `password authentication failed` | Password not URL-encoded or wrong user | Use `postgres.<project-ref>` and percent-encode special characters |
