/**
 * Sets an administrator password when the original one is unknown.
 *
 *   DATABASE_URL=... ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='NewPass1234' \
 *     npm run admin:reset
 *
 * Passwords are stored as bcrypt hashes, so an existing password can never be
 * read back - it can only be replaced. Creates the administrator if the email
 * does not exist yet, and promotes the account to ADMIN.
 */
import { db } from "@/lib/db";
import { hashPassword, isValidPasswordPolicy } from "@/lib/auth/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Uthman IY Administrator";

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.");
  }
  if (!isValidPasswordPolicy(password)) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters and include a letter and a number.");
  }

  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    await db.user.update({ where: { email }, data: { passwordHash, role: "ADMIN" } });
    console.log(`[admin] password replaced for ${email} (role ADMIN)`);
  } else {
    await db.user.create({ data: { name, email, passwordHash, role: "ADMIN" } });
    console.log(`[admin] created administrator ${email}`);
  }

  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true },
    orderBy: { email: "asc" },
  });
  console.log(`[admin] administrators now: ${admins.map((row) => row.email).join(", ")}`);
  console.log("[admin] sign in at /admin/login");
}

main()
  .catch((error) => {
    console.error("[admin] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
