import "server-only";

import { db } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Durable fixed-window rate limiter backed by PostgreSQL.
 *
 * Chosen over an in-memory limiter because production hosting is likely
 * serverless: the count must be shared by every instance. No paid Redis plan
 * is required, and the table is pruned opportunistically.
 */
export async function consumeRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;
  const windowStart = Math.floor(Date.now() / windowMs);
  const bucketId = `${key}:${windowStart}`;
  const expiresAt = new Date((windowStart + 2) * windowMs);

  try {
    const bucket = await db.rateLimitBucket.upsert({
      where: { key: bucketId },
      create: { key: bucketId, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    // Opportunistic cleanup keeps the table small without a cron job.
    if (Math.random() < 0.05) {
      db.rateLimitBucket
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => undefined);
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(((windowStart + 1) * windowMs - Date.now()) / 1000),
    );

    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds,
    };
  } catch (error) {
    // Fail closed for abuse protection, but never crash the request path:
    // the caller decides how to respond.
    console.error("[rate-limit] storage unavailable", error);
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
}

/** Best-effort client identity for rate limiting (behind a trusted proxy). */
export function clientKeyFromHeaders(headerStore: Headers, scope: string): string {
  const forwarded = headerStore.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
