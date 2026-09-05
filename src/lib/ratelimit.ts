import { clientIpFromHeaders } from "@/lib/audit";

// Lightweight fixed-window rate limiter. In-memory and therefore per-instance —
// adequate for abuse/DoS/enumeration/LLM-cost protection on a small deployment.
// For horizontal scale, back this with Redis/DynamoDB and keep the same API.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Per-IP limiter for a public route. Returns a 429 Response when exceeded, else null.
export function limitByIp(req: Request, name: string, limit: number, windowMs: number): Response | null {
  const ip = clientIpFromHeaders(req.headers) || "unknown";
  const { ok, retryAfter } = rateLimit(`${name}:${ip}`, limit, windowMs);
  if (ok) return null;
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
  });
}

// Non-HTTP check (e.g. inside next-auth authorize) keyed by an arbitrary id.
export function allow(key: string, limit: number, windowMs: number): boolean {
  return rateLimit(key, limit, windowMs).ok;
}
