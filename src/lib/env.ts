import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * Validation is lazy (called from server code, not at module import time) so
 * `next build` can run without production secrets present. Any secret that is
 * missing at request time produces a clear, non-leaking error.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  PAYMENTS_MTN_MOMO_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  MTN_MOMO_SUBSCRIPTION_KEY: z.string().optional().default(""),
  MTN_MOMO_API_USER: z.string().optional().default(""),
  MTN_MOMO_API_KEY: z.string().optional().default(""),
  MTN_MOMO_TARGET_ENV: z
    .enum(["sandbox", "mtnrwanda"])
    .optional()
    .default("sandbox"),
  MTN_MOMO_CALLBACK_URL: z.string().optional().default(""),
  MTN_MOMO_CURRENCY: z.string().optional().default("RWF"),
  SMTP_HOST: z.string().optional().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration - ${issues}`);
  }
  cached = parsed.data;
  return parsed.data;
}

/**
 * Canonical base URL used by metadata, `robots.txt` and the sitemap.
 *
 * `VERCEL_URL` is the *per-deployment* hostname and changes on every deploy, so
 * falling back to it advertised a throwaway preview domain in the sitemap,
 * canonical tags and `robots.txt` (which made the sitemap unusable in Search
 * Console for the production property). `VERCEL_PROJECT_PRODUCTION_URL` is the
 * project's stable production domain, so it is preferred; `VERCEL_URL` stays as
 * a last resort so preview deployments still resolve to something valid.
 *
 * `||` rather than `??` on purpose: an env var set to an empty string should be
 * treated as missing instead of winning the fallback chain.
 */
export function getSiteUrl(): string {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const deploymentHost = process.env.VERCEL_URL;

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (productionHost ? `https://${productionHost}` : "") ||
    (deploymentHost ? `https://${deploymentHost}` : "");
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Email delivery is only claimed when an SMTP host has been configured. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}
