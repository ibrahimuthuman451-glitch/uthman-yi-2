import "dotenv/config";

// Tests run against the configured local PostgreSQL database. Financial and
// order tests create their own uniquely-named rows and clean them up.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run the test suite (see .env.example).");
}
