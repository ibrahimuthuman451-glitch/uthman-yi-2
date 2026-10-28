/**
 * Local development PostgreSQL server (no Docker, no paid service).
 *
 * Uses the `embedded-postgres` dev dependency to download/run a real
 * PostgreSQL 17 server, so local development exercises exactly the same
 * database engine and Prisma migration path as production.
 *
 * Usage:
 *   npm run db:start                       # starts on port 5432, data in ./.pgdata
 *   PGPORT=5433 npm run db:start           # custom port
 *
 * The server keeps running in the foreground; press Ctrl+C to stop it.
 * On other machines you may instead point DATABASE_URL at any PostgreSQL
 * instance (see docker-compose.yml and docs/DEPLOYMENT.md).
 */
import EmbeddedPostgres from "embedded-postgres";
import net from "node:net";

const port = Number(process.env.PGPORT ?? 5432);
const databaseDir = process.env.PGDATA_DIR ?? ".pgdata";
const databaseName = process.env.PGDATABASE ?? "uthmaniy";

function portIsOpen(host, p) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: p });
    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

if (await portIsOpen("127.0.0.1", port)) {
  console.log(
    `[dev-db] Port ${port} is already accepting connections. ` +
      `Assuming PostgreSQL is already running - not starting another instance.`,
  );
  process.exit(0);
}

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
});

try {
  await pg.initialise();
  console.log(`[dev-db] Initialised PostgreSQL cluster in ${databaseDir}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/already contains|exists|not empty|initiali[sz]ed/i.test(message)) {
    console.log(`[dev-db] Reusing existing cluster in ${databaseDir}`);
  } else {
    console.error("[dev-db] Failed to initialise cluster:", message);
    process.exit(1);
  }
}

await pg.start();
console.log(`[dev-db] PostgreSQL listening on 127.0.0.1:${port}`);

try {
  await pg.createDatabase(databaseName);
  console.log(`[dev-db] Created database "${databaseName}"`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/already exists/i.test(message)) {
    console.log(`[dev-db] Database "${databaseName}" already exists`);
  } else {
    console.warn(`[dev-db] Could not ensure database "${databaseName}": ${message}`);
  }
}

console.log(
  `[dev-db] DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${port}/${databaseName}?schema=public"`,
);
console.log("[dev-db] Ready. Press Ctrl+C to stop the development database.");

const shutdown = async () => {
  console.log("\n[dev-db] Stopping PostgreSQL...");
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep the process alive.
await new Promise(() => {});
