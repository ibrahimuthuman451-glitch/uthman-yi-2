/**
 * Verifies a PostgreSQL/Supabase connection before deploying.
 *
 * Usage:
 *   node scripts/db-check.mjs                 # uses DATABASE_URL from .env
 *   node scripts/db-check.mjs "postgresql://..."
 *
 * It never writes data: it reports the server version, whether the schema
 * exists, which migrations are applied and how many business rows are present.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const url = process.argv[2] ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error("No connection string. Set DATABASE_URL in .env or pass one as an argument.");
  process.exit(1);
}

function mask(value) {
  return value.replace(/:[^:@/]+@/, ":****@");
}

function isSupabase(value) {
  return /supabase\.(co|com)/.test(value);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  console.log(`Connecting to ${mask(url)}`);
  if (isSupabase(url) && !/sslmode=require/.test(url)) {
    console.warn("! Supabase connection string has no sslmode=require - add it for production.");
  }
  if (/pooler\.supabase\.com:6543/.test(url) && !/pgbouncer=true/.test(url)) {
    console.warn("! Pooled port 6543 usually needs ?pgbouncer=true&connection_limit=1 for Prisma.");
  }

  const [info] = await prisma.$queryRaw`
    SELECT current_database() AS database,
           current_user AS user_name,
           split_part(version(), ' ', 2) AS server_version,
           (SELECT setting FROM pg_settings WHERE name = 'ssl') AS ssl
  `;
  console.log(`Connected: database=${info.database} user=${info.user_name} server=${info.server_version}`);

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Product','Category','Order','User','SiteSetting')
  `;
  const tableNames = tables.map((row) => row.table_name);

  if (tableNames.length === 0) {
    console.log("\nSchema: EMPTY database (no application tables).");
    console.log("Next step: npm run db:deploy");
    return;
  }
  console.log(`Schema: ${tableNames.length}/5 core tables present (${tableNames.join(", ")})`);

  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at FROM _prisma_migrations
    WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 3
  `;
  if (migrations.length === 0) {
    console.log("Migrations: none recorded - run npm run db:deploy");
  } else {
    console.log(`Migrations: ${migrations.length} recent -> ${migrations.map((m) => m.migration_name).join(", ")}`);
  }

  const [counts] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM "Product")::int AS products,
      (SELECT count(*) FROM "Product" WHERE "isPublished" AND "archivedAt" IS NULL)::int AS published_products,
      (SELECT count(*) FROM "Order")::int AS orders,
      (SELECT count(*) FROM "User")::int AS staff_users,
      (SELECT count(*) FROM "Service")::int AS services,
      (SELECT count(*) FROM "SoftwareProduct")::int AS software_products
  `;
  console.log("Contents:", JSON.stringify(counts));

  if (counts.products === 0) console.log("Next step: npm run catalogue:apply -- --apply-settings");
  if (counts.staff_users === 0) console.log("Next step: npm run db:seed:prod (creates the administrator account)");
  if (counts.products > 0 && counts.staff_users > 0) console.log("Database looks ready.");
}

main()
  .catch((error) => {
    console.error("\nConnection or query failed:");
    console.error(error instanceof Error ? error.message.split("\n").slice(0, 6).join("\n") : error);
    console.error(
      "\nCheck: correct host/port, password, sslmode=require, and that the Supabase project is not paused.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
