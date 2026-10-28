# Security notes

This document states what is implemented, what is deliberately limited, and what should be added
before handling high-value transactions. A successful build is not evidence of security.

## Implemented controls

### Authorisation
- Database-backed sessions: a random 32-byte token is sent in an HTTP-only, SameSite=Lax cookie;
  only its SHA-256 hash is stored, so a database leak cannot be replayed as a live session.
- Sessions expire after 8 hours, are deleted on sign-out, and are invalidated when a password is
  changed or an account is deactivated.
- Every admin page calls `requireStaff()` (or `requireAdmin()`) on the server; every admin server
  action re-checks the session and role. Hiding a link is never the control.
- Role separation: `STAFF` can run the shop and content; `ADMIN` additionally manages accounts and
  views the audit log. Staff cannot open `/admin/users` (verified by an automated HTTP check).

### Input handling
- All public forms, checkout payloads, admin forms and API bodies are validated with Zod on the
  server. Browser-side `required`/`type` attributes are treated as convenience only.
- Prisma parameterises every query; no raw SQL string interpolation is used.
- React escapes rendered values; `dangerouslySetInnerHTML` is used only for JSON-LD built from
  server-side settings.
- Uploads are disabled, so there is no file-type/executable upload surface yet.

### Money and inventory integrity
- The cart in the browser stores product ids and quantities; names/prices there are display-only.
- Checkout reloads products from the database, recomputes every line, the delivery fee and the
  total, and rejects reference/unpublished/unpriced/out-of-stock items.
- Orders, order items, stock decrements and stock movements are written in one transaction with a
  conditional decrement (`stock >= quantity`), which prevents overselling under concurrency.
- An idempotency key prevents duplicate orders from double submissions; a unique constraint backs it.
- Stock is returned exactly once when an order is cancelled (locked after completion/cancellation).
- Payment status can only become `PAID` through a staff-verified action or a provider-confirmed
  webhook that re-queries the provider and matches the amount.

### Abuse protection
- PostgreSQL-backed fixed-window rate limits on login (8 / 10 min), inquiries (6 / 15 min),
  checkout (10 / 10 min), order tracking (20 / 10 min) and payment-reference submission.
- Honeypot fields plus length limits on public forms; the inquiry list has a `SPAM` status.
- Login failures return a generic message and are timed to reduce account enumeration.

### Transport and headers
- `Content-Security-Policy` (self-hosted scripts/styles/images/fonts, `frame-ancestors 'none'`,
  `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive
  permissions policy, HSTS when served over HTTPS by the host.
- Cookies are `Secure` in production.

### Auditing and error handling
- Privileged actions write an `AuditLog` row (actor, action, entity, metadata, IP).
- Orders keep an append-only event history; stock changes keep a movement ledger.
- Unexpected errors are logged server-side and shown to users as a generic message.

## Known limitations / recommended hardening

1. **CSP allows inline scripts/styles** because Next.js injects inline bootstrap code without a
   nonce. Add nonce-based CSP via middleware before handling sensitive accounts at scale.
2. **No MFA** for staff accounts. Add TOTP or passkeys for administrators.
3. **Rate limiting uses the database** and is per-instance-agnostic but adds a write per request;
   move to Redis/Upstash if traffic grows. It fails closed for abuse protection.
4. **No email verification** on inquiry forms (no mail provider configured). Add double opt-in or
   CAPTCHA if spam becomes a problem.
5. **Uploads and image validation are not implemented.** Add private storage, MIME/extension and
   size checks, and an image re-encoder before enabling them.
6. **No automated backup/restore verification** in code; configure it on the hosting provider.
7. **Payment integrations are untested with a real provider.** Test MTN MoMo in its sandbox end to
   end, including replay and amount-mismatch paths, before enabling it in production.
8. **No dependency scanning pipeline.** Add `npm audit`/Dependabot in CI.
9. **Guest order access** relies on a signed cookie plus knowledge of the order number and the
   email/phone on it. High-value accounts should get real customer accounts with MFA.
10. **No penetration test or accessibility audit** has been performed; see `docs/PROJECT_STATUS.md`.

## Reporting a problem

Uthman IY should publish a security contact once an email address or form is designated for it.
Until then, use the contact page or call 0780551125.
