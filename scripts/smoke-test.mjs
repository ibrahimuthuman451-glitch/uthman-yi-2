/**
 * End-to-end smoke test against a running server.
 *
 * Usage:
 *   npm run build && npm start        # in one terminal
 *   npm run smoke                     # in another terminal
 *
 * It checks every public route, the admin authorisation guard, the cart
 * validation API and the catalogue export authorisation, then removes the
 * temporary sessions and staff account it creates.
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const db = new PrismaClient();

// The script creates and removes a temporary staff session, so it needs direct
// database access to the same database the running site uses. Fail clearly
// instead of printing a Prisma stack trace when DATABASE_URL points elsewhere.
try {
  await db.$queryRaw`select 1`;
} catch {
  console.error(
    `Cannot reach the verification database for ${base}.
` +
      "Set DATABASE_URL (and DIRECT_URL) to the same database the site is using, then re-run.",
  );
  await db.$disconnect().catch(() => {});
  process.exit(1);
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", ...options });
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
}

async function expectPage(path, { status = 200, contains = [], missing = [] } = {}) {
  try {
    const result = await get(path);
    const missingText = contains.find((text) => !result.body.includes(text));
    const forbidden = missing.find((text) => result.body.includes(text));
    const ok = result.status === status && !missingText && !forbidden;
    record(
      `GET ${path}`,
      ok,
      ok
        ? `${status}`
        : `status ${result.status}${missingText ? `, missing "${missingText}"` : ""}${forbidden ? `, unexpected "${forbidden}"` : ""}`,
    );
    return result;
  } catch (error) {
    record(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function createSessionFor(userId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await db.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return { token, sessionId: session.id };
}

const createdSessionIds = [];
let temporaryStaffId = null;

try {
  // --- Public pages -------------------------------------------------------
  await expectPage("/", { contains: ["Uthman IY", "Online technology shop", "Our software", "Featured products"] });
  await expectPage("/shop", { contains: ["Technology shop"] });
  await expectPage("/about", { contains: ["Gisozi"] });
  await expectPage("/contact", { contains: ["0780 551 125"] });
  await expectPage("/software", { contains: ["MatchVision AI", "Digital Discipline", "Tender AI"] });
  await expectPage("/software/matchvision-ai", { contains: ["MatchVision AI", "Current status"] });
  await expectPage("/software/digital-discipline", { contains: ["Digital Discipline"] });
  await expectPage("/software/tender-ai", { contains: ["Tender AI"] });
  await expectPage("/software-development", { contains: ["Request a quote"] });
  await expectPage("/software-development/ecommerce-development", { contains: ["E-commerce"] });
  await expectPage("/cart", { contains: ["Your cart"] });
  await expectPage("/checkout", { contains: ["Checkout"] });

  // Both manual mobile money methods must be offered separately.
  const checkout = await get("/checkout");
  record(
    "Checkout offers MTN MoMo and Airtel Money as separate methods",
    checkout.body.includes("MTN MoMo (manual verification)") &&
      checkout.body.includes("Airtel Money (manual verification)") &&
      checkout.body.includes("0727 733 580"),
    `status ${checkout.status}`,
  );
  record(
    "Checkout states that delivery is free across Rwanda",
    checkout.body.includes("Free delivery across Rwanda") &&
      !checkout.body.includes("agreed with you by phone"),
    "delivery wording",
  );
  record(
    "Cash on delivery and bank transfer stay hidden",
    !checkout.body.includes("Cash on delivery") && !checkout.body.includes("Bank transfer"),
    "optional methods disabled",
  );
  await expectPage("/orders/track", { contains: ["Track your order"] });
  await expectPage("/terms", { contains: ["Order terms"] });
  await expectPage("/privacy", { contains: ["Privacy notice"] });
  await expectPage("/sitemap.xml", { contains: ["urlset"] });
  await expectPage("/robots.txt", { contains: ["sitemap"] });

  // --- Shop search, filtering and product detail -------------------------
  const shopSearch = await get("/shop?q=camera&sort=price-asc");
  record("GET /shop?q=camera&sort=price-asc", shopSearch.status === 200, `status ${shopSearch.status}`);

  const product = await db.product.findFirst({
    where: { isPublished: true, archivedAt: null, dataStatus: { in: ["APPROVED", "DEMO"] } },
    orderBy: { createdAt: "asc" },
  });
  record("Published product exists for detail checks", Boolean(product), product?.slug ?? "none");

  if (product) {
    const detail = await get(`/shop/${product.slug}`);
    const hasPrice = product.priceRwf === null || detail.body.includes("RWF");
    record(
      `GET /shop/${product.slug}`,
      detail.status === 200 && hasPrice && detail.body.includes(product.name),
      `status ${detail.status}`,
    );
  }

  const missingProduct = await get("/shop/this-product-does-not-exist");
  record("GET unknown product returns 404", missingProduct.status === 404, `status ${missingProduct.status}`);

  // --- Cart validation API -----------------------------------------------
  if (product) {
    const cartResponse = await fetch(`${base}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [product.id] }),
    });
    const cartJson = await cartResponse.json().catch(() => null);
    const item = cartJson?.items?.[0];
    record(
      "POST /api/cart returns server-side price",
      cartResponse.status === 200 && item?.productId === product.id && item?.priceRwf === product.priceRwf,
      `status ${cartResponse.status}`,
    );
  }

  const badCart = await fetch(`${base}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: "not-an-array" }),
  });
  record("POST /api/cart rejects malformed payload", badCart.status === 400, `status ${badCart.status}`);

  // --- Admin authorisation -----------------------------------------------
  const adminUnauthenticated = await get("/admin");
  const redirectsToLogin =
    [302, 307, 308].includes(adminUnauthenticated.status) &&
    (adminUnauthenticated.headers.get("location") ?? "").includes("/admin/login");
  record("GET /admin redirects unauthenticated visitors", redirectsToLogin, `status ${adminUnauthenticated.status}`);

  await expectPage("/admin/login", { contains: ["Staff sign in"] });

  for (const path of ["/admin/settings", "/admin/price-review"]) {
    const response = await get(path);
    record(
      `GET ${path} requires authentication`,
      [302, 307, 308].includes(response.status) &&
        (response.headers.get("location") ?? "").includes("/admin/login"),
      `status ${response.status}`,
    );
  }

  const exportUnauthenticated = await get("/api/admin/catalogue/export?format=json");
  record(
    "Catalogue export requires authentication",
    exportUnauthenticated.status === 401,
    `status ${exportUnauthenticated.status}`,
  );

  const adminUser = await db.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  record("Seeded administrator exists", Boolean(adminUser), adminUser?.email ?? "none");

  if (adminUser) {
    const { token, sessionId } = await createSessionFor(adminUser.id);
    createdSessionIds.push(sessionId);
    const cookie = `uy_admin_session=${token}`;

    const dashboard = await get("/admin", { headers: { Cookie: cookie } });
    record("GET /admin with a valid session returns the dashboard", dashboard.status === 200, `status ${dashboard.status}`);

    const products = await get("/admin/products", { headers: { Cookie: cookie } });
    record("GET /admin/products with a valid session", products.status === 200, `status ${products.status}`);

    const settingsPage = await get("/admin/settings", { headers: { Cookie: cookie } });
    record(
      "GET /admin/settings with a valid session",
      settingsPage.status === 200 && settingsPage.body.includes("Airtel Money"),
      `status ${settingsPage.status}`,
    );

    const reviewPage = await get("/admin/price-review", { headers: { Cookie: cookie } });
    record(
      "GET /admin/price-review with a valid session",
      reviewPage.status === 200 && reviewPage.body.includes("Reference price review"),
      `status ${reviewPage.status}`,
    );

    const airtelVerifiedWarning =
      settingsPage.body.includes("Receiving account not verified") ||
      settingsPage.body.includes("Receiving account confirmed");
    record("Settings surface the Airtel verification status", airtelVerifiedWarning, "badge present");

    const exported = await get("/api/admin/catalogue/export?format=json", { headers: { Cookie: cookie } });
    record(
      "Catalogue export works for authenticated staff",
      exported.status === 200 && exported.body.includes('"products"'),
      `status ${exported.status}`,
    );

    // A STAFF account must not reach administrator-only screens.
    const staff = await db.user.create({
      data: {
        name: "Smoke Test Staff",
        email: `smoke-staff-${Date.now()}@test.local`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    temporaryStaffId = staff.id;
    const staffSession = await createSessionFor(staff.id);
    createdSessionIds.push(staffSession.sessionId);

    const staffUsersPage = await get("/admin/users", {
      headers: { Cookie: `uy_admin_session=${staffSession.token}` },
    });
    record(
      "STAFF cannot open /admin/users (server-side role check)",
      [302, 307, 308].includes(staffUsersPage.status),
      `status ${staffUsersPage.status}`,
    );

    const staffOrders = await get("/admin/orders", {
      headers: { Cookie: `uy_admin_session=${staffSession.token}` },
    });
    record("STAFF can open /admin/orders", staffOrders.status === 200, `status ${staffOrders.status}`);
  }

  // --- Payment webhook behaviour ----------------------------------------
  const badWebhook = await fetch(`${base}/api/payments/mtn/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonsense: true }),
  });
  record("MTN webhook rejects an invalid payload", badWebhook.status === 400, `status ${badWebhook.status}`);

  const unknownReference = await fetch(`${base}/api/payments/mtn/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referenceId: "00000000-0000-4000-8000-000000000000", status: "SUCCESSFUL" }),
  });
  record(
    "MTN webhook refuses unknown references (cannot fake a payment)",
    unknownReference.status === 404,
    `status ${unknownReference.status}`,
  );
} finally {
  if (createdSessionIds.length > 0) {
    await db.session.deleteMany({ where: { id: { in: createdSessionIds } } });
  }
  if (temporaryStaffId) {
    await db.user.deleteMany({ where: { id: temporaryStaffId } });
  }
  await db.$disconnect();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log(`Failed: ${failed.map((check) => check.name).join(", ")}`);
  process.exitCode = 1;
}
