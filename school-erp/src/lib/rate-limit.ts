/**
 * In-memory sliding-window rate limiter, keyed by IP address.
 *
 * This complements the per-account lockout in login/route.ts: that one stops
 * someone from brute-forcing ONE known email, this one stops someone from
 * spraying many different email addresses from the same source. It is
 * intentionally more lenient than the per-account limit (a school's shared
 * office/lab network can generate many legitimate logins from one IP).
 *
 * LIMITATION: this state lives in the Node.js process memory. It works
 * correctly for a single-instance deployment (the common case for a
 * school's own server/VM). If this app is ever deployed across multiple
 * server instances behind a load balancer, each instance would track its
 * own counts independently — replace this with a shared store (Redis, or
 * your hosting provider's edge rate limiting) at that point.
 */

interface AttemptRecord {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_IP = 20; // across all accounts combined

const attempts = new Map<string, AttemptRecord>();

// Periodic cleanup so this Map doesn't grow unbounded over a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.windowStart > WINDOW_MS) attempts.delete(ip);
  }
}, 5 * 60 * 1000).unref?.();

export function checkIpLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  if (!ip || ip === "unknown") return { allowed: true }; // don't lock out everyone if IP can't be determined

  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS_PER_IP) {
    return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000) };
  }

  record.count += 1;
  return { allowed: true };
}
